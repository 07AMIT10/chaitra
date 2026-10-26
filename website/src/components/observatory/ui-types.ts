import type { BoardView } from "../../game/types";
import type { ScamperCard, SubstrateProposal } from "../../observatory/mutations";
import type {
  Branch,
  Diagnostic,
  FieldSpecimen,
  Highlight,
  LensId,
  LensProjection,
  LiveBench,
  Mutation,
  MutationResult,
  ReaderBench,
  RunOutcome,
  Scenario,
  ScamperId,
  Substrate,
} from "../../observatory/types";

export type { ScamperCard, SubstrateProposal };

export type CanvasProps = {
  view: BoardView | null;
  frameHighlights: readonly Highlight[];
  lensHighlights: readonly string[];
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string | null) => void;
  onMoveNode: (id: string, x: number, y: number) => void;
};

export type InspectorProps = {
  scenario: Scenario;
  selectedId: string | null;
  onChange: (scenario: Scenario) => void;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

export type ShelfProps = {
  liveBenches: readonly LiveBench[];
  fieldSpecimens: readonly FieldSpecimen[];
  readerBenches: readonly ReaderBench[];
  branchCount: number;
  onPickLive: (bench: LiveBench) => void;
  onPickReader: (bench: ReaderBench) => void;
  onPickBlank: (substrate: Substrate) => void;
  onOpenField: (field: FieldSpecimen) => void;
  onDeleteReader: (bench: ReaderBench) => void;
  onOpenBranches: () => void;
};

export type LensRailProps = {
  active: LensId;
  onSelect: (lens: LensId) => void;
};

export type LensReadoutProps = {
  lens: LensId;
  projection: LensProjection;
  frameIndex: number;
  frameCount: number;
  onPrev: () => void;
  onNext: () => void;
};

export type ScamperDeckProps = {
  applied: readonly Mutation[];
  suggested: ScamperId | null;
  onOpen: (card: ScamperId) => void;
  onUndo: () => void;
};

export type MutationDrawerProps = {
  scenario: Scenario;
  card: ScamperId;
  selectedId: string | null;
  onApply: (proposal: Extract<MutationResult, { ok: true }>) => void;
  onClose: () => void;
};

export type RunRailProps = {
  frameIndex: number;
  frameCount: number;
  outcome: RunOutcome;
  diagnostics: readonly Diagnostic[];
  dirty: boolean;
  hasRun: boolean;
  canSaveBench: boolean;
  onRun: () => void;
  onStep: (direction: -1 | 1) => void;
  onScrub: (index: number) => void;
  onReset: () => void;
  onKeep: () => void;
  onSaveBench: () => void;
};

export type BranchShelfProps = {
  branches: readonly Branch[];
  activeId: string | null;
  atCap: boolean;
  onOpen: (branch: Branch) => void;
  onFork: (branch: Branch) => void;
  onCompare: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
  onShare: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onClose: () => void;
};

export type FieldNoteProps = {
  title: string;
  note: string;
  prompt: string;
  saved: boolean;
  onChangeTitle: (value: string) => void;
  onChangeNote: (value: string) => void;
};

export type FieldCardDrawerProps = {
  specimen: FieldSpecimen;
  onClose: () => void;
};

export type EmptyProps = {
  onPickBlank?: (substrate: Substrate) => void;
};

export type CompareDialogProps = {
  left: Branch;
  right: Branch;
  onClose: () => void;
  onOpenLeft: () => void;
  onOpenRight: () => void;
};

export type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};
