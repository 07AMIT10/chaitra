import { useEffect, useState } from "react";
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import {
  ensurePassMirrorFields,
  formatPassSummary,
  getPassById,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
  type DrishtiPassState,
  type LensSlug,
} from "../../lib/drishti-pass";
import { DrishtiPassStep } from "./DrishtiPassStep";
import { DrishtiPassSummary } from "./DrishtiPassSummary";

type Props = {
  passId: string;
};

export function DeepPassWizard({ passId }: Props) {
  const [pass, setPass] = useState<DrishtiPassState | null>(null);
  const [step, setStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const found = getPassById(readPassesFromStorage(localStorage), passId);
    if (!found) {
      window.location.href = "/drishti?toast=pass-not-found";
      return;
    }
    setPass(found);
    setStep(found.currentStep <= 7 ? found.currentStep : 0);
  }, [passId]);

  useEffect(() => {
    if (!pass || !showSummary || pass.status !== "complete") return;
    const withMirror = ensurePassMirrorFields(pass);
    if (withMirror.letter !== pass.letter) {
      setPass(withMirror);
      writePassesToStorage(
        localStorage,
        upsertPass(readPassesFromStorage(localStorage), withMirror)
      );
    }
  }, [pass, showSummary]);

  if (!pass) {
    return <p className="drishti-deep-wizard__loading">Loading pass…</p>;
  }

  const lensSlug = DRISHTI_LENSES[step]?.slug as LensSlug;

  const persist = (next: DrishtiPassState) => {
    setPass(next);
    writePassesToStorage(localStorage, upsertPass(readPassesFromStorage(localStorage), next));
  };

  const finish = () => {
    const completed = ensurePassMirrorFields({
      ...pass,
      depth: "deep",
      status: "complete",
      currentStep: step,
    });
    persist(completed);
    setShowSummary(true);
  };

  if (showSummary) {
    return (
      <DrishtiPassSummary
        pass={pass}
        storageWarning={storageWarning}
        onInsightChange={(insight) => persist({ ...pass, insight })}
        onNowSentenceChange={(nowSentence) => persist({ ...pass, nowSentence })}
        onMirrorConfirmed={(confirmed) =>
          persist({
            ...pass,
            mirrorConfirmed: confirmed ? true : undefined,
          })
        }
        onCopy={() => void navigator.clipboard?.writeText(formatPassSummary(pass))}
        onNewPass={() => (window.location.href = "/drishti")}
        onDone={() => (window.location.href = pass.sourceUrl ?? "/drishti")}
      />
    );
  }

  return (
    <div className="drishti-deep-wizard">
      <header>
        <a href={pass.sourceUrl ?? "/drishti"}>← Back</a>
        <h1>{pass.phenomenon || "Deep pass"}</h1>
        <label>
          Phenomenon
          <input
            value={pass.phenomenon}
            onChange={(e) => persist({ ...pass, phenomenon: e.target.value })}
          />
        </label>
      </header>

      <ol className="drishti-deep-wizard__stepper">
        {DRISHTI_LENSES.map((l, i) => (
          <li key={l.slug} data-done={i < step}>
            <button type="button" onClick={() => setStep(i)}>
              {l.glyph} {l.title}
            </button>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="visually-hidden">
        Deep pass step {step + 1} of 7: {DRISHTI_LENSES[step]?.title}
      </div>

      {lensSlug && (
        <DrishtiPassStep
          lensSlug={lensSlug}
          mode="deep"
          lightNote={pass.lenses[lensSlug].light}
          deepNote={pass.lenses[lensSlug].deep ?? ""}
          preferredStudy={pass.preferredStudy}
          onDeepChange={(value) =>
            persist({
              ...pass,
              lenses: {
                ...pass.lenses,
                [lensSlug]: { ...pass.lenses[lensSlug], deep: value },
              },
              currentStep: step,
            })
          }
        />
      )}

      <footer>
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        {step < 6 ? (
          <button type="button" onClick={() => setStep(step + 1)}>
            Next
          </button>
        ) : (
          <button type="button" onClick={finish} data-analytics="pass-deep-finish">
            Finish deep pass
          </button>
        )}
      </footer>
    </div>
  );
}
