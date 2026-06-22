import { getStudyTitle } from "../../lib/drishti-return";
import type { DrishtiPassState } from "../../lib/drishti-pass";

type Props = {
  pass: DrishtiPassState;
  onNewPass: () => void;
};

export function DrishtiWhatsNext({ pass, onNewPass }: Props) {
  const hasInsight = Boolean(pass.insight?.trim() || pass.nowSentence?.trim());
  const relatedSlug = pass.relatedStudySlug;
  const relatedTitle = relatedSlug ? getStudyTitle(relatedSlug) : null;

  return (
    <section
      className="drishti-whats-next"
      aria-labelledby="drishti-whats-next-heading"
    >
      <h3 id="drishti-whats-next-heading">What&apos;s next</h3>
      <ul className="drishti-whats-next__list">
        <li>
          {hasInsight ? (
            <>
              Revisit this pass anytime —{" "}
              <a href="/drishti#passes">History</a>
            </>
          ) : (
            <>
              Revisit anytime in <a href="/drishti#passes">Your passes</a>
            </>
          )}
        </li>
        {relatedSlug && relatedTitle && (
          <li>
            Compare:{" "}
            <a
              href={`/drishti/studies/${relatedSlug}`}
              data-analytics="whats-next-study-click"
            >
              {relatedTitle}
            </a>{" "}
            also explores your strongest lens
          </li>
        )}
        <li>
          <button
            type="button"
            className="drishti-whats-next__link"
            onClick={onNewPass}
          >
            Start fresh on something new
          </button>
        </li>
      </ul>
    </section>
  );
}
