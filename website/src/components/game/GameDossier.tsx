import Transmission from "../algorithms/Transmission";
import type { LevelMeta } from "../../game/types";

type Props = {
  meta: LevelMeta;
  repaired: number;
  total: number;
  hintIndex: number;
  onRevealHint?: (next: number) => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The inbound transmission, shared by the desktop dossier and the mobile
 * first-screen brief. One line and the question stay visible; the rest is a
 * disclosure so the 10⁹-element history cannot push the board down.
 */
export function GameScenario({ meta }: { meta: LevelMeta }) {
  const firstLine = meta.scenario.lines[0];
  const rest = meta.scenario.lines.slice(1);

  return (
    <Transmission from={meta.scenario.from} code={meta.scenario.code}>
      {firstLine != null && <p>{firstLine}</p>}
      <p className="game-dossier__question">{meta.scenario.question}</p>
      {rest.length > 0 && (
        <details className="game-dossier__more">
          <summary>
            <span>Read the full transmission</span>
            <span className="game-dossier__more-glyph" aria-hidden="true">+</span>
          </summary>
          <div className="game-dossier__more-body">
            {rest.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </details>
      )}
    </Transmission>
  );
}

/**
 * The left zone of the console: the inbound transmission, the mission title,
 * the rule that constrains every move, and the tiered hints. Nothing here is
 * interactive until the island hydrates; the scenario is plain server-rendered
 * copy and is visible on first paint.
 */
export default function GameDossier({
  meta,
  repaired,
  total,
  hintIndex,
  onRevealHint,
}: Props) {
  return (
    <aside className="game-dossier" aria-label="Mission dossier">
      <div className="game-dossier__scenario game-scenario">
        <GameScenario meta={meta} />
      </div>

      <section className="game-brief" aria-labelledby="game-brief-title">
        <p className="game-brief__kicker">
          <span>{meta.algorithm}</span>
        </p>
        <h1 id="game-brief-title" className="game-brief__title">{meta.title}</h1>

        {meta.constraint != null && (
          <div className="game-brief__block game-brief__block--rule">
            <p className="game-brief__label">CONSTRAINT</p>
            <p className="game-brief__constraint">{meta.constraint}</p>
          </div>
        )}
      </section>

      {meta.hints.length > 0 && hintIndex > 0 && (
        <section className="game-hints" aria-label="Hints">
          <div className="game-hints__head">
            <p className="game-hints__label">FIELD NOTES</p>
          </div>

          <ol className="game-hints__list" aria-live="polite">
            {meta.hints.slice(0, hintIndex).map((hint, i) => (
              <li key={i} className="game-hints__item">
                <span className="game-hints__num" aria-hidden="true">{pad(i + 1)}</span>
                <p>{hint}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="game-dossier__footer">
        <span className="game-dossier__systems">
          <b>{pad(repaired)}</b> / {pad(total)} systems repaired
        </span>
        <a className="game-dossier__manual" href={meta.page}>
          READ THE MATHEMATICS
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </aside>
  );
}
