import "../../styles/algorithms.css";

export type GrowthRow = {
  n: string;
  logn?: string;
  logstarn?: string;
  alpha?: string;
  note?: string;
};

type Props = {
  rows?: GrowthRow[];
  highlightN?: string;
  /** Alias of `highlightN` (workstream C calls this `highlight`). */
  highlight?: string;
  accentColumn?: "alpha" | "logstarn" | "logn";
  caption?: string;
};

const ACCENT_LABEL = {
  alpha: "α(n)",
  logstarn: "log* n",
  logn: "log n",
} as const;

/** Standard comparison table used when no `rows` are supplied. */
const DEFAULT_ROWS: GrowthRow[] = [
  { n: "10", logn: "3.3", logstarn: "3", alpha: "2" },
  { n: "10⁹", logn: "30", logstarn: "5", alpha: "4", note: "a billion elements" },
  { n: "10¹⁸", logn: "60", logstarn: "5", alpha: "4", note: "log n doubles, α does not" },
  { n: "10⁸⁰", logn: "266", logstarn: "5", alpha: "4", note: "atoms in the observable universe" },
  { n: "A₄(1)", logn: "2↑↑65536", logstarn: "5", alpha: "5", note: "α first reaches 5" },
];

const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Normalise "10^80", "10⁸⁰", "10 80" to the same key. */
function normKey(s: string): string {
  let out = "";
  for (const ch of s) {
    const i = SUPER.indexOf(ch);
    out += i >= 0 ? String(i) : ch;
  }
  return out.replace(/[\^,\s_]/g, "").toLowerCase();
}

/** Comparison table; the chosen column is emphasised and one row is highlighted. */
export default function GrowthTable({
  rows,
  highlightN,
  highlight,
  accentColumn = "alpha",
  caption,
}: Props) {
  const data = rows && rows.length > 0 ? rows : DEFAULT_ROWS;
  const target = highlightN ?? highlight;

  const hasLogn = data.some((r) => r.logn != null);
  const hasLogstar = data.some((r) => r.logstarn != null);
  const hasAlpha = data.some((r) => r.alpha != null);
  const hasNote = data.some((r) => r.note != null);

  const colClass = (col: "logn" | "logstarn" | "alpha") =>
    col === accentColumn ? "alg-grow__col--accent" : "";

  return (
    <div className="alg-grow">
      <div className="alg-grow__scroll">
        <table className="alg-grow__table">
          <thead>
            <tr>
              <th scope="col">n</th>
              {hasLogn && (
                <th scope="col" className={colClass("logn")}>
                  log n
                </th>
              )}
              {hasLogstar && (
                <th scope="col" className={colClass("logstarn")}>
                  log* n
                </th>
              )}
              {hasAlpha && (
                <th scope="col" className={colClass("alpha")}>
                  α(n)
                </th>
              )}
              {hasNote && <th scope="col">note</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => {
              const hl = target != null && normKey(r.n) === normKey(target);
              return (
                <tr key={`${r.n}-${i}`} className={hl ? "alg-grow__row--hl" : undefined}>
                  <td className="alg-grow__n">{r.n}</td>
                  {hasLogn && <td className={colClass("logn")}>{r.logn ?? "—"}</td>}
                  {hasLogstar && <td className={colClass("logstarn")}>{r.logstarn ?? "—"}</td>}
                  {hasAlpha && <td className={colClass("alpha")}>{r.alpha ?? "—"}</td>}
                  {hasNote && <td className="alg-grow__note">{r.note}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {caption != null && <p className="alg-caption">{caption}</p>}
      <p className="alg-caption">
        Emphasised column: <span className="alg-mono">{ACCENT_LABEL[accentColumn]}</span>
        {target != null && (
          <>
            {" · "}highlighted row: <span className="alg-mono">n = {target}</span>
          </>
        )}
      </p>
    </div>
  );
}
