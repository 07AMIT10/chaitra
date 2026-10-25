import "../../styles/algorithms.css";

type Props = {
  /** Honest time for this chapter, in minutes. */
  minutes: number;
  /** Optional reader guidance, e.g. "the twist" or "skippable". */
  tag?: string;
};

/**
 * A time marker placed directly under a chapter heading. Readers who lose
 * track of time see how long each stretch takes before they start it. Static.
 */
export default function ChapterMark({ minutes, tag }: Props) {
  return (
    <p className="alg-chapter">
      <span className="alg-chapter__time">{minutes} min</span>
      {tag != null && <span className="alg-chapter__tag">{tag}</span>}
    </p>
  );
}
