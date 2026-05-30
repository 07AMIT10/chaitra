import { useMemo, useState } from "react";
import { formatPercent } from "../lib/spam-math";
import {
  SAMPLE_EMAILS,
  classify,
  vocabForPreset,
  wordEvidence,
  type CorpusPreset,
} from "../lib/spam-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./SpamDetectionLab.css";

export default function SpamDetectionLab() {
  const [priorPct, setPriorPct] = useState(40);
  const [emailIdx, setEmailIdx] = useState(0);
  const [corpusPreset, setCorpusPreset] = useState<CorpusPreset>("balanced");

  const priorSpam = priorPct / 100;
  const vocab = useMemo(() => vocabForPreset(corpusPreset), [corpusPreset]);
  const email = SAMPLE_EMAILS[emailIdx];
  const result = useMemo(
    () => classify(email.words, priorSpam, vocab),
    [email, priorSpam, vocab]
  );
  const correct = result.prediction === email.label;
  const wordBars = useMemo(
    () => email.words.map((w) => ({ word: w, ...wordEvidence(w, vocab) })),
    [email, vocab]
  );

  const applySpamHeavyCorpus = () => {
    setCorpusPreset("spam-heavy");
    setPriorPct(40);
    setEmailIdx(2);
  };

  const applyBalanced = () => {
    setCorpusPreset("balanced");
    setPriorPct(40);
    setEmailIdx(1);
  };

  const applyHighPrior = () => {
    setCorpusPreset("balanced");
    setPriorPct(85);
    setEmailIdx(4);
  };

  const metrics: LabMetric[] = [
    { id: "corpus", label: "Training corpus", value: corpusPreset === "spam-heavy" ? "Spam-heavy" : "Balanced" },
    { id: "prior", label: "P(spam) prior", value: `${priorPct}%` },
    { id: "spam", label: "P(spam | words)", value: formatPercent(result.spamProb) },
    {
      id: "log",
      label: "Log scores",
      value: `spam ${result.logSpam.toFixed(2)} · ham ${result.logHam.toFixed(2)}`,
    },
    {
      id: "margin",
      label: "Log margin (spam − ham)",
      value: (result.logSpam - result.logHam).toFixed(2),
      tone: Math.abs(result.logSpam - result.logHam) < 0.5 ? "warn" : "default",
    },
  ];
  if (!correct && priorPct >= 70 && email.id === "e5") {
    metrics.push({
      id: "aha",
      label: "Aha — prior dominates",
      value: "High P(spam) can flip a mixed ham email to spam.",
      tone: "aha",
    });
  } else if (correct && email.id === "e5" && priorPct < 50) {
    metrics.push({
      id: "aha",
      label: "Aha — word evidence wins",
      value: "Ham words outweigh one spam token when the prior is modest.",
      tone: "aha",
    });
  }

  const compareLeft = `${result.prediction} (${formatPercent(result.spamProb)} spam score)`;
  const compareRight = `${email.label} (ground truth)`;

  return (
    <LabShell
      intro={
        <>
          <strong>Naive Bayes</strong> multiplies word likelihoods with a prior using log-scores to
          avoid underflow. Bars show P(w | spam) vs P(w | ham) from the
          training corpus — same pattern as the README classifier and early SpamAssassin filters.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="spam-prior"
              label="Spam prior P(spam)"
              min={5}
              max={95}
              value={priorPct}
              valueText={`${priorPct}% prior spam`}
              onChange={setPriorPct}
            />
            <ScenarioPresets
              aria-label="Spam classifier scenario presets"
              presets={[
                { id: "heavy", label: "Spam-heavy corpus", onSelect: applySpamHeavyCorpus },
                { id: "balanced", label: "Balanced", onSelect: applyBalanced },
                { id: "prior", label: "High prior", onSelect: applyHighPrior },
              ]}
            />
          </div>
          <div className="spam-lab__emails" role="group" aria-label="Sample emails">
            {SAMPLE_EMAILS.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="spam-lab__email"
                aria-pressed={emailIdx === i}
                onClick={() => setEmailIdx(i)}
              >
                {e.words.join(" ")}
              </button>
            ))}
          </div>
          <div
            className="spam-lab__likelihoods"
            role="img"
            aria-label={`Word likelihoods for ${email.words.length} tokens`}
          >
            {wordBars.map(({ word, pSpam, pHam, favors }) => (
              <div key={word} className="spam-lab__row">
                <span className="spam-lab__token">{word}</span>
                <div className="spam-lab__bars">
                  <div
                    className="spam-lab__bar spam-lab__bar--spam"
                    style={{ width: `${Math.min(100, pSpam * 400)}%` }}
                    title={`P(${word} | spam) = ${pSpam.toFixed(3)}`}
                  />
                  <div
                    className="spam-lab__bar spam-lab__bar--ham"
                    style={{ width: `${Math.min(100, pHam * 400)}%` }}
                    title={`P(${word} | ham) = ${pHam.toFixed(3)}`}
                  />
                </div>
                <span className={`spam-lab__favor spam-lab__favor--${favors}`}>{favors}</span>
              </div>
            ))}
          </div>
          <p className="lab__hint">
            Red = P(w | spam), blue = P(w | ham). Corpus preset retunes
            training counts.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${corpusPreset}-${priorPct}-${emailIdx}`}
        prompt={
          <>
            Email: <strong>{email.words.join(" ")}</strong> with prior{" "}
            <strong>{priorPct}%</strong> spam ({corpusPreset} corpus). Will the classifier label
            this <strong>spam</strong> (posterior ≥ 50%)?
          </>
        }
        revealLabel="Show prediction vs label"
      >
        <ComparePanel
          leftLabel="Classifier"
          rightLabel="Ground truth"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          Log spam {result.logSpam.toFixed(2)} vs log ham {result.logHam.toFixed(2)} →{" "}
          {formatPercent(result.spamProb)} posterior.
          {correct ? " Matches label." : " Mismatch — try lowering prior or balanced corpus."}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {email.words.length} word{email.words.length === 1 ? "" : "s"} · prior {priorPct}% ·{" "}
        {corpusPreset} corpus. Reveal above for prediction vs label.
      </p>
    </LabShell>
  );
}
