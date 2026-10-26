import { useEffect, useMemo, useReducer, useRef } from "react";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";
import {
  FIELD_SPECIMENS,
  LIVE_BENCHES,
  blankScenario,
} from "../../observatory/registry";
import { projectLens } from "../../observatory/lenses";
import { runScenario } from "../../observatory/runners";
import { canonicalJson } from "../../observatory/hash";
import { SCAMPER_CARDS, proposeMutation } from "../../observatory/mutations";
import { cloneScenario, isScenario } from "../../observatory/scenario";
import { plural } from "../../observatory/format";
import {
  LIMITS,
  STORAGE_KEYS,
  deleteBranch,
  deleteReaderBench,
  loadBranches,
  loadDraft,
  loadReaderBenches,
  saveBranch,
  saveDraft,
  saveReaderBench,
} from "../../observatory/storage";
import {
  decodeShare,
  encodeShare,
  exportBranch,
  importBranch,
  shareUrl,
} from "../../observatory/share";
import type {
  Branch,
  FieldSpecimen,
  LensId,
  LiveBench,
  Mutation,
  MutationResult,
  ReaderBench,
  RunResult,
  Scenario,
  ScamperId,
  StorageLike,
  Substrate,
} from "../../observatory/types";
import type { SharePayload } from "../../observatory/share";
import { BranchShelf } from "./BranchShelf";
import { FieldCardDrawer } from "./FieldCardDrawer";
import { FieldNote } from "./FieldNote";
import { Inspector } from "./Inspector";
import { LensRail } from "./LensRail";
import { LensReadout } from "./LensReadout";
import { MutationDrawer } from "./MutationDrawer";
import { ObservatoryCanvas } from "./ObservatoryCanvas";
import { RunRail } from "./RunRail";
import { ScamperDeck } from "./ScamperDeck";
import { SpecimenShelf } from "./SpecimenShelf";
import { CompareDialog, ConfirmDialog, Overlay, ShareDialog } from "./ObservatoryDialogs";

type Phase = "shelf" | "bench";
type Drawer = "shelf" | "branches" | "inspector" | "mutation" | null;
type Origin = "curated" | "reader" | "blank" | "shared" | "imported" | "draft" | "branch" | null;
type Notice = { text: string; tone: "info" | "error" } | null;
type HistoryStep = { scenario: Scenario; mutations: Mutation[] };

type State = {
  hydrated: boolean;
  phase: Phase;
  origin: Origin;
  benchId: string | null;
  scenario: Scenario | null;
  baseScenario: Scenario | null;
  mutations: Mutation[];
  history: HistoryStep[];
  lens: LensId;
  run: RunResult | null;
  frameIndex: number;
  selection: string | null;
  branches: Branch[];
  readerBenches: ReaderBench[];
  draft: import("../../observatory/types").Draft | null;
  title: string;
  note: string;
  saved: boolean;
  drawer: Drawer;
  mutationCard: ScamperId | null;
  activeBranchId: string | null;
  notice: Notice;
  field: FieldSpecimen | null;
  compare: { left: Branch; right: Branch } | null;
  pendingDeleteBranch: Branch | null;
  pendingDeleteReader: ReaderBench | null;
  pendingReset: boolean;
  shareUrl: string | null;
  articleHref: string | null;
  gameHref: string | null;
  benchWhat: string | null;
  benchFraming: string | null;
  topTitle: string;
};

type Action =
  | {
      type: "hydrate";
      branches: Branch[];
      readerBenches: ReaderBench[];
      draft: import("../../observatory/types").Draft | null;
      shared: SharePayload | null;
      errors: string[];
    }
  | { type: "pick-live"; bench: LiveBench }
  | { type: "pick-reader"; bench: ReaderBench }
  | { type: "pick-blank"; substrate: Substrate }
  | { type: "resume-draft" }
  | { type: "discard-draft" }
  | { type: "set-drawer"; drawer: Drawer }
  | { type: "set-lens"; lens: LensId }
  | { type: "set-frame"; index: number }
  | { type: "step"; direction: -1 | 1 }
  | { type: "select"; id: string | null }
  | { type: "set-scenario"; scenario: Scenario; source: "inspector" | "move" }
  | { type: "run" }
  | { type: "reset" }
  | { type: "open-mutation"; card: ScamperId }
  | { type: "close-mutation" }
  | { type: "apply-mutation"; proposal: Extract<MutationResult, { ok: true }> }
  | { type: "undo-mutation" }
  | { type: "set-title"; title: string }
  | { type: "set-note"; note: string }
  | { type: "notice"; notice: Notice }
  | { type: "dismiss-notice" }
  | { type: "set-branches"; branches: Branch[]; notice?: Notice }
  | { type: "saved"; branch: Branch; branches: Branch[] }
  | {
      type: "open-branch";
      branch: Branch;
      run: RunResult;
      baseScenario: Scenario;
      branches?: Branch[];
      saved?: boolean;
    }
  | { type: "set-reader-benches"; benches: ReaderBench[]; notice?: Notice }
  | { type: "field"; field: FieldSpecimen | null }
  | { type: "compare"; left: Branch; right: Branch }
  | { type: "close-compare" }
  | { type: "pending-delete-branch"; branch: Branch | null }
  | { type: "pending-delete-reader"; bench: ReaderBench | null }
  | { type: "pending-reset"; pending: boolean }
  | { type: "share"; url: string | null };

const INITIAL: State = {
  hydrated: false,
  phase: "shelf",
  origin: null,
  benchId: null,
  scenario: null,
  baseScenario: null,
  mutations: [],
  history: [],
  lens: "what-exists",
  run: null,
  frameIndex: 0,
  selection: null,
  branches: [],
  readerBenches: [],
  draft: null,
  title: "",
  note: "",
  saved: false,
  drawer: null,
  mutationCard: null,
  activeBranchId: null,
  notice: null,
  field: null,
  compare: null,
  pendingDeleteBranch: null,
  pendingDeleteReader: null,
  pendingReset: false,
  shareUrl: null,
  articleHref: null,
  gameHref: null,
  benchWhat: null,
  benchFraming: null,
  topTitle: "",
};

function clampFrame(index: number, run: RunResult | null): number {
  const count = run?.frames.length ?? 0;
  if (count === 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

function notice(text: string, tone: "info" | "error" = "info"): Notice {
  return { text, tone };
}

function originLabel(origin: Origin): string {
  switch (origin) {
    case "curated":
      return "Live bench";
    case "reader":
      return "Reader bench";
    case "blank":
      return "Blank plate";
    case "shared":
      return "Shared branch";
    case "imported":
      return "Imported branch";
    case "draft":
      return "Restored draft";
    case "branch":
      return "Kept branch";
    default:
      return "Working bench";
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate": {
      const base: State = {
        ...state,
        hydrated: true,
        branches: action.branches,
        readerBenches: action.readerBenches,
        draft: action.draft,
        notice:
          action.errors.length > 0
            ? notice(action.errors.join(" "), "error")
            : state.notice,
      };
      if (!action.shared) return base;
      const scenario = cloneScenario(action.shared.scenario);
      const run = runScenario(scenario);
      return {
        ...base,
        phase: "bench",
        origin: "shared",
        benchId: null,
        scenario,
        baseScenario: scenario,
        mutations: action.shared.mutations,
        history: [],
        lens: action.shared.lens,
        run,
        frameIndex: clampFrame(action.shared.frameIndex, run),
        selection: null,
        title: "Shared branch",
        note: "",
        saved: false,
        drawer: null,
        mutationCard: null,
        activeBranchId: null,
        field: null,
        compare: null,
        articleHref: null,
        gameHref: null,
        benchWhat: "A shared live branch. Keep it to save it to your own shelf.",
        benchFraming: scenario.title,
        topTitle: "Shared branch",
      };
    }

    case "pick-live": {
      const scenario = cloneScenario(action.bench.defaultScenario);
      const run = runScenario(scenario);
      return {
        ...state,
        hydrated: true,
        phase: "bench",
        origin: "curated",
        benchId: action.bench.id,
        scenario,
        baseScenario: cloneScenario(scenario),
        mutations: [],
        history: [],
        lens: "what-exists",
        run,
        frameIndex: 0,
        selection: null,
        draft: null,
        title: action.bench.title,
        note: "",
        saved: false,
        drawer: null,
        mutationCard: null,
        activeBranchId: null,
        notice: null,
        field: null,
        compare: null,
        articleHref: action.bench.articleHref,
        gameHref: action.bench.gameHref ?? null,
        benchWhat: action.bench.what,
        benchFraming: action.bench.framing,
        topTitle: action.bench.title,
      };
    }

    case "pick-reader": {
      const scenario = cloneScenario(action.bench.scenario);
      const run = runScenario(scenario);
      return {
        ...state,
        hydrated: true,
        phase: "bench",
        origin: "reader",
        benchId: action.bench.id,
        scenario,
        baseScenario: cloneScenario(scenario),
        mutations: [],
        history: [],
        lens: "what-exists",
        run,
        frameIndex: 0,
        selection: null,
        draft: null,
        title: action.bench.title,
        note: "",
        saved: false,
        drawer: null,
        mutationCard: null,
        activeBranchId: null,
        notice: null,
        field: null,
        compare: null,
        articleHref: null,
        gameHref: null,
        benchWhat: action.bench.framing,
        benchFraming: `${action.bench.substrate} · ${action.bench.strategy}`,
        topTitle: action.bench.title,
      };
    }

    case "pick-blank": {
      const scenario = blankScenario(action.substrate);
      const run = runScenario(scenario);
      return {
        ...state,
        hydrated: true,
        phase: "bench",
        origin: "blank",
        benchId: null,
        scenario,
        baseScenario: cloneScenario(scenario),
        mutations: [],
        history: [],
        lens: "what-exists",
        run,
        frameIndex: 0,
        selection: null,
        draft: null,
        title: scenario.title,
        note: "",
        saved: false,
        drawer: "inspector",
        mutationCard: null,
        activeBranchId: null,
        notice: notice("Blank plate mounted. Edit it in the Inspector, then Keep it as a bench."),
        field: null,
        compare: null,
        articleHref: null,
        gameHref: null,
        benchWhat: "A blank plate. Every field is yours to edit; nothing is pre-solved.",
        benchFraming: `${scenario.substrate} · ${scenario.strategy}`,
        topTitle: scenario.title,
      };
    }

    case "resume-draft": {
      if (!state.draft) return state;
      const scenario = cloneScenario(state.draft.scenario);
      const run = runScenario(scenario);
      return {
        ...state,
        phase: "bench",
        origin: "draft",
        benchId: null,
        scenario,
        baseScenario: cloneScenario(scenario),
        mutations: state.draft.mutations,
        history: [],
        lens: state.draft.lens,
        run,
        frameIndex: clampFrame(state.draft.frameIndex, run),
        selection: null,
        draft: null,
        title: state.draft.title || scenario.title,
        note: state.draft.note,
        saved: false,
        drawer: null,
        mutationCard: null,
        activeBranchId: null,
        notice: notice("Draft restored. Keep it when you want a branch."),
        field: null,
        compare: null,
        articleHref: null,
        gameHref: null,
        benchWhat: "A restored working draft.",
        benchFraming: scenario.title,
        topTitle: scenario.title,
      };
    }

    case "discard-draft":
      return { ...state, draft: null };

    case "set-drawer":
      return {
        ...state,
        drawer: action.drawer,
        mutationCard: action.drawer === "mutation" ? state.mutationCard : null,
        field: null,
        compare: null,
      };

    case "set-lens":
      return { ...state, lens: action.lens, saved: false };

    case "set-frame":
      return { ...state, frameIndex: clampFrame(action.index, state.run), saved: false };

    case "step": {
      if (!state.run) return state;
      return {
        ...state,
        frameIndex: clampFrame(state.frameIndex + action.direction, state.run),
        saved: false,
      };
    }

    case "select":
      return { ...state, selection: action.id };

    case "set-scenario": {
      if (!isScenario(action.scenario)) return state;
      const scenario = cloneScenario(action.scenario);
      const run = runScenario(scenario);
      return {
        ...state,
        scenario,
        run,
        frameIndex: 0,
        saved: false,
        activeBranchId: null,
        mutations: action.source === "inspector" ? [] : state.mutations,
        history: action.source === "inspector" ? [] : state.history,
        notice:
          action.source === "inspector"
            ? notice("Inspector edit applied. The SCAMPER stack was cleared so the trace remains honest.")
            : state.notice,
      };
    }

    case "run": {
      if (!state.scenario) return state;
      const run = runScenario(state.scenario);
      return {
        ...state,
        run,
        frameIndex: 0,
        notice: notice(`Trace recomputed: ${plural(run.frames.length, "frame")}.`),
      };
    }

    case "reset": {
      if (!state.baseScenario) return state;
      const scenario = cloneScenario(state.baseScenario);
      const run = runScenario(scenario);
      return {
        ...state,
        scenario,
        run,
        frameIndex: 0,
        selection: null,
        mutations: [],
        history: [],
        saved: false,
        activeBranchId: null,
        drawer: null,
        mutationCard: null,
        pendingReset: false,
        notice: notice(
          state.origin === "branch" ||
            state.origin === "draft" ||
            state.origin === "shared" ||
            state.origin === "imported"
            ? "Reset to the opened scenario."
            : "Reset to the mounted scenario.",
        ),
      };
    }

    case "open-mutation":
      return { ...state, drawer: "mutation", mutationCard: action.card, field: null };

    case "close-mutation":
      return { ...state, drawer: null, mutationCard: null };

    case "apply-mutation": {
      if (!state.scenario) return state;
      const scenario = cloneScenario(action.proposal.scenario);
      const run = runScenario(scenario);
      return {
        ...state,
        scenario,
        run,
        frameIndex: 0,
        mutations: [...state.mutations, action.proposal.mutation],
        history: [...state.history, { scenario: state.scenario, mutations: state.mutations }],
        selection: null,
        saved: false,
        activeBranchId: null,
        drawer: null,
        mutationCard: null,
        notice: notice(`${action.proposal.mutation.label} The new trace is on the bench.`),
      };
    }

    case "undo-mutation": {
      const previous = state.history[state.history.length - 1];
      if (!previous) return state;
      const run = runScenario(previous.scenario);
      return {
        ...state,
        scenario: previous.scenario,
        mutations: previous.mutations,
        history: state.history.slice(0, -1),
        run,
        frameIndex: 0,
        selection: null,
        saved: false,
        activeBranchId: null,
        notice: notice("Last mutation undone."),
      };
    }

    case "set-title":
      return { ...state, title: action.title, saved: false };

    case "set-note":
      return { ...state, note: action.note, saved: false };

    case "notice":
      return { ...state, notice: action.notice };

    case "dismiss-notice":
      return { ...state, notice: null };

    case "set-branches": {
      const keepsActive =
        state.activeBranchId !== null &&
        action.branches.some((branch) => branch.id === state.activeBranchId);
      return {
        ...state,
        branches: action.branches,
        activeBranchId: keepsActive ? state.activeBranchId : null,
        saved: keepsActive ? state.saved : false,
        notice: action.notice ?? state.notice,
        pendingDeleteBranch: null,
      };
    }

    case "saved":
      return {
        ...state,
        branches: action.branches,
        activeBranchId: action.branch.id,
        title: action.branch.title,
        note: action.branch.note,
        saved: true,
        draft: null,
        notice: notice(`Kept "${action.branch.title}" on the shelf.`),
      };

    case "open-branch": {
      const known = action.branches?.some((branch) => branch.id === action.branch.id) ??
        state.branches.some((branch) => branch.id === action.branch.id);
      const saved = action.saved ?? known;
      const run = action.run;
      return {
        ...state,
        phase: "bench",
        origin: saved ? "branch" : "imported",
        benchId: null,
        scenario: cloneScenario(action.branch.scenario),
        baseScenario: cloneScenario(action.baseScenario),
        mutations: action.branch.mutations,
        history: [],
        lens: action.branch.lens,
        run,
        frameIndex: clampFrame(action.branch.frameIndex, run),
        selection: null,
        draft: null,
        title: action.branch.title,
        note: action.branch.note,
        saved,
        drawer: null,
        mutationCard: null,
        activeBranchId: saved ? action.branch.id : null,
        notice: saved
          ? notice(`Opened "${action.branch.title}".`)
          : notice("Imported branch opened. Keep it to add it to your shelf."),
        field: null,
        compare: null,
        pendingDeleteBranch: null,
        pendingDeleteReader: null,
        articleHref: null,
        gameHref: null,
        benchWhat: saved
          ? "A kept branch. The scenario, mutations, lens, and frame are restored."
          : "An imported branch. Keep it to add it to your own shelf.",
        benchFraming: action.branch.scenario.title,
        topTitle: action.branch.scenario.title,
        ...(action.branches === undefined ? {} : { branches: action.branches }),
      };
    }

    case "set-reader-benches":
      return {
        ...state,
        readerBenches: action.benches,
        notice: action.notice ?? state.notice,
        pendingDeleteReader: null,
      };

    case "field":
      return { ...state, field: action.field };

    case "compare":
      return {
        ...state,
        compare: { left: action.left, right: action.right },
        drawer: null,
        field: null,
      };

    case "close-compare":
      return { ...state, compare: null };

    case "pending-delete-branch":
      return { ...state, pendingDeleteBranch: action.branch };

    case "pending-delete-reader":
      return { ...state, pendingDeleteReader: action.bench };

    case "pending-reset":
      return { ...state, pendingReset: action.pending };

    case "share":
      return { ...state, shareUrl: action.url };

    default:
      return state;
  }
}

function getStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleOf(state: State): string {
  if (!state.scenario) return "Untitled branch";
  return (
    state.title.trim() ||
    state.topTitle.trim() ||
    state.scenario.title.trim() ||
    "Untitled branch"
  );
}

function activeBranchOf(state: State): Branch | undefined {
  if (state.activeBranchId === null) return undefined;
  return state.branches.find((branch) => branch.id === state.activeBranchId);
}

function resetLosses(state: State): { mutations: number; scenarioChanged: boolean } {
  const scenarioChanged =
    state.scenario !== null &&
    state.baseScenario !== null &&
    canonicalJson(state.scenario) !== canonicalJson(state.baseScenario);
  return { mutations: state.mutations.length, scenarioChanged };
}

function resetBody(state: State): string {
  const { mutations, scenarioChanged } = resetLosses(state);
  const restored =
    state.origin === "branch" ||
    state.origin === "draft" ||
    state.origin === "shared" ||
    state.origin === "imported";
  const head =
    mutations > 0
      ? `Reset ${plural(mutations, "mutation")}?`
      : scenarioChanged
        ? "Reset the scenario edits?"
        : "Reset this bench?";
  if (restored) {
    return `${head} This returns to "${state.baseScenario?.title ?? "the opened scenario"}" and clears the restored stack. Reopened branches have no earlier history, so this cannot be undone.`;
  }
  return `${head} This discards the current mutation stack and scenario edits, returns to the mounted scenario, and cannot be undone.`;
}

/** A live line derived from the scenario itself, never from authored shelf copy. */
function liveScenarioLine(scenario: Scenario): string {
  const head = `${scenario.substrate} · ${scenario.strategy}`;
  if (scenario.substrate === "graph") {
    const model = scenario.model;
    return `${head} · ${plural(model.nodes.length, "node")} · ${plural(
      model.edges.length,
      "edge",
    )} · start ${model.start} · ${
      model.target === undefined ? "no target" : `target ${model.target}`
    }`;
  }
  if (scenario.substrate === "array") {
    const model = scenario.model;
    return `${head} · ${plural(model.values.length, "value")} · ${
      model.target === undefined ? "no target" : `target ${model.target}`
    } · ${model.sorted ? "sorted" : "unsorted"}`;
  }
  const model = scenario.model;
  return `${head} · strings "${model.a}" / "${model.b}"`;
}

function workingBranch(state: State): Branch | null {
  if (!state.scenario) return null;
  const existing =
    state.activeBranchId === null
      ? undefined
      : state.branches.find((branch) => branch.id === state.activeBranchId);
  const now = Date.now();
  return {
    version: 1,
    id: existing?.id ?? "working",
    parentId: existing?.parentId,
    title: titleOf(state),
    scenario: cloneScenario(state.scenario),
    mutations: state.mutations.map((mutation) => ({
      ...mutation,
      payload: { ...mutation.payload },
    })),
    lens: state.lens,
    frameIndex: clampFrame(state.frameIndex, state.run),
    note: state.note.slice(0, 800),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function fileNameOf(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "observatory-branch"}.json`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function benchSource(bench: LiveBench | undefined): void {
  // Kept as a small seam for tests and future analytics; intentionally silent.
  void bench;
}

export function ObservatoryWorkbench() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const benchHeadingRef = useRef<HTMLHeadingElement>(null);
  const shelfHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousPhase = useRef<Phase>(state.phase);

  // The landing hero belongs to the shelf, not to the instrument room. Once a
  // bench is mounted, drop the page hero and return the eye to the bench top.
  useEffect(() => {
    const page = document.querySelector(".observatory-page");
    page?.classList.toggle("obs-page--bench", state.phase === "bench");
    if (state.phase === "bench") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    return () => page?.classList.remove("obs-page--bench");
  }, [state.phase]);

  // Entering the bench should move focus to its heading, not to the document
  // body; leaving it (when a future shelf action exists) restores the shelf.
  useEffect(() => {
    const previous = previousPhase.current;
    previousPhase.current = state.phase;
    if (previous === state.phase) return;
    if (state.phase === "bench") benchHeadingRef.current?.focus();
    else shelfHeadingRef.current?.focus();
  }, [state.phase]);

  // Hydrate local-first state and any #b= share payload after the static shell.
  useEffect(() => {
    let disposed = false;
    const errors: string[] = [];
    const storage = getStorage();
    let branches: Branch[] = [];
    let readerBenches: ReaderBench[] = [];
    let draft: import("../../observatory/types").Draft | null = null;
    let shared: SharePayload | null = null;

    if (storage) {
      const branchLoad = loadBranches(storage);
      const benchLoad = loadReaderBenches(storage);
      branches = branchLoad.branches;
      readerBenches = benchLoad.benches;
      draft = loadDraft(storage);
      if (branchLoad.dropped > 0) {
        errors.push(`${branchLoad.dropped} corrupted branch record(s) were left out.`);
      }
      if (benchLoad.dropped > 0) {
        errors.push(`${benchLoad.dropped} corrupted reader-bench record(s) were left out.`);
      }
    } else {
      errors.push("Local storage is unavailable. This session will stay in memory.");
    }

    if (typeof window !== "undefined" && window.location.hash.includes("#b=")) {
      const decoded = decodeShare(window.location.href);
      if (decoded.ok) shared = decoded.payload;
      else errors.push(`Share link not loaded: ${decoded.error}`);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    if (!disposed) {
      dispatch({ type: "hydrate", branches, readerBenches, draft, shared, errors });
    }
    return () => {
      disposed = true;
    };
  }, []);

  // A working draft is local and debounced; it never replaces a kept branch.
  useEffect(() => {
    if (!state.hydrated || state.phase !== "bench" || !state.scenario) return;
    const storage = getStorage();
    if (!storage) return;
    const timer = window.setTimeout(() => {
      const result = saveDraft(storage, {
        version: 1,
        savedAt: Date.now(),
        scenario: state.scenario as Scenario,
        mutations: state.mutations,
        lens: state.lens,
        frameIndex: clampFrame(state.frameIndex, state.run),
        title: state.title,
        note: state.note.slice(0, 800),
      });
      if (!result.ok) {
        dispatch({
          type: "notice",
          notice: notice(result.error ?? "The working draft could not be saved.", "error"),
        });
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [
    state.hydrated,
    state.phase,
    state.scenario,
    state.mutations,
    state.lens,
    state.frameIndex,
    state.run,
    state.title,
    state.note,
  ]);

  const frame =
    state.run && state.run.frames.length > 0
      ? state.run.frames[Math.min(state.frameIndex, state.run.frames.length - 1)]
      : null;

  const projection = useMemo(() => {
    if (!state.scenario || !state.run || !frame) return null;
    return projectLens(state.lens, {
      scenario: state.scenario,
      run: state.run,
      frame,
      frameIndex: frame.index,
      mutations: state.mutations,
    });
  }, [state.scenario, state.run, state.lens, frame, state.mutations]);

  // "Try this first" must name a mutation the runner will actually accept.
  // Ask the canonical cards in order and fall back to no suggestion.
  const suggested = useMemo<ScamperId | null>(() => {
    if (!state.scenario || state.mutations.length > 0) return null;
    for (const card of SCAMPER_CARDS) {
      const result = proposeMutation(state.scenario, card.id);
      if (result.ok) return card.id;
    }
    return null;
  }, [state.scenario, state.mutations.length]);

  const openShelf = () => dispatch({ type: "set-drawer", drawer: "shelf" });
  const openBranches = () => dispatch({ type: "set-drawer", drawer: "branches" });
  const openInspector = () => dispatch({ type: "set-drawer", drawer: "inspector" });
  const closeDrawer = () => dispatch({ type: "set-drawer", drawer: null });

  const handlePickLive = (bench: LiveBench) => {
    benchSource(bench);
    dispatch({ type: "pick-live", bench });
  };

  const handlePickReader = (bench: ReaderBench) => dispatch({ type: "pick-reader", bench });
  const handlePickBlank = (substrate: Substrate) => dispatch({ type: "pick-blank", substrate });

  const handleOpenField = (field: FieldSpecimen) => dispatch({ type: "field", field });
  const handleCloseField = () => dispatch({ type: "field", field: null });

  const handleRun = () => dispatch({ type: "run" });
  const handleStep = (direction: -1 | 1) => dispatch({ type: "step", direction });
  const handleScrub = (index: number) => dispatch({ type: "set-frame", index });
  const handleReset = () => {
    const { mutations, scenarioChanged } = resetLosses(state);
    if (mutations === 0 && !scenarioChanged) {
      dispatch({ type: "reset" });
      return;
    }
    dispatch({ type: "pending-reset", pending: true });
  };
  const handleLens = (lens: LensId) => dispatch({ type: "set-lens", lens });
  const handleSelect = (id: string | null) => dispatch({ type: "select", id });

  const handleOpenMutation = (card: ScamperId) => {
    if (state.mutations.length >= LIMITS.mutations) {
      dispatch({
        type: "notice",
        notice: notice(
          `Mutation stack full at ${LIMITS.mutations}. Undo a mutation before applying another.`,
          "error",
        ),
      });
      return;
    }
    dispatch({ type: "open-mutation", card });
  };

  const handleMoveNode = (id: string, x: number, y: number) => {
    if (!state.scenario || state.scenario.substrate !== "graph") return;
    const next = cloneScenario(state.scenario);
    if (next.substrate !== "graph") return;
    next.model = {
      ...next.model,
      nodes: next.model.nodes.map((node) =>
        node.id === id ? { ...node, x: Math.round(x), y: Math.round(y) } : node,
      ),
    };
    dispatch({ type: "set-scenario", scenario: next, source: "move" });
  };

  const handleScenarioChange = (scenario: Scenario) => {
    if (state.scenario !== null && canonicalJson(scenario) === canonicalJson(state.scenario)) {
      dispatch({ type: "notice", notice: notice("No changes to apply.") });
      return;
    }
    dispatch({ type: "set-scenario", scenario, source: "inspector" });
  };

  const handleApplyMutation = (proposal: Extract<MutationResult, { ok: true }>) => {
    if (state.mutations.length >= LIMITS.mutations) {
      dispatch({
        type: "notice",
        notice: notice(
          `Mutation stack full at ${LIMITS.mutations}. Undo a mutation before applying another.`,
          "error",
        ),
      });
      return;
    }
    dispatch({ type: "apply-mutation", proposal });
  };

  const handleUndo = () => {
    if (state.history.length === 0) {
      dispatch({ type: "notice", notice: notice("No applied mutation to undo.") });
      return;
    }
    dispatch({ type: "undo-mutation" });
  };

  const handleKeep = () => {
    if (!state.scenario) return;
    const existing = activeBranchOf(state);
    if (existing === undefined && state.branches.length >= LIMITS.branches) {
      dispatch({
        type: "notice",
        notice: notice(
          `The shelf is full at ${LIMITS.branches} branches. Open branches and delete one before keeping a new branch.`,
          "error",
        ),
      });
      return;
    }
    if (state.mutations.length > LIMITS.mutations) {
      dispatch({
        type: "notice",
        notice: notice(
          `The mutation stack has ${state.mutations.length} items; the cap is ${LIMITS.mutations}. Undo a mutation before keeping.`,
          "error",
        ),
      });
      return;
    }
    if (state.note.length > LIMITS.noteChars) {
      dispatch({
        type: "notice",
        notice: notice(
          `The field note is ${state.note.length} characters; the limit is ${LIMITS.noteChars}. Shorten it before keeping.`,
          "error",
        ),
      });
      return;
    }
    const storage = getStorage();
    if (!storage) {
      dispatch({ type: "notice", notice: notice("Local storage is unavailable; the branch cannot be kept.", "error") });
      return;
    }
    const now = Date.now();
    const branch: Branch = {
      version: 1,
      id: existing?.id ?? makeId("branch"),
      parentId: existing?.parentId,
      title: titleOf(state),
      scenario: cloneScenario(state.scenario),
      mutations: state.mutations.map((mutation) => ({
        ...mutation,
        payload: { ...mutation.payload },
      })),
      lens: state.lens,
      frameIndex: clampFrame(state.frameIndex, state.run),
      note: state.note.slice(0, 800),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const result = saveBranch(storage, branch);
    if (!result.ok) {
      let text: string;
      if (result.code === "cap") {
        text = `The shelf is full at ${LIMITS.branches} branches. Delete a branch first — nothing was overwritten.`;
      } else if (result.code === "size" && /mutation/i.test(result.error)) {
        text = `The mutation stack is over the ${LIMITS.mutations}-mutation cap. Undo a mutation before keeping.`;
      } else if (result.code === "size") {
        text =
          "The branch is over the 8 KB storage limit. Shorten the note or the scenario.";
      } else {
        text = `The branch could not be saved. ${result.error}`;
      }
      dispatch({ type: "notice", notice: notice(text, "error") });
      return;
    }
    try {
      storage.removeItem(STORAGE_KEYS.draft);
    } catch {
      // The branch is already saved; a stale draft is harmless.
    }
    dispatch({ type: "saved", branch, branches: result.branches });
  };

  const handleSaveBench = () => {
    if (!state.scenario) return;
    const storage = getStorage();
    if (!storage) {
      dispatch({ type: "notice", notice: notice("Local storage is unavailable; the bench cannot be saved.", "error") });
      return;
    }
    const bench: ReaderBench = {
      version: 1,
      id: makeId("reader"),
      title: titleOf(state),
      framing: state.benchWhat ?? state.benchFraming ?? "Reader-owned bench",
      substrate: state.scenario.substrate,
      strategy: state.scenario.strategy,
      scenario: cloneScenario(state.scenario),
      createdAt: Date.now(),
    };
    const result = saveReaderBench(storage, bench);
    if (!result.ok) {
      dispatch({
        type: "notice",
        notice: notice(
          result.code === "cap"
            ? "The reader-bench shelf is full. Delete a bench first."
            : `The bench could not be saved. ${result.error}`,
          "error",
        ),
      });
      return;
    }
    dispatch({
      type: "set-reader-benches",
      benches: result.benches,
      notice: notice(`Saved "${bench.title}" as a reader bench.`),
    });
  };

  const handleOpenBranch = (branch: Branch) => {
    const run = runScenario(branch.scenario);
    dispatch({ type: "open-branch", branch, run, baseScenario: branch.scenario });
  };

  const handleFork = (branch: Branch) => {
    const storage = getStorage();
    if (!storage) {
      dispatch({ type: "notice", notice: notice("Local storage is unavailable; the fork cannot be kept.", "error") });
      return;
    }
    const now = Date.now();
    const fork: Branch = {
      ...branch,
      id: makeId("branch"),
      parentId: branch.id,
      title: `${branch.title} fork`,
      scenario: cloneScenario(branch.scenario),
      mutations: branch.mutations.map((mutation) => ({
        ...mutation,
        payload: { ...mutation.payload },
      })),
      note: branch.note,
      createdAt: now,
      updatedAt: now,
    };
    const result = saveBranch(storage, fork);
    if (!result.ok) {
      dispatch({ type: "notice", notice: notice(`Fork not saved. ${result.error}`, "error") });
      return;
    }
    dispatch({
      type: "open-branch",
      branch: fork,
      run: runScenario(fork.scenario),
      baseScenario: fork.scenario,
      branches: result.branches,
      saved: true,
    });
  };

  const handleCompare = (right: Branch) => {
    if (state.branches.length < 2) {
      dispatch({ type: "notice", notice: notice("Keep a second branch before comparing.") });
      return;
    }
    const active = state.activeBranchId === null
      ? undefined
      : state.branches.find((branch) => branch.id === state.activeBranchId);
    const left =
      active !== undefined && active.id !== right.id
        ? active
        : state.branches.find((branch) => branch.id !== right.id);
    if (!left) {
      dispatch({ type: "notice", notice: notice("Keep a second branch before comparing.") });
      return;
    }
    dispatch({ type: "compare", left, right });
  };

  const handleShare = () => {
    if (!state.scenario) return;
    try {
      const payload: SharePayload = {
        v: 1,
        scenario: state.scenario,
        mutations: state.mutations,
        lens: state.lens,
        frameIndex: clampFrame(state.frameIndex, state.run),
      };
      // Encoding once here surfaces the 9,000-character cap before the dialog.
      encodeShare(payload);
      const url = shareUrl(
        `${window.location.origin}${window.location.pathname}`,
        payload,
      );
      dispatch({ type: "share", url });
    } catch (error) {
      dispatch({
        type: "notice",
        notice: notice(
          `This branch is too large for a share link. Export the JSON instead. ${errorText(error)}`,
          "error",
        ),
      });
    }
  };

  const handleExport = () => {
    const branch = workingBranch(state);
    if (!branch) return;
    try {
      const text = exportBranch(branch);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileNameOf(branch.title);
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      dispatch({ type: "notice", notice: notice("Branch exported as JSON.") });
    } catch (error) {
      dispatch({ type: "notice", notice: notice(`Export failed. ${errorText(error)}`, "error") });
    }
  };

  const handleImport = (text: string) => {
    const result = importBranch(text);
    if (!result.ok) {
      dispatch({ type: "notice", notice: notice(`Import failed. ${result.error}`, "error") });
      return;
    }
    dispatch({
      type: "open-branch",
      branch: result.branch,
      run: runScenario(result.branch.scenario),
      baseScenario: result.branch.scenario,
      saved: false,
    });
  };

  const handleDeleteBranch = (branch: Branch) => dispatch({ type: "pending-delete-branch", branch });
  const handleDeleteReader = (bench: ReaderBench) => dispatch({ type: "pending-delete-reader", bench });

  const confirmDeleteBranch = () => {
    const branch = state.pendingDeleteBranch;
    if (!branch) return;
    const storage = getStorage();
    if (!storage) {
      dispatch({ type: "notice", notice: notice("Local storage is unavailable.", "error") });
      return;
    }
    try {
      const branches = deleteBranch(storage, branch.id);
      dispatch({
        type: "set-branches",
        branches,
        notice: notice(`Deleted "${branch.title}".`),
      });
    } catch (error) {
      dispatch({ type: "notice", notice: notice(`Delete failed. ${errorText(error)}`, "error") });
    }
  };

  const confirmDeleteReader = () => {
    const bench = state.pendingDeleteReader;
    if (!bench) return;
    const storage = getStorage();
    if (!storage) {
      dispatch({ type: "notice", notice: notice("Local storage is unavailable.", "error") });
      return;
    }
    try {
      const benches = deleteReaderBench(storage, bench.id);
      dispatch({
        type: "set-reader-benches",
        benches,
        notice: notice(`Deleted reader bench "${bench.title}".`),
      });
    } catch (error) {
      dispatch({ type: "notice", notice: notice(`Delete failed. ${errorText(error)}`, "error") });
    }
  };

  const handleResumeDraft = () => dispatch({ type: "resume-draft" });

  const handleDiscardDraft = () => {
    const storage = getStorage();
    if (storage) {
      try {
        storage.removeItem(STORAGE_KEYS.draft);
      } catch {
        // The in-memory draft can still be discarded.
      }
    }
    dispatch({ type: "discard-draft" });
    dispatch({ type: "notice", notice: notice("Draft discarded. The shelf is unchanged.") });
  };

  const noticeBanner = state.notice ? (
    <div
      className={`obs-notice obs-notice--${state.notice.tone}`}
      role={state.notice.tone === "error" ? "alert" : "status"}
    >
      <p>{state.notice.text}</p>
      <button
        type="button"
        className="obs-button obs-button--ghost"
        aria-label="Dismiss message"
        onClick={() => dispatch({ type: "dismiss-notice" })}
      >
        ✕
      </button>
    </div>
  ) : null;

  const shelfHandlers = {
    onPickLive: handlePickLive,
    onPickReader: handlePickReader,
    onPickBlank: handlePickBlank,
    onOpenField: handleOpenField,
    onDeleteReader: handleDeleteReader,
    onOpenBranches: openBranches,
  };

  // One modal at a time. A confirmation or share sits above the drawer that
  // opened it; the drawer returns when the smaller dialog closes.
  const topOverlay: "confirm" | "share" | "compare" | "field" | "drawer" | null =
    state.pendingReset ||
    state.pendingDeleteBranch !== null ||
    state.pendingDeleteReader !== null
      ? "confirm"
      : state.shareUrl !== null
        ? "share"
        : state.compare !== null
          ? "compare"
          : state.field !== null
            ? "field"
            : state.drawer !== null
              ? "drawer"
              : null;

  const overlays = (
    <>
      {topOverlay === "field" && state.field && (
        <FieldCardDrawer specimen={state.field} onClose={handleCloseField} />
      )}

      {topOverlay === "drawer" && state.drawer === "shelf" && (
        <Overlay label="Specimen shelf" onClose={closeDrawer} className="obs-shelf-drawer">
          <header className="obs-drawer-head">
            <div>
              <p className="obs-kicker">Specimen shelf</p>
              <h2 className="obs-drawer-title">Choose a plate</h2>
            </div>
            <button
              type="button"
              className="obs-button obs-button--ghost"
              aria-label="Close shelf"
              onClick={closeDrawer}
            >
              ✕
            </button>
          </header>
          <SpecimenShelf
            liveBenches={LIVE_BENCHES}
            fieldSpecimens={FIELD_SPECIMENS}
            readerBenches={state.readerBenches}
            branchCount={state.branches.length}
            {...shelfHandlers}
          />
        </Overlay>
      )}

      {topOverlay === "drawer" && state.drawer === "branches" && (
        <Overlay label="Branch shelf" onClose={closeDrawer} className="obs-branch-drawer">
          <BranchShelf
            branches={state.branches}
            activeId={state.activeBranchId}
            atCap={state.branches.length >= LIMITS.branches}
            canShare={state.scenario !== null}
            canExport={state.scenario !== null}
            onOpen={handleOpenBranch}
            onFork={handleFork}
            onCompare={handleCompare}
            onDelete={handleDeleteBranch}
            onShare={handleShare}
            onExport={handleExport}
            onImport={handleImport}
            onClose={closeDrawer}
          />
        </Overlay>
      )}

      {topOverlay === "drawer" && state.drawer === "inspector" && state.scenario && (
        <Overlay label="Scenario inspector" onClose={closeDrawer} className="obs-inspector-drawer">
          <Inspector
            scenario={state.scenario}
            selectedId={state.selection}
            appliedMutations={state.mutations.length}
            onChange={handleScenarioChange}
            onSelect={handleSelect}
            onClose={closeDrawer}
          />
        </Overlay>
      )}

      {topOverlay === "drawer" && state.drawer === "mutation" && state.scenario && state.mutationCard && (
        <MutationDrawer
          key={state.mutationCard}
          scenario={state.scenario}
          card={state.mutationCard}
          selectedId={state.selection}
          onApply={handleApplyMutation}
          onClose={() => dispatch({ type: "close-mutation" })}
        />
      )}

      {topOverlay === "compare" && state.compare && (
        <CompareDialog
          left={state.compare.left}
          right={state.compare.right}
          branches={state.branches}
          onClose={() => dispatch({ type: "close-compare" })}
          onOpen={(branch) => {
            handleOpenBranch(branch);
            dispatch({ type: "close-compare" });
          }}
        />
      )}

      {topOverlay === "share" && state.shareUrl && (
        <ShareDialog url={state.shareUrl} onClose={() => dispatch({ type: "share", url: null })} />
      )}

      {topOverlay === "confirm" && state.pendingReset && (
        <ConfirmDialog
          title="Reset this bench?"
          body={resetBody(state)}
          confirmLabel="Reset bench"
          onConfirm={() => {
            dispatch({ type: "pending-reset", pending: false });
            dispatch({ type: "reset" });
          }}
          onCancel={() => dispatch({ type: "pending-reset", pending: false })}
        />
      )}

      {topOverlay === "confirm" && !state.pendingReset && state.pendingDeleteBranch && (
        <ConfirmDialog
          title="Delete this branch?"
          body={`"${state.pendingDeleteBranch.title}" and its field note will be removed from this browser. The current working scenario is not touched.`}
          confirmLabel="Delete branch"
          onConfirm={confirmDeleteBranch}
          onCancel={() => dispatch({ type: "pending-delete-branch", branch: null })}
        />
      )}

      {topOverlay === "confirm" &&
        !state.pendingReset &&
        !state.pendingDeleteBranch &&
        state.pendingDeleteReader && (
          <ConfirmDialog
            title="Delete this reader bench?"
            body={`"${state.pendingDeleteReader.title}" will be removed from this browser. Saved branches that reference its scenario stay intact.`}
            confirmLabel="Delete bench"
            onConfirm={confirmDeleteReader}
            onCancel={() => dispatch({ type: "pending-delete-reader", bench: null })}
          />
        )}
    </>
  );

  if (state.phase === "shelf" || state.scenario === null) {
    return (
      <div className="obs-shelf-page">
        {noticeBanner}
        {state.draft && (
          <section className="obs-draft-banner" aria-label="Working draft">
            <div>
              <p className="obs-kicker">Draft waiting</p>
              <p>
                {state.draft.scenario.title} ·{" "}
                {LENS_BY_SLUG[state.draft.lens]?.title ?? state.draft.lens} · Step{" "}
                {state.draft.frameIndex + 1}
              </p>
            </div>
            <div className="obs-draft-actions">
              <button type="button" className="obs-button obs-button--accent" onClick={handleResumeDraft}>
                Resume draft
              </button>
              <button type="button" className="obs-button obs-button--ghost" onClick={handleDiscardDraft}>
                Discard draft
              </button>
            </div>
          </section>
        )}
        <header className="obs-shelf-lead">
          <p className="obs-kicker">The specimen shelf</p>
          <h2 ref={shelfHeadingRef} tabIndex={-1}>
            Five live specimens. One open workbench.
          </h2>
          <p>
            Choose a live plate, open a field note, or start blank. Every bench is runnable;
            field cards are honest about the specimens that are not.
          </p>
        </header>
        <SpecimenShelf
          liveBenches={LIVE_BENCHES}
          fieldSpecimens={FIELD_SPECIMENS}
          readerBenches={state.readerBenches}
          branchCount={state.branches.length}
          {...shelfHandlers}
        />
        {overlays}
      </div>
    );
  }

  const scenario = state.scenario;
  const lensCopy = LENS_BY_SLUG[state.lens];
  const frameIndex = frame?.index ?? 0;
  const frameCount = state.run?.frames.length ?? 0;
  const atBranchCap = state.branches.length >= LIMITS.branches;
  const keepBlocked = atBranchCap && activeBranchOf(state) === undefined;
  const authoredCopy = state.benchWhat ?? state.benchFraming;

  return (
    <div className="obs-shell">
      {noticeBanner}
      <header className="obs-topbar">
        <div className="obs-topbar-title">
          <p className="obs-kicker">{originLabel(state.origin)}</p>
          <h2>{state.title.trim() || state.topTitle || scenario.title}</h2>
          <p className="obs-topbar-sub">{liveScenarioLine(scenario)}</p>
          {authoredCopy !== null && (
            <p className="obs-topbar-original">
              <span className="obs-topbar-original-label">Original shelf copy</span>{" "}
              {authoredCopy}
            </p>
          )}
        </div>
        <div className="obs-topbar-actions">
          <span className="obs-tag">{state.saved ? "Kept" : "Working draft"}</span>
          <button type="button" className="obs-button obs-button--ghost" onClick={openShelf}>
            Shelf
          </button>
          <button type="button" className="obs-button obs-button--ghost" onClick={openBranches}>
            Branches{" "}
            <span className="obs-tag">
              {state.branches.length} / {LIMITS.branches}
            </span>
          </button>
          {state.articleHref && (
            <a className="obs-button obs-button--ghost" href={state.articleHref}>
              The mathematics
            </a>
          )}
          {state.gameHref && (
            <a className="obs-button obs-button--ghost" href={state.gameHref}>
              Game mission
            </a>
          )}
        </div>
      </header>

      <LensRail active={state.lens} onSelect={handleLens} />

      <section className="obs-stage" aria-label="Observatory bench">
        <div className="obs-bench">
          <div className="obs-bench-head">
            <div>
              <p className="obs-kicker">
                {scenario.substrate} · {scenario.strategy}
              </p>
              <h2
                ref={benchHeadingRef}
                tabIndex={-1}
                className="obs-bench-title"
              >
                {scenario.title}
              </h2>
            </div>
            <div className="obs-bench-head-actions">
              <span className="obs-tag">{frameCount} frames</span>
              <button type="button" className="obs-button obs-button--ghost" onClick={openInspector}>
                Inspector
              </button>
            </div>
          </div>

          <ObservatoryCanvas
            view={frame?.view ?? null}
            frameHighlights={frame?.highlights ?? []}
            lensHighlights={projection?.highlights ?? []}
            selectedId={state.selection}
            editable
            onSelect={handleSelect}
            onMoveNode={handleMoveNode}
          />

          <div className="obs-under-canvas">
            {projection && frame ? (
              <LensReadout
                lens={state.lens}
                projection={projection}
                frameIndex={frameIndex}
                frameCount={frameCount}
                onPrev={() => handleStep(-1)}
                onNext={() => handleStep(1)}
              />
            ) : (
              <section className="obs-panel obs-readout" aria-label="Lens readout">
                <p className="obs-panel-title">{lensCopy?.title ?? state.lens}</p>
                <p className="obs-readout-text">
                  No trace is mounted. Run the bench or choose a specimen to give the lens
                  something to read.
                </p>
              </section>
            )}
          </div>
        </div>
      </section>

      <aside className="obs-side" aria-label="Run, mutation, and note instruments">
        <RunRail
          frameIndex={frameIndex}
          frameCount={frameCount}
          outcome={state.run?.outcome ?? "invalid"}
          diagnostics={state.run?.diagnostics ?? []}
          dirty={false}
          hasRun={state.run !== null}
          canSaveBench
          lensTitle={lensCopy?.title ?? state.lens}
          atCap={keepBlocked}
          onRun={handleRun}
          onStep={handleStep}
          onScrub={handleScrub}
          onReset={handleReset}
          onKeep={handleKeep}
          onSaveBench={handleSaveBench}
          onOpenBranches={openBranches}
        />
        <ScamperDeck
          applied={state.mutations}
          suggested={suggested}
          atCap={state.mutations.length >= LIMITS.mutations}
          mutationCap={LIMITS.mutations}
          canUndo={state.history.length > 0}
          onOpen={handleOpenMutation}
          onUndo={handleUndo}
        />
        <FieldNote
          title={state.title}
          note={state.note}
          prompt={projection?.notePrompt ?? "What did you notice when you looked?"}
          saved={state.saved}
          onChangeTitle={(title) => dispatch({ type: "set-title", title })}
          onChangeNote={(note) => dispatch({ type: "set-note", note })}
        />
      </aside>

      {overlays}
    </div>
  );
}
