import "../../styles/algorithms.css";

type Props = {
  /** One sentence that opens the next chapter's question. Plain text only. */
  text: string;
};

/**
 * The cliffhanger at the end of a chapter: one line that makes stopping feel
 * like pausing. Static.
 */
export default function NextUp({ text }: Props) {
  return (
    <p className="alg-nextup">
      <span className="alg-nextup__label">Next</span>
      <span>{text}</span>
    </p>
  );
}
