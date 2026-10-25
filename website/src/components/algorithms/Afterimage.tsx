import "../../styles/algorithms.css";

type Props = {
  /** What the reader should see: the object, in one sentence. */
  object: string;
  /** What moves, or what the algorithm does to that object. */
  motion: string;
  /** Why the move cannot go wrong — the invariant, in one sentence. */
  invariant: string;
  /** Optional single magnitude to carry away, e.g. "60 comparisons, not 10^18". */
  number?: string;
  /** Optional lead-in. Defaults to "With your eyes closed". */
  title?: string;
};

/**
 * The recall close. Three sentences the reader can replay without the page:
 * the object, the motion, the invariant. Static by design — it is a rehearsal,
 * not another panel.
 */
export default function Afterimage({ object, motion, invariant, number, title }: Props) {
  return (
    <aside className="alg-after" aria-label={title ?? "With your eyes closed"}>
      <p className="alg-after__kicker">{title ?? "With your eyes closed"}</p>
      <dl className="alg-after__list">
        <div className="alg-after__row">
          <dt>Object</dt>
          <dd>{object}</dd>
        </div>
        <div className="alg-after__row">
          <dt>Motion</dt>
          <dd>{motion}</dd>
        </div>
        <div className="alg-after__row">
          <dt>Invariant</dt>
          <dd>{invariant}</dd>
        </div>
      </dl>
      {number && (
        <p className="alg-after__number">
          <span className="alg-after__number-label">Carry this</span>
          <span className="alg-after__number-value">{number}</span>
        </p>
      )}
    </aside>
  );
}
