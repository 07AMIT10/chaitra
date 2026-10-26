/**
 * The SCAMPER deck: all seven cards are always visible, the suggested card
 * is marked "Try this first", and the applied mutation stack is listed with
 * an Undo-last control. No scores, no locks.
 */
import type { ScamperDeckProps } from "./ui-types";
import { SCAMPER_CARDS } from "../../observatory/mutations";

export function ScamperDeck({
  applied,
  suggested,
  onOpen,
  onUndo,
}: ScamperDeckProps) {
  return (
    <section className="obs-panel obs-deck" aria-label="SCAMPER mutation deck">
      <h2 className="obs-panel-title">SCAMPER deck</h2>

      <ul className="obs-deck-cards">
        {SCAMPER_CARDS.map((card) => {
          const isSuggested = card.id === suggested;
          return (
            <li key={card.id}>
              <button
                type="button"
                className={
                  isSuggested
                    ? "obs-deck-card obs-deck-card--suggested"
                    : "obs-deck-card"
                }
                onClick={() => onOpen(card.id)}
              >
                <span className="obs-deck-glyph" aria-hidden="true">
                  {card.glyph}
                </span>
                <span className="obs-deck-name">{card.title}</span>
                <span className="obs-deck-prompt">{card.prompt}</span>
                {isSuggested && (
                  <span className="obs-deck-suggest">Try this first</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="obs-applied">
        <h3 className="obs-panel-title">Applied mutations</h3>
        {applied.length === 0 ? (
          <p className="obs-empty-line">
            None applied — the original scenario runs.
          </p>
        ) : (
          <ol className="obs-applied-list">
            {applied.map((mutation) => (
              <li key={mutation.id}>{mutation.label}</li>
            ))}
          </ol>
        )}
        <button
          type="button"
          className="obs-button obs-button--ghost"
          onClick={onUndo}
          disabled={applied.length === 0}
        >
          Undo last
        </button>
      </div>
    </section>
  );
}
