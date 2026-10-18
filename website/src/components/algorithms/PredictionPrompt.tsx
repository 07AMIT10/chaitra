import { useState } from "react";
import "../../styles/algorithms.css";

type Props = {
  question: string;
  options: string[];
  /** Index of the correct option (canonical contract). */
  correct: number;
  explain: string;
  hint?: string;
  /** Alias of `correct`, by option text (workstream C passes `answer`). */
  answer?: string;
  /** Alias of `explain` (workstream C passes `explanation`). */
  explanation?: string;
};

/**
 * Lock a guess, mark it right/wrong, then reveal the explanation.
 * Pure state; nothing touches the DOM outside React events.
 */
export default function PredictionPrompt({
  question,
  options,
  correct,
  explain,
  hint,
  answer,
  explanation,
}: Props) {
  const opts = options ?? [];
  const resolved =
    typeof correct === "number" && correct >= 0 && correct < opts.length
      ? correct
      : answer != null
        ? opts.indexOf(answer)
        : -1;
  const explainText = explain ?? explanation ?? "";
  const hasAnswer = resolved >= 0;

  const [picked, setPicked] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const locked = picked !== null;
  const isRight = locked && picked === resolved;

  return (
    <div className="alg-predict" role="group" aria-label="Prediction">
      <p className="alg-predict__q">{question}</p>

      <div className="alg-predict__opts">
        {opts.map((opt, i) => {
          const state = !locked
            ? ""
            : i === resolved
              ? " alg-predict__opt--correct"
              : i === picked
                ? " alg-predict__opt--wrong"
                : "";
          const pickedCls = locked && i === picked ? " alg-predict__opt--picked" : "";
          return (
            <button
              key={i}
              type="button"
              className={`alg-predict__opt${state}${pickedCls}`}
              onClick={() => !locked && setPicked(i)}
              disabled={locked}
              aria-pressed={locked && i === picked}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {!locked && hint != null && (
        <>
          <button
            type="button"
            className="alg-btn alg-predict__hint-btn"
            onClick={() => setShowHint((s) => !s)}
            aria-expanded={showHint}
          >
            {showHint ? "Hide hint" : "Hint"}
          </button>
          {showHint && <p className="alg-predict__hint">{hint}</p>}
        </>
      )}

      {locked && (
        <>
          <p
            className={`alg-predict__verdict ${
              isRight ? "alg-predict__verdict--right" : "alg-predict__verdict--wrong"
            }`}
            role="status"
          >
            {isRight
              ? "Correct."
              : hasAnswer
                ? `Not quite — the answer is “${opts[resolved]}”.`
                : "Locked in."}
          </p>
          {explainText && <p className="alg-predict__explain">{explainText}</p>}
        </>
      )}
    </div>
  );
}
