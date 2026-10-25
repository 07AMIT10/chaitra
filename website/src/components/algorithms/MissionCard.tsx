import "../../styles/algorithms.css";

type Props = {
  /** The one thing the reader will have done by the end, in one sentence. */
  objective: string;
  /** Two to four concrete actions, in the order the page asks for them. */
  steps: string[];
  /** Honest reading-plus-play estimate, in minutes. */
  minutes: number;
  /** The exit ramp for a reader short on time. */
  bailout: string;
  /** Optional mission label, e.g. "04". */
  number?: string;
  /** Optional payoff line: what the reader can do afterwards. */
  after?: string;
};

/**
 * The mission brief. It says what to do, how long it takes, and how to leave
 * early, before the first section begins. Static: the boxes are a plan, not
 * controls.
 */
export default function MissionCard({ objective, steps, minutes, bailout, number, after }: Props) {
  return (
    <section className="alg-mission" aria-label="Mission brief">
      <header className="alg-mission__head">
        <span className="alg-mission__label">
          Mission{number != null ? ` ${number}` : ""}
        </span>
        <span className="alg-mission__time">about {minutes} min</span>
      </header>
      <p className="alg-mission__objective">{objective}</p>
      <ol className="alg-mission__steps">
        {(steps ?? []).map((step, i) => (
          <li key={i}>
            <span className="alg-mission__box" aria-hidden="true" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {after != null && (
        <p className="alg-mission__after">
          <span className="alg-mission__key">After this</span>
          {after}
        </p>
      )}
      <p className="alg-mission__bailout">
        <span className="alg-mission__key">Short on time</span>
        {bailout}
      </p>
    </section>
  );
}
