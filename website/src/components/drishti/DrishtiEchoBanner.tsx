import { useState } from "react";
import {
  getEchoEligiblePass,
  passInsightSnippet,
  wasCompletedThisSession,
} from "../../lib/drishti-return";
import {
  upsertPass,
  writePassesToStorage,
  type DrishtiPassState,
} from "../../lib/drishti-pass";

type Props = {
  passes: DrishtiPassState[];
  onChanged: (passId: string) => void;
  onPassesChange: (passes: DrishtiPassState[]) => void;
};

export function DrishtiEchoBanner({
  passes,
  onChanged,
  onPassesChange,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const eligible = getEchoEligiblePass(passes);

  if (
    !eligible ||
    typeof sessionStorage === "undefined" ||
    wasCompletedThisSession(sessionStorage, eligible.passId)
  ) {
    return toast ? (
      <p className="drishti-echo-toast" role="status">
        {toast}
      </p>
    ) : null;
  }

  const snippet = passInsightSnippet(eligible);
  const displaySnippet =
    eligible.insight?.trim() || eligible.nowSentence?.trim()
      ? snippet
      : eligible.phenomenon;

  const updatePass = (patch: Partial<DrishtiPassState>) => {
    const next = { ...eligible, ...patch };
    const updated = upsertPass(passes, next);
    writePassesToStorage(localStorage, updated);
    onPassesChange(updated);
    return next;
  };

  return (
    <>
      <div
        className="drishti-echo-banner"
        role="region"
        aria-labelledby="drishti-echo-heading"
      >
        <p id="drishti-echo-heading" className="drishti-echo-banner__text">
          Three days ago you looked at <strong>{eligible.phenomenon}</strong> —{" "}
          &ldquo;{displaySnippet}&rdquo; — still true?
        </p>
        <div className="drishti-echo-banner__actions">
          <button
            type="button"
            onClick={() => {
              updatePass({ echoAnswer: "yes", echoDismissed: true });
              setToast("Noted — glad it still holds.");
              setTimeout(() => setToast(null), 4000);
            }}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onChanged(eligible.passId)}
          >
            Changed
          </button>
          <button
            type="button"
            className="drishti-echo-banner__dismiss"
            onClick={() => updatePass({ echoDismissed: true })}
          >
            Dismiss
          </button>
        </div>
      </div>
      {toast && (
        <p className="drishti-echo-toast" role="status">
          {toast}
        </p>
      )}
    </>
  );
}
