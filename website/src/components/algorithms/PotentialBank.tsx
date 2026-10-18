import { useMemo } from "react";
import SeriesChart from "./SeriesChart";
import "../../styles/algorithms.css";

export type PotentialStep = { label: string; actual: number; delta: number };

type Props = {
  trace?: PotentialStep[];
  caption?: string;
  /** Compatibility hints (workstream C names the potential and workload). */
  n?: number;
  potential?: string;
  workload?: string;
};

function fmt(v: number): string {
  if (!Number.isFinite(v)) return "∞";
  const r = Math.round(v * 1000) / 1000;
  return String(r);
}

/**
 * The physicist's potential as a ledger. Φ_0 = 0; each step contributes
 * ΔΦ = delta and costs amortised = actual + delta, so Σamortised − Σactual = Φ_end.
 */
export default function PotentialBank({ trace, caption, n, potential, workload }: Props) {
  const ledger = useMemo(() => {
    let phi = 0;
    let cumActual = 0;
    let cumAmort = 0;
    const rows = (trace ?? []).map((t, i) => {
      const amort = t.actual + t.delta;
      phi += t.delta;
      cumActual += t.actual;
      cumAmort += amort;
      return { ...t, idx: i + 1, amort, phi, cumActual, cumAmort };
    });
    const sumActual = cumActual;
    const sumAmort = cumAmort;
    const phiEnd = phi;
    const minPhi = rows.reduce((m, r) => Math.min(m, r.phi), 0);
    const lhs = sumAmort - sumActual;
    return { rows, sumActual, sumAmort, phiEnd, minPhi, lhs, rhs: phiEnd, holds: minPhi >= -1e-9 };
  }, [trace]);

  if (ledger.rows.length === 0) {
    return (
      <div className="alg-bank">
        <p className="alg-bank__empty">
          No trace supplied. Pass{" "}
          <code>trace: {"{"} label, actual, delta {"}"}[]</code> (delta is ΔΦ) to audit a potential
          balance.
          {potential != null && <> Potential: {potential}.</>}
          {workload != null && <> Workload: {workload}.</>}
          {n != null && <> n = {n}.</>}
        </p>
        {caption != null && <p className="alg-caption">{caption}</p>}
      </div>
    );
  }

  return (
    <div className="alg-bank">
      <div className="alg-bank__scroll">
        <table className="alg-bank__ledger">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">operation</th>
              <th scope="col">actual</th>
              <th scope="col">ΔΦ</th>
              <th scope="col">amortised</th>
              <th scope="col">Φ</th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.map((r) => (
              <tr key={r.idx}>
                <td>{r.idx}</td>
                <td>{r.label}</td>
                <td className="alg-bank__amt">{fmt(r.actual)}</td>
                <td className={`alg-bank__amt ${r.delta >= 0 ? "alg-bank__amt--pos" : "alg-bank__amt--neg"}`}>
                  {r.delta >= 0 ? "+" : ""}
                  {fmt(r.delta)}
                </td>
                <td className="alg-bank__amt">{fmt(r.amort)}</td>
                <td className={`alg-bank__phi${r.phi < 0 ? " alg-bank__phi--neg" : ""}`}>{fmt(r.phi)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>totals</td>
              <td className="alg-bank__amt">{fmt(ledger.sumActual)}</td>
              <td className="alg-bank__amt">{fmt(ledger.phiEnd)}</td>
              <td className="alg-bank__amt">{fmt(ledger.sumAmort)}</td>
              <td className="alg-bank__phi">{fmt(ledger.phiEnd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="alg-bank__checks">
        <div className={`alg-bank__assert alg-bank__assert--${ledger.holds ? "ok" : "fail"}`}>
          <span className="alg-bank__assert-label">
            {ledger.holds ? "Φ ≥ 0 holds" : "Φ went negative"}
          </span>
          min Φ = <span className="alg-mono">{fmt(ledger.minPhi)}</span> over Φ₀ = 0 and every step.
        </div>
        <div className={`alg-bank__assert alg-bank__assert--${ledger.lhs === ledger.rhs ? "ok" : "fail"}`}>
          <span className="alg-bank__assert-label">Ledger identity</span>
          <span className="alg-bank__formula">
            Σamortised − Σactual = {fmt(ledger.lhs)} = Φ_end − Φ_0 = {fmt(ledger.rhs)} − 0
          </span>
        </div>
      </div>

      <SeriesChart
        series={[
          { name: "Φ balance", points: [[0, 0], ...ledger.rows.map((r) => [r.idx, r.phi] as [number, number])] },
          { name: "cumulative actual", points: [[0, 0], ...ledger.rows.map((r) => [r.idx, r.cumActual] as [number, number])], color: "var(--color-drishti)" },
          { name: "cumulative amortised", points: [[0, 0], ...ledger.rows.map((r) => [r.idx, r.cumAmort] as [number, number])], color: "var(--color-success)" },
        ]}
        xLabel="operation"
        yLabel="work"
        height={260}
      />

      {caption != null && <p className="alg-caption">{caption}</p>}
    </div>
  );
}
