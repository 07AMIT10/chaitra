import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyPass,
  ensurePassMirrorFields,
  formatPassSummary,
  getActiveDraft,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
  type DrishtiPassState,
  type LensSlug,
  type StudySlug,
} from "../../lib/drishti-pass";
import { ApplyDrishtiChip } from "./ApplyDrishtiChip";
import { DrishtiPassPanel } from "./DrishtiPassPanel";
import { DrishtiPassSummary } from "./DrishtiPassSummary";

type Props = {
  sourceUrl: string;
  studySlug?: StudySlug;
  initialLens?: LensSlug;
};

export function DrishtiPassLauncher({ sourceUrl, studySlug, initialLens }: Props) {
  const chipRef = useRef<HTMLButtonElement>(null);
  const [pass, setPass] = useState<DrishtiPassState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const passes = readPassesFromStorage(localStorage);
    setHasDraft(!!getActiveDraft(passes));
  }, [panelOpen, showSummary]);

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

  const openPass = useCallback(() => {
    const passes = readPassesFromStorage(localStorage);
    const draft = getActiveDraft(passes);
    const next =
      draft ??
      createEmptyPass({ sourceUrl, preferredStudy: studySlug });
    setPass(next);
    setPanelOpen(true);
    setShowSummary(false);
  }, [sourceUrl, studySlug]);

  useEffect(() => {
    const handler = () => openPass();
    window.addEventListener("drishti:open-pass", handler);
    return () => window.removeEventListener("drishti:open-pass", handler);
  }, [openPass]);

  const persistPass = (updated: DrishtiPassState) => {
    setPass(updated);
    writePassesToStorage(
      localStorage,
      upsertPass(readPassesFromStorage(localStorage), updated)
    );
  };

  const finalizePass = (next: DrishtiPassState, depth: "light" | "deep") => {
    const completed = ensurePassMirrorFields({
      ...next,
      depth,
      status: "complete",
      updatedAt: new Date().toISOString(),
    });
    const passes = upsertPass(readPassesFromStorage(localStorage), completed);
    const result = writePassesToStorage(localStorage, passes);
    if (!result.ok) setStorageWarning("Could not save — copy your summary before leaving.");
    setPass(completed);
    setPanelOpen(false);
    setShowSummary(true);
    setHasDraft(false);
  };

  const handleCopy = () => {
    if (!pass) return;
    void navigator.clipboard?.writeText(formatPassSummary(pass));
  };

  return (
    <>
      <ApplyDrishtiChip ref={chipRef} hasDraft={hasDraft} onClick={openPass} />

      {pass && panelOpen && (
        <DrishtiPassPanel
          open={panelOpen}
          pass={pass}
          onPassChange={setPass}
          onClose={() => setPanelOpen(false)}
          onFinish={(p) => finalizePass(p, "light")}
          onGoDeeper={(p) => {
            const saved = upsertPass(readPassesFromStorage(localStorage), {
              ...p,
              status: "draft",
              depth: "light",
            });
            writePassesToStorage(localStorage, saved);
            window.location.href = `/drishti/pass/deep?passId=${encodeURIComponent(p.passId)}`;
          }}
          initialLens={initialLens}
          returnFocusRef={chipRef}
        />
      )}

      {pass && showSummary && (
        <div className="drishti-pass-summary-overlay" role="dialog" aria-modal="true">
          <DrishtiPassSummary
            pass={pass}
            storageWarning={storageWarning}
            onInsightChange={(insight) => persistPass({ ...pass, insight })}
            onNowSentenceChange={(nowSentence) =>
              persistPass({ ...pass, nowSentence })
            }
            onMirrorConfirmed={(confirmed) =>
              persistPass({
                ...pass,
                mirrorConfirmed: confirmed ? true : undefined,
              })
            }
            onCopy={handleCopy}
            onNewPass={() => {
              setShowSummary(false);
              setPass(createEmptyPass({ sourceUrl, preferredStudy: studySlug }));
              setPanelOpen(true);
            }}
            onDone={() => setShowSummary(false)}
          />
        </div>
      )}
    </>
  );
}
