import type { ReactNode } from "react";
import "../../styles/algorithms.css";

type Props = {
  /** Who is speaking: a ship system, a field log, a rival. */
  from: string;
  /** Optional signal or log code, e.g. "SIG 0x4F". */
  code?: string;
  children: ReactNode;
};

/**
 * The cold open: a short scenario in a named voice. It always carries a
 * "Scenario" label, so the fiction is never mistaken for history. Static.
 */
export default function Transmission({ from, code, children }: Props) {
  return (
    <aside className="alg-tx" aria-label={`Scenario from ${from}`}>
      <header className="alg-tx__bar">
        <span className="alg-tx__tag">Scenario</span>
        <span className="alg-tx__from">{from}</span>
        {code != null && <span className="alg-tx__code">{code}</span>}
      </header>
      <div className="alg-tx__body">{children}</div>
    </aside>
  );
}
