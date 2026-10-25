import { useEffect, useState } from "react";
import "../../styles/algorithms.css";

type BetState = "right" | "wrong" | "locked" | "open";

function readBets(): BetState[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-alg-prediction]")).map(
    (el) => (el.dataset.algPrediction as BetState | undefined) ?? "open",
  );
}

/**
 * The page tally. It counts the bets the reader has called on this page and
 * follows each new bet live. Reads the DOM on mount, so a bet made before this
 * island hydrates is still counted.
 */
export default function MissionScore() {
  const [bets, setBets] = useState<BetState[] | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => setBets(readBets());
    refresh();
    const onBet = () => {
      timer = window.setTimeout(refresh, 0);
    };
    window.addEventListener("alg:prediction", onBet);
    return () => {
      window.removeEventListener("alg:prediction", onBet);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  if (bets === null || bets.length === 0) return null;

  const right = bets.filter((b) => b === "right").length;
  const wrong = bets.filter((b) => b === "wrong").length;
  const open = bets.filter((b) => b === "open").length;
  const total = bets.length;
  const done = open === 0;

  const verdict = !done
    ? `${open} ${open === 1 ? "bet" : "bets"} still to call.`
    : wrong === 0
      ? "Clean sweep."
      : `${wrong} missed. The explanation above is the fix.`;

  return (
    <aside className="alg-score" aria-live="polite" aria-label="Your bets on this page">
      <p className="alg-score__head">
        <span className="alg-score__label">Bets called</span>
        <span className="alg-score__value">
          {right} of {total} right
        </span>
      </p>
      <div className="alg-score__pips" aria-hidden="true">
        {bets.map((b, i) => (
          <span key={i} className={`alg-score__pip alg-score__pip--${b}`} />
        ))}
      </div>
      <p className="alg-score__verdict">{verdict}</p>
    </aside>
  );
}
