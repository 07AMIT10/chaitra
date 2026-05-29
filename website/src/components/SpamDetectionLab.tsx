import { useMemo, useState } from "react";
import { SAMPLE_EMAILS, classify } from "../lib/spam-sim";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./SpamDetectionLab.css";

export default function SpamDetectionLab() {
  const [priorPct, setPriorPct] = useState(40);
  const [emailIdx, setEmailIdx] = useState(0);

  const priorSpam = priorPct / 100;
  const email = SAMPLE_EMAILS[emailIdx];
  const result = useMemo(
    () => classify(email.words, priorSpam),
    [email, priorSpam]
  );
  const correct = result.prediction === email.label;

  const metrics: LabMetric[] = [
    { id: "prior", label: "P(spam) prior", value: `${priorPct}%` },
    { id: "spam", label: "P(spam | words)", value: `${(result.spamProb * 100).toFixed(1)}%` },
    {
      id: "pred",
      label: "Prediction",
      value: result.prediction,
      tone: correct ? "default" : "warn",
    },
    { id: "actual", label: "Actual label", value: email.label },
  ];

  return (
    <LabShell
      intro={
        <>
          Naive Bayes multiplies word likelihoods with a prior. Adjust P(spam) and see how word
          evidence shifts the posterior — same pattern as the README classifier.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="spam-prior"
            label="Spam prior P(spam)"
            min={5}
            max={95}
            value={priorPct}
            valueText={`${priorPct}% prior spam`}
            onChange={setPriorPct}
          />
          <div className="spam-lab__emails" role="group" aria-label="Sample emails">
            {SAMPLE_EMAILS.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="spam-lab__email"
                aria-pressed={emailIdx === i}
                onClick={() => setEmailIdx(i)}
              >
                {e.words.join(" ")} ({e.label})
              </button>
            ))}
          </div>
          <div className="spam-lab__words">
            {email.words.map((w) => (
              <span key={w} className="spam-lab__word">
                {w}
              </span>
            ))}
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <div className="lab__compare">
        <div>
          <strong>Classifier</strong>
          {result.prediction} ({(result.spamProb * 100).toFixed(1)}% spam)
        </div>
        <div>
          <strong>Ground truth</strong>
          {email.label}
        </div>
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Words: {email.words.join(", ")}. Posterior spam {(result.spamProb * 100).toFixed(1)}%.
      </p>
    </LabShell>
  );
}
