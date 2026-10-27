import { GAME_MAP_PATH } from "../../game/routes";
import type { LevelMeta, Move, Session } from "../../game/types";

export type RepairRailProps = {
  meta: LevelMeta;
  session: Session | null;
  hintIndex: number;
  ruleError: string | null;
  repeatMove: Move | null | undefined;
  showHelp: boolean;
  parkNote: string | null;
  onUndo: () => void;
  onRepeat: () => void;
  onRestart: () => void;
  onRevealHint: () => void;
  onSaveAndClose: () => void;
  onDismissNote?: () => void;
};

export default function RepairRail({
  meta,
  session,
  hintIndex,
  ruleError,
  repeatMove,
  showHelp,
  parkNote,
  onUndo,
  onRepeat,
  onRestart,
  onRevealHint,
  onSaveAndClose,
  onDismissNote,
}: RepairRailProps) {
  const isPlaying = session?.status === "playing";
  const undoDisabled = !session || session.history.length === 0 || !isPlaying;
  const repeatDisabled = !repeatMove || !isPlaying;
  const saveDisabled = !session || (session.moves === 0 && isPlaying);
  const restartDisabled = !session;
  const showNudge = showHelp && hintIndex < meta.hints.length;
  const statusMessage = ruleError ?? parkNote;

  return (
    <nav className="game-repair-rail" aria-label="Repair console rail">
      {meta.constraint && (
        <div className="game-repair-rail__rule">
          <span className="game-repair-rail__rule-label">RULE</span>
          <p className="game-repair-rail__rule-text">{meta.constraint}</p>
        </div>
      )}

      <div className="game-repair-rail__actions" role="group" aria-label="Repair controls">
        <a
          href={GAME_MAP_PATH}
          className="game-btn game-repair-rail__btn game-repair-rail__btn--map"
          aria-label="Mission map"
        >
          MAP
        </a>
        <button
          type="button"
          className="game-btn game-repair-rail__btn"
          onClick={onUndo}
          disabled={undoDisabled}
          aria-label="Undo last move"
        >
          UNDO
        </button>
        <button
          type="button"
          className="game-btn game-repeat game-repair-rail__btn game-repair-rail__btn--repeat"
          onClick={onRepeat}
          disabled={repeatDisabled}
          aria-label="Repeat last accepted move"
          title={repeatMove ? `Repeat: ${repeatMove.label}` : "Repeat last accepted move"}
        >
          <span className="game-repeat__glyph" aria-hidden="true">↻</span>
          REPEAT
        </button>
        {showNudge && (
          <button
            type="button"
            className="game-btn game-repair-rail__btn game-repair-rail__btn--nudge"
            onClick={onRevealHint}
            aria-label="Need a nudge? Reveal next hint"
          >
            NEED A NUDGE?
          </button>
        )}
        <button
          type="button"
          className="game-btn game-repair-rail__btn game-repair-rail__btn--save"
          onClick={onSaveAndClose}
          disabled={saveDisabled}
          aria-label="Save and close repair"
        >
          SAVE &amp; CLOSE
        </button>
        <button
          type="button"
          className="game-btn game-repair-rail__btn game-repair-rail__btn--restart"
          onClick={onRestart}
          disabled={restartDisabled}
          aria-label="Restart repair"
        >
          RESTART
        </button>
      </div>

      <div
        className={`game-repair-rail__status${parkNote ? " game-banner" : ""}`}
        role="status"
        aria-live="polite"
      >
        {statusMessage && (
          <div className="game-repair-rail__status-body">
            <span className="game-repair-rail__status-mark" aria-hidden="true">
              {ruleError ? "!" : "ℹ"}
            </span>
            <p className="game-repair-rail__status-text game-banner__text">
              {statusMessage}
            </p>
            {onDismissNote && (
              <button
                type="button"
                className="game-repair-rail__status-dismiss"
                onClick={onDismissNote}
                aria-label="Dismiss note"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
