import { useEffect, useRef, useState } from "react";

import Board from "./Board";
import GameCoach, { type CoachStep } from "./GameCoach";
import GameDossier, { GameScenario } from "./GameDossier";
import GameHUD from "./GameHUD";
import GameLog from "./GameLog";
import GameTelemetry, { type TelemetryStatus } from "./GameTelemetry";
import { useGameAudio } from "./useGameAudio";
import { play, restart, start, undo, type Session } from "../../game/engine";
import { ACTS, LEVEL_META, loadLevel, nextMeta } from "../../game/levels";
import { ENDING, LORE } from "../../game/lore";
import {
  recordSessionRepair,
  saveCheckpointAcknowledged,
  sessionCheckpoint,
  type SessionSummary,
} from "../../game/progression";
import type { LevelMeta, LevelModule } from "../../game/types";
import { loadProgress, saveSolved, type Progress } from "../../game/progress";
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
  const winRef = useRef<HTMLElement | null>(null);
  const winTitleRef = useRef<HTMLHeadingElement | null>(null);
  const lastStatus = useRef<string | null>(null);
  const audio = useGameAudio();

  useEffect(() => {
    let live = true;
    setLevel(null);
    setSession(null);
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
        setLevel(module);
        setSession(start(module));
      })
      .catch(() => {
        if (live) setLoadError("The repair console failed to load. Reload the page.");
      });

    return () => {
      live = false;
    };
  }, [meta.slug]);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    if (!level || !session || session.status !== "won" || saved.current) return;
    const score = scoreFor(level, session.state);
    const result = saveSolved(meta.slug, score.stars, session.moves);
    setProgress(result.progress);
    const sessionResult = recordSessionRepair(meta, {
      stars: score.stars,
      moves: session.moves,
    });
    setSessionSummary(sessionResult.summary);
    if (!result.ok) {
      setSaveNote("Progress could not be saved in this browser. The mission is still complete for this session.");
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
  const next = nextMeta(meta.slug);
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
  const showCheckpoint =
    session?.status === "won" && checkpoint?.due === true && !checkpointDismissed;

  function handleMove(moveId: string) {
    if (!level || !session) return;
    if (session.status !== "playing") return;
    const result = play(level, session, moveId);
    if (result.error) {
      setRuleError(result.error);
      setFaultMoveId(moveId);
      audio.play("error");
      return;
    }
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(moveId);
    setSession(result.session);
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
    if (!level || !session) return;
    setSession(undo(level, session));
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(null);
    saved.current = false;
  }

  function handleRestart() {
    if (!level) return;
    setSession(restart(level));
    setRuleError(null);
    setFaultMoveId(null);
    setLastMoveId(null);
    setHintIndex(0);
    saved.current = false;
  }

  function revealHint(nextHint: number) {
    const capped = Math.max(hintIndex, Math.min(nextHint, meta.hints.length));
    if (capped <= hintIndex) return;
    setHintIndex(capped);
    setSession((current) => (
      current ? { ...current, hints: Math.max(current.hints, capped) } : current
    ));
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
        {session?.status === "won" && score != null
          ? `System online. Clean run ${score.stars} of 3.`
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
                      <p className="game-stage__budget-clean">CLEAN RUN {budget.clean}</p>
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
                <p className="game-win__rating-label">CLEAN RUN</p>
                <p className="game-win__stars" aria-label={`Clean run: ${score.stars} of 3 stars`}>
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

              {meta.number === 24 && (
                <div className="game-win__ending">
                  <p className="game-win__lore-label">ENDING · {ENDING.title.toUpperCase()}</p>
                  <p className="game-win__lore-text">{ENDING.transmission}</p>
                  <p className="game-win__lore-text">{ENDING.epilogue}</p>
                </div>
              )}

              {saveNote != null && <p className="game-win__note">{saveNote}</p>}

              <div className="game-win__links">
                <a
                  className="game-btn game-btn--primary"
                  href={next ? `/algorithms/game/${next.slug}` : "/algorithms/game"}
                  onClick={acknowledgeCheckpointCard}
                >
                  {next ? "NEXT REPAIR" : "MISSION MAP"}
                  <span aria-hidden="true">→</span>
                </a>
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

          {showCheckpoint && checkpoint != null && (
            <aside className="game-checkpoint" aria-label="Session checkpoint">
              <p className="game-checkpoint__kicker">{checkpoint.kicker}</p>
              <p className="game-checkpoint__title">{checkpoint.title}</p>
              <p className="game-checkpoint__body">{checkpoint.body}</p>
              <div className="game-checkpoint__actions">
                <a
                  className="game-btn"
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
    </div>
  );
}
