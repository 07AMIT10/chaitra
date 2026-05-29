import { md5Hex } from "../md5";
import { sha256Hex, sha256ToInt32 } from "./sha256";

/** MD5 key hash — matches consistent_hashing.py _hash */
export function md5KeyHash(key: string): number {
  return parseInt(md5Hex(String(key)), 16);
}

/** CMS column index — matches count_min_sketch.py _hash(item, seed) */
export function cmsColumnIndex(item: string, seed: number, width: number): number {
  const digest = sha256Hex(String(item) + String(seed));
  return parseInt(digest, 16) % width;
}

/** HLL item hash — matches hyperloglog.py _get_hash */
export function hllItemHash(item: string): number {
  return sha256ToInt32(String(item));
}

export { md5Hex, sha256Hex, sha256ToInt32 };
