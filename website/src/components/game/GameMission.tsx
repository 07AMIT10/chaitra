import { useEffect, useRef, useState } from "react";

import Board from "./Board";
import GameCoach, { type CoachStep } from "./GameCoach";
import GameDossier, { GameScenario } from "./GameDossier";
import GameHUD from "./GameHUD";
import GameLog from "./GameLog";
import GameTelemetry, { type TelemetryStatus } from "./GameTelemetry";
import ShipVoice from "./ShipVoice";
import { useGameAudio } from "./useGameAudio";
import {
  captureSession,
  play,
  restart,
  restoreSession,
  start,
  undo,
  type Session,
} from "../../game/engine";
import { ACTS, LEVEL_META, loadLevel } from "../../game/levels";
import { ENDING, LORE } from "../../game/lore";
import {
  actTransition,
  missionAccess,
  missionHook,
  recordSessionRepair,
  saveCheckpointAcknowledged,
  sessionCheckpoint,
  winOutcome,
  type SessionSummary,
} from "../../game/progression";
import { lineFor, toneFor, type VoiceEvent } from "../../game/ship-voice";
import type { LevelMeta, LevelModule } from "../../game/types";
import {
  clearResume,
  loadProgress,
  loadResume,
  saveResume,
  saveSolved,
  type Progress,
} from "../../game/progress";
import "../../styles/game.css";

type Props = { meta: LevelMeta };

const COACH_KEY = "chaitra_algorithms_game_coached";

const COACH_STEPS: CoachStep[] = [
  {
    title: "The board is live.",
    body: "Select a compartment, then the block it joins. The guide stays out of the way.",
  },
  {
    title: "Choose the destination.",
    body: "Relabel the selected block into the larger registry. The selected block's size is the write cost.",
  },
  {
    title: "One merge recorded.",
    body: "Repeat the pattern: select a block, then relabel it into the growing root. Five writes is a clean run.",
  },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function scoreFor(level: LevelModule<any>, state: unknown) {
  return level.score ? level.score(state) : { stars: 1 as const, detail: "System repaired." };
}

/**
 * A restored snapshot is only trusted once the level can describe it. A
 * stale-but-well-formed state from an older schema is rejected here instead
 * of throwing inside `level.view()` during render.
 */
function canRenderBoard(module: LevelModule<any>, state: unknown): boolean {
  try {
    module.view(state);
    module.moves(state);
    return true;
  } catch {
    return false;
  }
}

/** Current state and every undo state must be describable by this level. */
function canRenderSession(module: LevelModule<any>, session: Session): boolean {
  return (
    canRenderBoard(module, session.state) &&
    session.history.every((entry) => canRenderBoard(module, entry.state))
  );
}

type BudgetReadout = {
  label: string;
  current: string;
  total: string;
  clean: string | null;
};

/** Prefer the caption's cost meter over incidental progress pairs. */
const BUDGET_LABELS = [
  "labels written",
  "tests",
  "cost",
  "flow",
  "firings",
  "comparisons",
  "products",
  "ticks",
  "capacity left",
  "stamped",
  "settled",
  "welds",
  "emitted",
  "length",
  "placements",
  "holds",
  "exact",
  "deepest",
  "row",
];

/**
 * The board contract has no structured budget, so read the one number the
 * caption already prints. `x / y` becomes the primary meter; a clean-run
 * target is carried alongside it when the level publishes one.
 */
function parseBudget(caption?: string): BudgetReadout | null {
  if (!caption) return null;
  const cleanMatch = caption.match(/Clean run:\s*([^·]+)/i);
  const clean = cleanMatch ? cleanMatch[1].trim() : null;
  const matches = [
    ...caption.matchAll(/([A-Za-z][A-Za-z0-9 ’'()\-]{0,24}?):?\s*(\d+)\s*\/\s*(\d+)/g),
  ];
  if (matches.length === 0) return null;
  const pick =
    BUDGET_LABELS.map((needle) =>
      matches.find((match) => match[1].toLowerCase().includes(needle)),
    ).find((match) => match != null) ?? matches[0];
  return {
    label: pick[1].replace(/[:\s]+$/, "").trim(),
    current: pick[2],
    total: pick[3],
    clean,
  };
}

export default function GameMission({ meta }: Props) {
  const [level, setLevel] = useState<LevelModule<any> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [faultMoveId, setFaultMoveId] = useState<string | null>(null);
  const [lastMoveId, setLastMoveId] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [coached, setCoached] = useState<boolean | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [checkpointDismissed, setCheckpointDismissed] = useState(false);
  const saved = useRef(false);
  const sessionRef = useRef<Session | null>(null);
  const winRef = useRef<HTMLElement | null>(null);
  const winTitleRef = useRef<HTMLHeadingElement | null>(null);
  const lastStatus = useRef<string | null>(null);
  const audio = useGameAudio();

  /**
   * One write path for the session. The ref updates synchronously, so two
   * clicks dispatched against the same render cannot both play the old state;
   * the state update keeps React in step for the next paint.
   */
  function commit(next: Session | null) {
    sessionRef.current = next;
    setSession(next);
  }

  const access = progress ? missionAccess(LEVEL_META, progress, meta.slug) : null;
  const allowed = access?.open === true;

  useEffect(() => {
    if (!allowed) {
      commit(null);
      setLevel(null);
      return;
    }

    let live = true;
    setLevel(null);
    commit(null);
    setLoadError(null);
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(null);
    setHintIndex(0);
    setSaveNote(null);
    setSessionSummary(null);
    setCheckpointDismissed(false);
    saved.current = false;

    loadLevel(meta.slug)
      .then((module) => {
        if (!live) return;
        if (!module) {
          setLoadError("This mission is not installed in the current build.");
          return;
        }
        const savedBoard = loadResume(meta.slug);
        const restored = savedBoard
          ? restoreSession(module, savedBoard.snapshot)
          : null;
        const resumable =
          restored && canRenderSession(module, restored) ? restored : null;
        if (savedBoard && !resumable) clearResume(meta.slug);
        setLevel(module);
        commit(resumable ?? start(module));
        setHintIndex(resumable ? Math.min(resumable.hints, meta.hints.length) : 0);
      })
      .catch(() => {
        if (live) setLoadError("The repair console failed to load. Reload the page.");
      });

    return () => {
      live = false;
    };
    // `allowed` flips false→true once progress is read; it stays true after a
    // win, so the board is never reloaded underneath the end card.
  }, [meta.slug, allowed]);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!level || !session) return;
    if (session.status === "playing" && session.moves > 0) {
      saveResume(meta.slug, captureSession(level, session));
    } else {
      clearResume(meta.slug);
    }
  }, [level, session, meta.slug]);

  useEffect(() => {
    if (!level || !session || session.status !== "won" || saved.current) return;
    const score = scoreFor(level, session.state);
    const previous = loadProgress().levels[meta.slug];
    const result = saveSolved(meta.slug, score.stars, session.moves);
    setProgress(result.progress);
    const sessionResult = recordSessionRepair(meta, {
      stars: score.stars,
      moves: session.moves,
    });
    setSessionSummary(sessionResult.summary);
    clearResume(meta.slug);
    const improved =
      previous != null &&
      (score.stars > previous.stars || session.moves < previous.moves);
    const best = result.progress.levels[meta.slug];
    if (!result.ok) {
      setSaveNote("Progress could not be saved in this browser. The mission is still complete for this session.");
    } else if (improved && best != null) {
      setSaveNote(`Record updated: ${best.stars} of 3 stars · ${best.moves} moves.`);
    } else {
      setSaveNote(null);
    }
    saved.current = true;
  }, [level, session, meta]);

  useEffect(() => {
    const status = session?.status ?? null;
    if (status === "won" && lastStatus.current !== "won") {
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      winRef.current?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "center",
      });
      winTitleRef.current?.focus({ preventScroll: true });
    }
    lastStatus.current = status;
  }, [session?.status]);

  useEffect(() => {
    setCoached(null);
    if (meta.number !== 1) return;
    try {
      setCoached(window.localStorage.getItem(COACH_KEY) === "1");
    } catch {
      setCoached(false);
    }
  }, [meta.slug, meta.number]);

  useEffect(() => {
    if (coached !== false || !session || session.moves < COACH_STEPS.length) return;
    setCoached(true);
    try {
      window.localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* storage disabled; the guide stays dismissed for this session */
    }
  }, [coached, session]);

  const act = ACTS.find((entry) => entry.act === meta.act);
  const view = level && session ? level.view(session.state) : null;
  const moves = level && session ? level.moves(session.state) : [];
  const trayMoves = moves.filter((move) => move.placement === "tray");
  const score = level && session && session.status === "won" ? scoreFor(level, session.state) : null;
  const lastBad = session ? [...session.log].reverse().find((event) => event.kind === "bad") : undefined;
  const repaired = progress ? Object.keys(progress.levels).length : 0;
  const isFirstMission = meta.number === 1;
  const coachStep =
    isFirstMission && coached === false && session && session.moves < COACH_STEPS.length
      ? COACH_STEPS[session.moves]
      : null;
  const coachIndex = session ? Math.min(session.moves, COACH_STEPS.length - 1) : 0;
  const repeatMove =
    lastMoveId && session?.status === "playing"
      ? moves.find((move) => move.id === lastMoveId && !move.disabled)
      : undefined;
  const repeatLabel = lastMoveId ? moves.find((move) => move.id === lastMoveId)?.label : undefined;
  const telemetryStatus: TelemetryStatus = ruleError
    ? "fault"
    : session?.status ?? "standby";
  const budget = parseBudget(view?.caption);
  const lore = LORE[meta.slug];
  const checkpoint =
    sessionSummary && progress ? sessionCheckpoint(sessionSummary, LEVEL_META, progress) : null;
  const won = session?.status === "won";
  const outcome = score ? winOutcome(score.stars) : null;
  const required = access?.required ?? null;
  const nextRepair = access?.next?.meta ?? null;
  const showEnding = won && meta.number === 24;

  /**
   * The sealed panel may only offer a landing it can prove open. The immediate
   * precedent can itself be sealed on a deep direct URL, so the primary CTA is
   * the precedent only when it is open; otherwise it is the earliest unsolved
   * (always-open) mission and the precedent is stated as text.
   */
  const requiredAccess =
    progress != null && required != null
      ? missionAccess(LEVEL_META, progress, required.slug)
      : null;
  const requiredOpen = requiredAccess?.open === true;
  const nextAccess =
    progress != null && nextRepair != null
      ? missionAccess(LEVEL_META, progress, nextRepair.slug)
      : null;
  const sealedTarget = requiredOpen
    ? required
    : nextAccess?.open === true
      ? nextRepair
      : null;
  const sealedTargetIsPrecedent = sealedTarget != null && sealedTarget.slug === required?.slug;

  // Precedence: landing → deck boundary → session checkpoint → next preview.
  const transition =
    won && progress && (meta.number === 8 || meta.number === 16)
      ? actTransition(LEVEL_META, progress, meta.act)
      : null;
  const showAct = !showEnding && transition?.due === true;
  // The save effect runs after paint; do not show a "next" preview for the
  // one frame before this run's record lands. The act card then takes over.
  const runRecorded = progress?.levels[meta.slug] != null;
  const showCheckpoint =
    !showEnding &&
    !showAct &&
    won &&
    checkpoint?.due === true &&
    !checkpointDismissed;
  const showNextPreview =
    !showEnding &&
    !showAct &&
    !showCheckpoint &&
    won &&
    runRecorded &&
    nextRepair != null;

  const primaryAction = showEnding
    ? { href: "/algorithms/game", label: "MISSION MAP" }
    : !runRecorded
      ? null
      : showAct && nextRepair
        ? {
            href: `/algorithms/game/${nextRepair.slug}`,
            label: transition?.primaryLabel ?? "STEP THROUGH",
          }
        : showNextPreview && nextRepair
          ? {
              href: `/algorithms/game/${nextRepair.slug}`,
              label: `NEXT REPAIR · ${nextRepair.title.toUpperCase()}`,
            }
          : showCheckpoint
            ? null
            : { href: "/algorithms/game", label: "MISSION MAP" };

  /**
   * SABLE re-contextualises from real events, not a timer: terminal run, deck
   * boundary, refusal, then the accepted move count. `accepted` picks its lead
   * from that count and takes its tail from the live caption, so the strip
   * follows the board without cycling lines or animating.
   */
  const actBoundary = showAct && transition != null;
  const acceptedMoves = session?.moves ?? 0;
  const voiceEvent: VoiceEvent = showEnding
    ? "ending"
    : actBoundary
      ? "act"
      : won
        ? "clean"
        : ruleError
          ? "rejected"
          : acceptedMoves > 0
            ? acceptedMoves === 1
              ? "first-move"
              : "accepted"
            : "boot";
  const voiceContext = {
    stars: score?.stars,
    error: ruleError ?? undefined,
    caption: view?.caption,
    moves: acceptedMoves,
    act: meta.act,
    phase: actBoundary ? ("outro" as const) : ("intro" as const),
  };
  const voiceLine = lineFor(voiceEvent, meta, voiceContext);
  const voiceTone = toneFor(voiceEvent, meta, voiceContext);

  function handleMove(moveId: string) {
    const current = sessionRef.current;
    if (!level || !current) return;
    if (current.status !== "playing") return;
    const result = play(level, current, moveId);
    if (result.error) {
      setRuleError(result.error);
      setFaultMoveId(moveId);
      audio.play("error");
      return;
    }
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(moveId);
    commit(result.session);
    if (result.session.status === "won") {
      audio.play("win");
    } else {
      audio.play("move");
    }
  }

  function handleRepeat() {
    if (repeatMove) handleMove(repeatMove.id);
  }

  function handleUndo() {
    const current = sessionRef.current;
    if (!level || !current) return;
    commit(undo(level, current));
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(null);
    setSaveNote(null);
    saved.current = false;
  }

  function handleRestart() {
    if (!level) return;
    clearResume(meta.slug);
    commit(restart(level));
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(null);
    setHintIndex(0);
    setSaveNote(null);
    saved.current = false;
  }

  function revealHint(nextHint: number) {
    const current = sessionRef.current;
    const capped = Math.max(
      hintIndex,
      current?.hints ?? 0,
      Math.min(nextHint, meta.hints.length),
    );
    if (capped <= hintIndex) return;
    setHintIndex(capped);
    if (current) {
      commit({ ...current, hints: Math.max(current.hints, capped) });
    }
    audio.play("hint");
  }

  function dismissCoach() {
    setCoached(true);
    try {
      window.localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* storage disabled */
    }
  }

  function acknowledgeCheckpointCard() {
    if (!sessionSummary) return;
    const result = saveCheckpointAcknowledged(sessionSummary);
    setSessionSummary(result.summary);
    setCheckpointDismissed(true);
  }

  const repeatTitle = repeatMove
    ? repeatMove.label
    : lastMoveId
      ? "That move is not available from this state."
      : "No accepted move yet.";

  return (
    <div className="game-mission-page">
      <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {won && score != null && outcome != null
          ? `System online. ${outcome.label} ${score.stars} of 3 stars.`
          : ""}
      </p>

      <GameHUD
        meta={meta}
        actName={act?.name ?? "Cadet"}
        repaired={repaired}
        total={LEVEL_META.length}
        soundEnabled={audio.enabled}
        onToggleSound={audio.toggle}
      />

      {progress == null ? (
        <section className="game-gate" role="status" aria-label="Reading repair registry">
          <span className="game-loading__line" aria-hidden="true" />
          <p className="game-gate__text">Reading the repair registry…</p>
        </section>
      ) : !allowed ? (
        <section className="game-sealed" aria-label="System sealed">
          <p className="game-sealed__kicker">ACCESS DENIED · DECK {meta.act}</p>
          <h1 className="game-sealed__title">SYSTEM SEALED</h1>
          <p className="game-sealed__body">
            {required
              ? `REPAIR ${pad(required.number)} · ${required.title} must be online before this console opens.`
              : "This repair is not open yet. The mission map shows the next system."}
          </p>
          {required != null && !requiredOpen && (
            <p className="game-sealed__precedent">
              PRECEDENT · REPAIR {pad(required.number)} · {required.title} is sealed
              as well; the registry opens from the earliest unsolved repair.
            </p>
          )}
          <div className="game-sealed__links">
            {sealedTarget != null && (
              <a
                className="game-btn game-btn--primary"
                href={`/algorithms/game/${sealedTarget.slug}`}
              >
                {sealedTargetIsPrecedent
                  ? `REPAIR ${pad(sealedTarget.number)} · ${sealedTarget.title.toUpperCase()}`
                  : `OPEN REPAIR ${pad(sealedTarget.number)} · ${sealedTarget.title.toUpperCase()}`}
                <span aria-hidden="true">→</span>
              </a>
            )}
            {nextRepair && nextRepair.slug !== sealedTarget?.slug && (
              <a className="game-btn" href={`/algorithms/game/${nextRepair.slug}`}>
                NEXT REPAIR · {nextRepair.title.toUpperCase()}
                <span aria-hidden="true">→</span>
              </a>
            )}
            <a className="game-btn" href="/algorithms/game">
              MISSION MAP
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      ) : (
        <div className="game-console">
        <GameDossier
          meta={meta}
          repaired={repaired}
          total={LEVEL_META.length}
          hintIndex={hintIndex}
          onRevealHint={revealHint}
        />

        <section className="game-stage" aria-label="Repair console">
          <div className="game-stage__situation game-scenario">
            <GameScenario meta={meta} />
          </div>

          <GameCoach
            step={coachStep}
            stepIndex={coachIndex}
            total={COACH_STEPS.length}
            onDismiss={dismissCoach}
          />

          <div
            className={`game-stage__frame${faultMoveId ? " is-fault" : ""}${session?.status === "won" ? " is-win" : ""}${session?.status === "lost" ? " is-lost" : ""}`}
          >
            <header className="game-stage__head">
              <div className="game-stage__brief">
                <p className="game-stage__id">
                  <span className="game-stage__repair">REPAIR {pad(meta.number)}</span>
                  <span className="game-stage__divider" aria-hidden="true">·</span>
                  <span className="game-stage__schematic">{meta.title}</span>
                </p>
                <p className="game-stage__goal">
                  <span className="game-stage__goal-label">OBJECTIVE</span>
                  {meta.goal}
                </p>
              </div>
              <div className="game-stage__readout">
                {budget != null && (
                  <div className="game-stage__budget">
                    <p className="game-stage__budget-label">{budget.label}</p>
                    <p className="game-stage__budget-value">
                      <b>{budget.current}</b>
                      <span className="game-stage__budget-slash" aria-hidden="true">/</span>
                      <span>{budget.total}</span>
                    </p>
                    {budget.clean != null && (
                      <p className="game-stage__budget-clean">CLEAN TARGET {budget.clean}</p>
                    )}
                  </div>
                )}
                <span className="game-stage__algo">{meta.algorithm}</span>
              </div>
            </header>

            <div className="game-stage__viewport">
              {view ? (
                <Board
                  view={view}
                  onMove={handleMove}
                  faultMoveId={faultMoveId ?? undefined}
                />
              ) : (
                <div className="game-loading" role="status">
                  <span className="game-loading__line" aria-hidden="true" />
                  <span>{loadError ?? "Booting the repair console…"}</span>
                </div>
              )}
            </div>

            {view != null && (
              <GameTelemetry
                moves={session?.moves ?? 0}
                hints={session?.hints ?? hintIndex}
                hintsTotal={meta.hints.length}
                status={telemetryStatus}
                kind={view.kind}
                caption={view.caption}
              />
            )}
          </div>

          <ShipVoice line={voiceLine} tone={voiceTone} />

          {ruleError != null && (
            <div className="game-fault" role="alert">
              <span className="game-fault__mark" aria-hidden="true">!</span>
              <div className="game-fault__body">
                <p className="game-fault__label">FAULT</p>
                <p className="game-fault__text">{ruleError}</p>
              </div>
            </div>
          )}

          {trayMoves.length > 0 && (
            <div className="game-tray" role="group" aria-label="Available actions">
              <span className="game-tray__label">MANUAL ACTIONS</span>
              <div className="game-tray__buttons">
                {trayMoves.map((move) => (
                  <button
                    key={move.id}
                    type="button"
                    className={`game-btn${faultMoveId === move.id ? " is-fault" : ""}`}
                    data-move-id={move.id}
                    disabled={move.disabled}
                    onClick={() => handleMove(move.id)}
                  >
                    {move.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="game-controls" role="group" aria-label="Repair controls">
            <button
              type="button"
              className="game-btn game-repeat"
              onClick={handleRepeat}
              disabled={!repeatMove}
              aria-label="Repeat last accepted move"
              title={repeatTitle}
            >
              <span className="game-repeat__glyph" aria-hidden="true">↻</span>
              REPEAT
            </button>
            <button
              type="button"
              className="game-btn"
              onClick={handleUndo}
              disabled={!session || session.history.length === 0}
              aria-label="Undo last move"
            >
              UNDO
            </button>
            <button
              type="button"
              className="game-btn"
              onClick={handleRestart}
              disabled={!level}
              aria-label="Restart repair"
            >
              RESTART
            </button>
          </div>

          {session?.status === "won" && score != null && (
            <section className="game-win" aria-label="Mission complete" ref={winRef}>
              <div className="game-win__head">
                <p className="game-win__kicker">
                  <span className="game-win__lamp" aria-hidden="true" />
                  REPAIR {pad(meta.number)} COMPLETE
                </p>
                <span className="game-win__code">{meta.algorithm}</span>
              </div>

              <h2 className="game-win__title" ref={winTitleRef} tabIndex={-1}>
                SYSTEM ONLINE
              </h2>
              <p className="game-win__mission">{meta.title}</p>

              <div className="game-win__rating">
                <p className="game-win__rating-label">
                  {outcome ? outcome.label : "SOLVED"}
                </p>
                <p
                  className="game-win__stars"
                  aria-label={`${outcome ? outcome.label : "Solved"}: ${score.stars} of 3 stars`}
                >
                  <span className="game-win__stars-lit">{"★".repeat(score.stars)}</span>
                  <span className="game-win__stars-empty">{"☆".repeat(3 - score.stars)}</span>
                </p>
                <p className="game-win__rating-value">{score.stars} / 3</p>
              </div>

              <p className="game-win__detail">{score.detail}</p>

              <div className="game-win__invariant">
                <p className="game-win__invariant-label">THE INVARIANT</p>
                <p className="game-win__invariant-text">{meta.invariant}</p>
              </div>

              {lore != null && (
                <div className="game-win__lore">
                  <p className="game-win__lore-label">SHIP'S LOG</p>
                  <p className="game-win__lore-title">{lore.title}</p>
                  <p className="game-win__lore-text">{lore.fragment}</p>
                </div>
              )}

              {showEnding && (
                <div className="game-win__ending">
                  <p className="game-win__lore-label">ENDING · {ENDING.title.toUpperCase()}</p>
                  <p className="game-win__lore-text">{ENDING.transmission}</p>
                  <p className="game-win__lore-text">{ENDING.epilogue}</p>
                </div>
              )}

              {showAct && transition != null && (
                <aside className="game-win__act" aria-label="Deck boundary">
                  <p className="game-win__lore-label">{transition.kicker}</p>
                  <p className="game-win__lore-title">{transition.title}</p>
                  <p className="game-win__lore-text">{transition.body}</p>
                  {transition.nextLine != null && (
                    <p className="game-win__lore-text">{transition.nextLine}</p>
                  )}
                </aside>
              )}

              {saveNote != null && <p className="game-win__note">{saveNote}</p>}

              {showCheckpoint && checkpoint != null && (
                <aside className="game-checkpoint" aria-label="Session checkpoint">
                  <p className="game-checkpoint__kicker">{checkpoint.kicker}</p>
                  <p className="game-checkpoint__title">{checkpoint.title}</p>
                  <p className="game-checkpoint__body">{checkpoint.body}</p>
                  <div className="game-checkpoint__actions">
                    <a
                      className="game-btn game-btn--primary"
                      href="/algorithms/game"
                      onClick={acknowledgeCheckpointCard}
                    >
                      {checkpoint.pauseLabel}
                      <span aria-hidden="true">→</span>
                    </a>
                    <button type="button" className="game-btn" onClick={acknowledgeCheckpointCard}>
                      STAY ON CONSOLE
                    </button>
                  </div>
                </aside>
              )}

              {showNextPreview && nextRepair != null && (
                <div className="game-win__next">
                  <p className="game-win__next-kicker">
                    NEXT REPAIR · MISSION {pad(nextRepair.number)}
                  </p>
                  <p className="game-win__next-title">{nextRepair.title}</p>
                  <p className="game-win__next-hook">{missionHook(nextRepair)}</p>
                </div>
              )}

              <div className="game-win__links">
                {primaryAction != null && (
                  <a
                    className="game-btn game-btn--primary"
                    href={primaryAction.href}
                    onClick={acknowledgeCheckpointCard}
                  >
                    {primaryAction.label}
                    <span aria-hidden="true">→</span>
                  </a>
                )}
                <a
                  className="game-btn game-btn--manual"
                  href={meta.page}
                  onClick={acknowledgeCheckpointCard}
                >
                  READ THE MATHEMATICS
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </section>
          )}

          {session?.status === "lost" && (
            <section className="game-lose" role="alert" aria-label="Mission failed">
              <p className="game-lose__kicker">SYSTEM LOST</p>
              <p className="game-lose__text">
                {lastBad?.text ?? "The repair failed. Undo the last move or restart the mission."}
              </p>
              <div className="game-lose__links">
                <button
                  type="button"
                  className="game-btn"
                  onClick={handleUndo}
                  disabled={session.history.length === 0}
                >
                  UNDO LAST MOVE
                </button>
                <button type="button" className="game-btn game-btn--primary" onClick={handleRestart}>
                  RESTART REPAIR
                </button>
              </div>
            </section>
          )}
        </section>

        <GameLog events={session?.log ?? []} status={telemetryStatus} />
        </div>
      )}
    </div>
  );
}
