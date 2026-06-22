import {
  getRecentPasses,
  passInsightSnippet,
} from "../../lib/drishti-return";
import type { DrishtiPassState } from "../../lib/drishti-pass";

type Props = {
  passes: DrishtiPassState[];
  onReopen: (passId: string) => void;
  onContinue: () => void;
};

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function DrishtiPassJournal({ passes, onReopen, onContinue }: Props) {
  const cards = getRecentPasses(passes);

  return (
    <section
      id="passes"
      className="drishti-pass-journal"
      aria-labelledby="drishti-pass-journal-heading"
    >
      <h2 id="drishti-pass-journal-heading">Your passes</h2>
      {cards.length === 0 ? (
        <p className="drishti-pass-journal__empty">
          Complete a pass to see it here.
        </p>
      ) : (
        <ul className="drishti-pass-journal__list" role="list">
          {cards.map((pass) => {
            const isDraft = pass.status === "draft";
            const date = isDraft
              ? formatDate(pass.updatedAt)
              : formatDate(pass.completedAt ?? pass.updatedAt);
            return (
              <li key={pass.passId} className="drishti-pass-journal__card">
                <div className="drishti-pass-journal__card-body">
                  <p className="drishti-pass-journal__title">
                    {pass.phenomenon.trim() || "Untitled pass"}
                    {isDraft && (
                      <span className="drishti-pass-journal__badge">Continue</span>
                    )}
                  </p>
                  <p className="drishti-pass-journal__meta">{date}</p>
                  <p className="drishti-pass-journal__snippet">
                    {passInsightSnippet(pass)}
                  </p>
                  {pass.echoAnswer && (
                    <p className="drishti-pass-journal__echo-meta">
                      Echo: {pass.echoAnswer === "yes" ? "still true" : "updated"}
                    </p>
                  )}
                </div>
                <div className="drishti-pass-journal__actions">
                  {isDraft ? (
                    <button type="button" onClick={onContinue}>
                      Continue
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-analytics="pass-journal-reopen"
                      onClick={() => onReopen(pass.passId)}
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
