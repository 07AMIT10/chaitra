import { MUTATION_LIMIT, isBranch, isLensId, isMutation, isScenario } from "./scenario";
import type { Branch, LensId, Mutation, Scenario } from "./types";

export type SharePayload = {
  v: 1;
  scenario: Scenario;
  mutations: Mutation[];
  lens: LensId;
  frameIndex: number;
};

const SHARE_HASH_MARKER = "#b=";

/**
 * Hard cap on the link that is actually handed out, in characters: the encoded
 * `#b=<base64url>` fragment, and defensively the full share URL.
 */
const SHARE_LINK_LIMIT = 9000;

/** Cap on the encoded payload itself (fragment minus the `#b=` marker). */
const SHARE_ENCODED_LIMIT = SHARE_LINK_LIMIT - SHARE_HASH_MARKER.length;

const SHARE_KEYS = ["v", "scenario", "mutations", "lens", "frameIndex"];

const EXPORT_FORMAT = "chaitra-observatory";
const EXPORT_VERSION = 1;
const EXPORT_BYTES_LIMIT = 65536; // 64 KB

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function base64UrlToStandard(base64Url: string): string {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  return `${base64Url.replace(/-/g, "+").replace(/_/g, "/")}${padding}`;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function extractEncodedShare(input: string): string {
  const markerIndex = input.lastIndexOf(SHARE_HASH_MARKER);
  const candidate =
    markerIndex >= 0 ? input.slice(markerIndex + SHARE_HASH_MARKER.length) : input;
  return candidate.trim();
}

function isSharePayload(value: unknown): value is SharePayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== SHARE_KEYS.length) return false;
  if (!keys.every((key) => (SHARE_KEYS as string[]).includes(key))) return false;
  // The exact-key check above also guarantees there is no `note` in the payload.
  if (record.v !== 1) return false;
  if (!isScenario(record.scenario)) return false;
  if (!Array.isArray(record.mutations) || record.mutations.length > MUTATION_LIMIT) return false;
  if (!record.mutations.every(isMutation)) return false;
  if (!isLensId(record.lens)) return false;
  if (
    typeof record.frameIndex !== "number" ||
    !Number.isInteger(record.frameIndex) ||
    record.frameIndex < 0
  ) {
    return false;
  }
  return true;
}

/**
 * Encodes a share payload as the URL hash fragment `#b=<base64url>`.
 * Extra fields (such as a note) are never serialized: only the five payload
 * fields written above are encoded. Throws if the encoded link exceeds the
 * hard cap so that we never hand out a link that decodeShare would reject.
 */
export function encodeShare(payload: SharePayload): string {
  const shareable = {
    v: 1,
    scenario: payload.scenario,
    mutations: payload.mutations,
    lens: payload.lens,
    frameIndex: payload.frameIndex,
  };
  const json = JSON.stringify(shareable);
  // base64url expands UTF-8 bytes by 4/3 and UTF-8 bytes are never fewer than
  // UTF-16 code units, so this cheap pre-check rejects huge payloads before
  // allocating the encoded string. The fragment check below is authoritative.
  if (json.length * 4 > SHARE_ENCODED_LIMIT * 3) {
    throw new Error(`share link exceeds ${SHARE_LINK_LIMIT} characters`);
  }
  const fragment = SHARE_HASH_MARKER + toBase64Url(new TextEncoder().encode(json));
  if (fragment.length > SHARE_LINK_LIMIT) {
    throw new Error(`share link exceeds ${SHARE_LINK_LIMIT} characters`);
  }
  return fragment;
}

/**
 * Decodes a share payload from a full share URL, a `#b=...` hash fragment, or
 * the raw base64url payload itself.
 */
export function decodeShare(
  input: string,
): { ok: true; payload: SharePayload } | { ok: false; error: string } {
  if (typeof input !== "string") {
    return { ok: false, error: "share input must be a string" };
  }
  const encoded = extractEncodedShare(input);
  if (encoded.length === 0) {
    return { ok: false, error: "share input is empty" };
  }
  // Reject oversized input before atob/base64 decoding allocates anything.
  if (encoded.length > SHARE_ENCODED_LIMIT) {
    return { ok: false, error: `share link exceeds ${SHARE_LINK_LIMIT} characters` };
  }
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(encoded)) {
    return { ok: false, error: "share payload is not valid base64url" };
  }
  let text: string;
  try {
    const binary = atob(base64UrlToStandard(encoded));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    text = new TextDecoder().decode(bytes);
  } catch {
    return { ok: false, error: "share payload could not be decoded" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "share payload is not valid JSON" };
  }
  if (!isSharePayload(parsed)) {
    return { ok: false, error: "share payload is not a valid share payload" };
  }
  return { ok: true, payload: parsed };
}

/** Appends the encoded `#b=...` fragment to an origin (path included). */
export function shareUrl(origin: string, payload: SharePayload): string {
  const base = origin.replace(/#.*$/, "");
  const url = `${base}${encodeShare(payload)}`;
  // Defensive: the whole link, not just the fragment, must fit the cap.
  if (url.length > SHARE_LINK_LIMIT) {
    throw new Error(`share link exceeds ${SHARE_LINK_LIMIT} characters`);
  }
  return url;
}

/**
 * Serializes a branch as the standalone JSON export document. Throws if the
 * branch does not validate or the document exceeds 64 KB — callers surface
 * that instead of writing a file that imports would reject.
 */
export function exportBranch(branch: Branch): string {
  if (!isBranch(branch)) {
    throw new Error("branch failed validation and cannot be exported");
  }
  const json = JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, branch });
  if (utf8Bytes(json) > EXPORT_BYTES_LIMIT) {
    throw new Error(`branch export exceeds ${EXPORT_BYTES_LIMIT} bytes`);
  }
  return json;
}

export function importBranch(
  text: string,
): { ok: true; branch: Branch } | { ok: false; error: string } {
  if (typeof text !== "string") {
    return { ok: false, error: "branch export must be text" };
  }
  if (utf8Bytes(text) > EXPORT_BYTES_LIMIT) {
    return { ok: false, error: `branch export exceeds ${EXPORT_BYTES_LIMIT} bytes` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "branch export is not valid JSON" };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "branch export is not a JSON object" };
  }
  const record = parsed as Record<string, unknown>;
  if (record.format !== EXPORT_FORMAT || record.version !== EXPORT_VERSION) {
    return { ok: false, error: "branch export format not recognized" };
  }
  if (!isBranch(record.branch)) {
    return { ok: false, error: "branch export does not contain a valid branch" };
  }
  return { ok: true, branch: record.branch };
}
