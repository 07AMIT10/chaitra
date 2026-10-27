/**
 * The SCAMPER deck: all seven cards are always visible, the suggested card
 * is marked "Try this first", and the applied mutation stack is listed with
 * an Undo-last control. No scores, no locks. The stack is capped at
 * LIMITS.mutations at apply time, so cards disable at the cap instead of
 * letting a branch become unkeepable.
 */
import type { ScamperDeckProps } from "./ui-types";
import { SCAMPER_CARDS } from "../../observatory/mutations";

export function ScamperDeck({
  applied,
  suggested,
  atCap,
  mutationCap,
  canUndo,
  onOpen,
  onUndo,
}: ScamperDeckProps) {
  return (
    <section className="obs-panel obs-deck" aria-label="SCAMPER mutation deck">
      <h2 className="obs-panel-title">SCAMPER deck</h2>

      {atCap && (
        <p className="obs-cap obs-deck-cap" role="status">
          The mutation stack is full at {mutationCap}. Undo a mutation before
          applying another.
        </p>
      )}

      <ul className="obs-deck-cards">
        {SCAMPER_CARDS.map((card) => {
          const isSuggested = card.id === suggested && !atCap;
          return (
            <li key={card.id}>
              <button
                type="button"
                className={
                  isSuggested
                    ? "obs-deck-card obs-deck-card--suggested"
                    : "obs-deck-card"
                }
                disabled={atCap}
                aria-describedby={atCap ? "obs-deck-full" : undefined}
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
      {atCap && (
        <span id="obs-deck-full" className="obs-sr">
          The stack is full; no new mutation can be applied until one is undone.
        </span>
      )}

      <div className="obs-applied">
        <h3 className="obs-panel-title">Applied mutations</h3>
        {applied.length === 0 ? (
          <p className="obs-empty-line">
            None applied — the original scenario runs.
          </p>
        ) : (
          <ol className="obs-applied-list">
            {applied.map((mutation, index) => (
              <li key={`${mutation.id}-${index}`}>{mutation.label}</li>
            ))}
          </ol>
        )}
        <button
          type="button"
          className="obs-button obs-button--ghost"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo last
        </button>
        <p className="obs-applied-note">
          {canUndo
            ? "Undo steps back through mutations applied in this session only."
            : applied.length > 0
              ? "This stack was restored with this bench, so there is no earlier step to undo. Use Reset to return to the opened scenario."
              : "Undo covers mutations applied in this session only."}
        </p>
      </div>
    </section>
  );
}
