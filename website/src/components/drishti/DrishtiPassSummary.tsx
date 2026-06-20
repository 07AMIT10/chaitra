import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import type { DrishtiPassState, LensSlug } from "../../lib/drishti-pass";

type Props = {
  pass: DrishtiPassState;
  onInsightChange: (insight: string) => void;
  onCopy: () => void;
  onNewPass: () => void;
  onDone: () => void;
  storageWarning?: string | null;
};

export function DrishtiPassSummary({
  pass,
  onInsightChange,
  onCopy,
  onNewPass,
  onDone,
  storageWarning,
}: Props) {
  return (
    <div className="drishti-pass-summary" data-depth={pass.depth}>
      <h2>{pass.phenomenon}</h2>
      {pass.context && <p className="drishti-pass-summary__context">{pass.context}</p>}

      <ul className="drishti-pass-summary__notes">
        {DRISHTI_LENSES.map((lens) => {
          const notes = pass.lenses[lens.slug as LensSlug];
          const text = pass.depth === "deep" ? notes.deep || notes.light : notes.light;
          if (!text?.trim()) return null;
          return (
            <li key={lens.slug}>
              <span className="drishti-pass-summary__lens">
                {lens.glyph} {lens.title}
              </span>
              <span>{text}</span>
            </li>
          );
        })}
      </ul>

      <label htmlFor="drishti-insight">
        What shifted?
        <textarea
          id="drishti-insight"
          value={pass.insight ?? ""}
          maxLength={400}
          rows={3}
          onChange={(e) => onInsightChange(e.target.value)}
          placeholder="One sentence on how you see it differently now."
        />
      </label>

      {storageWarning && (
        <p className="drishti-pass-summary__warning" role="status">
          {storageWarning}
        </p>
      )}

      <div className="drishti-pass-summary__actions">
        <button type="button" onClick={onCopy}>
          Copy summary
        </button>
        <button type="button" onClick={onNewPass}>
          New pass
        </button>
        <button type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
