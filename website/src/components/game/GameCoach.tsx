import type { KeyboardEvent } from "react";

export type CoachStep = { title: string; body: string };

type Props = {
  step: CoachStep | null;
  stepIndex?: number;
  total?: number;
  onDismiss: () => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * First-run guidance, styled as a ship annotation rather than a modal.
 *
 * It never covers the board and never takes focus: the player can keep making
 * moves, and the step advances when the shell changes `step`. Escape dismisses
 * only while focus is inside the callout; the dismiss control is the keyboard
 * path for everyone else.
 */
export default function GameCoach({ step, stepIndex = 0, total = 1, onDismiss }: Props) {
  if (!step) return null;

  const count = Math.max(1, Math.trunc(total) || 1);
  const index = Math.min(Math.max(0, Math.trunc(stepIndex) || 0), count - 1);
  const last = index === count - 1;
  const pips = count <= 8 ? Array.from({ length: count }, (_, i) => i) : [];

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    onDismiss();
  }

  return (
    <aside
      className="game-coach"
      aria-label="Ship guidance"
      aria-keyshortcuts="Escape"
      onKeyDown={handleKeyDown}
    >
      <span className="game-coach__anchor" aria-hidden="true" />
      <div className="game-coach__frame">
        <p className="game-coach__kicker">
          <span className="game-coach__beacon" aria-hidden="true" />
          <span>Guide {pad(index + 1)} / {pad(count)}</span>
          {pips.length > 0 && (
            <span className="game-coach__pips" aria-hidden="true">
              {pips.map((pip) => (
                <span key={pip} className={pip <= index ? "is-lit" : undefined} />
              ))}
            </span>
          )}
        </p>

        <div className="game-coach__copy" role="status" aria-live="polite">
          <p className="game-coach__title">{step.title}</p>
          <p className="game-coach__body">{step.body}</p>
        </div>

        <div className="game-coach__foot">
          <span className="game-coach__key" aria-hidden="true">
            <kbd>Esc</kbd> dismiss
          </span>
          <button type="button" className="game-coach__dismiss" onClick={onDismiss}>
            {last ? "Dismiss" : "Skip guide"}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
