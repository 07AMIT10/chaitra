/**
 * The empty mount: one restrained panel that says the bench is empty and
 * offers the shelf or a blank plate. There is no tutorial wall here.
 */
import type { Substrate } from "../../observatory/types";

export type ObservatoryEmptyProps = {
  onPickBlank?: (substrate: Substrate) => void;
};

const BLANK_LABELS: readonly { substrate: Substrate; label: string }[] = [
  { substrate: "graph", label: "Start blank on a graph" },
  { substrate: "array", label: "Start blank on an array" },
  { substrate: "grid", label: "Start blank on a table" },
];

export function ObservatoryEmpty({ onPickBlank }: ObservatoryEmptyProps) {
  return (
    <section className="obs-panel obs-empty" aria-label="Empty bench">
      <h2 className="obs-panel-title">The bench is empty</h2>
      <p className="obs-empty-lede">
        Choose a specimen from the shelf, or start a blank plate.
      </p>
      {onPickBlank !== undefined && (
        <div className="obs-empty-actions">
          {BLANK_LABELS.map((plate) => (
            <button
              key={plate.substrate}
              type="button"
              className="obs-button obs-button--ghost"
              onClick={() => onPickBlank(plate.substrate)}
            >
              {plate.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
