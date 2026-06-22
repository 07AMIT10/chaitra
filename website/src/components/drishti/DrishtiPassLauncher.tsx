import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyPass,
  ensurePassMirrorFields,
  formatPassSummary,
  getActiveDraft,
  getPassById,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
  type DrishtiPassState,
  type LensSlug,
  type StudySlug,
} from "../../lib/drishti-pass";
import {
  finalizePassState,
  markSessionComplete,
} from "../../lib/drishti-return";
import { ApplyDrishtiChip } from "./ApplyDrishtiChip";
import { DrishtiPassPanel } from "./DrishtiPassPanel";
import { DrishtiPassSummary } from "./DrishtiPassSummary";

type Props = {
  sourceUrl: string;
  studySlug?: StudySlug;
  initialLens?: LensSlug;
};

type ReopenDetail = {
  passId: string;
  scrollToBeforeAfter?: boolean;
};

function notifyPassesUpdated() {
  window.dispatchEvent(new Event("drishti:passes-updated"));
}

export function DrishtiPassLauncher({ sourceUrl, studySlug, initialLens }: Props) {
  const chipRef = useRef<HTMLButtonElement>(null);
  const [pass, setPass] = useState<DrishtiPassState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryFreshComplete, setSummaryFreshComplete] = useState(false);
  const [scrollToBeforeAfter, setScrollToBeforeAfter] = useState(false);
  const [echoChangedFlow, setEchoChangedFlow] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [resumeLens, setResumeLens] = useState<LensSlug | undefined>(initialLens);

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

  const openPass = useCallback(
    (lens?: LensSlug) => {
      const passes = readPassesFromStorage(localStorage);
      const draft = getActiveDraft(passes);
      const next =
        draft ?? createEmptyPass({ sourceUrl, preferredStudy: studySlug });
      setPass(next);
      setPanelOpen(true);
      setShowSummary(false);
      setSummaryFreshComplete(false);
      setScrollToBeforeAfter(false);
      setEchoChangedFlow(false);
      if (lens) setResumeLens(lens);
    },
    [sourceUrl, studySlug]
  );

  useEffect(() => {
    const handler = () => openPass();
    window.addEventListener("drishti:open-pass", handler);
    return () => window.removeEventListener("drishti:open-pass", handler);
  }, [openPass]);

  useEffect(() => {
    const onContinue = () => openPass();
    window.addEventListener("drishti:continue-pass", onContinue);
    return () => window.removeEventListener("drishti:continue-pass", onContinue);
  }, [openPass]);

  useEffect(() => {
    const onReopen = (e: Event) => {
      const { passId, scrollToBeforeAfter: scroll } = (
        e as CustomEvent<ReopenDetail>
      ).detail;
      const found = getPassById(readPassesFromStorage(localStorage), passId);
      if (!found || found.status !== "complete") return;
      setPass(ensurePassMirrorFields(found));
      setPanelOpen(false);
      setShowSummary(true);
      setSummaryFreshComplete(false);
      setScrollToBeforeAfter(Boolean(scroll));
      setEchoChangedFlow(Boolean(scroll));
    };
    window.addEventListener("drishti:reopen-pass", onReopen);
    return () => window.removeEventListener("drishti:reopen-pass", onReopen);
  }, []);

  useEffect(() => {
    const onOpenAtLens = (e: Event) => {
      const { lens } = (e as CustomEvent<{ lens: LensSlug }>).detail;
      openPass(lens);
    };
    window.addEventListener("drishti:open-pass-at-lens", onOpenAtLens);
    return () =>
      window.removeEventListener("drishti:open-pass-at-lens", onOpenAtLens);
  }, [openPass]);

  const persistPass = (updated: DrishtiPassState) => {
    let next = updated;
    if (
      echoChangedFlow &&
      (updated.insight?.trim() || updated.nowSentence?.trim())
    ) {
      next = {
        ...updated,
        echoAnswer: "changed",
        echoDismissed: true,
      };
    }
    setPass(next);
    writePassesToStorage(
      localStorage,
      upsertPass(readPassesFromStorage(localStorage), next)
    );
    notifyPassesUpdated();
  };

  const completePass = (next: DrishtiPassState, depth: "light" | "deep") => {
    const completed = finalizePassState(next, depth);
    const passes = upsertPass(readPassesFromStorage(localStorage), completed);
    const result = writePassesToStorage(localStorage, passes);
    if (!result.ok) {
      setStorageWarning("Could not save — copy your summary before leaving.");
    }
    markSessionComplete(sessionStorage, completed.passId);
    notifyPassesUpdated();
    setPass(completed);
    setPanelOpen(false);
    setShowSummary(true);
    setSummaryFreshComplete(true);
    setScrollToBeforeAfter(false);
    setEchoChangedFlow(false);
    setHasDraft(false);
  };

  const handleCopy = () => {
    if (!pass) return;
    void navigator.clipboard?.writeText(formatPassSummary(pass));
  };

  const closeSummary = () => {
    setShowSummary(false);
    setEchoChangedFlow(false);
    setScrollToBeforeAfter(false);
  };

  return (
    <>
      <ApplyDrishtiChip ref={chipRef} hasDraft={hasDraft} onClick={() => openPass()} />

      {pass && panelOpen && (
        <DrishtiPassPanel
          open={panelOpen}
          pass={pass}
          onPassChange={setPass}
          onClose={() => setPanelOpen(false)}
          onFinish={(p) => completePass(p, "light")}
          onGoDeeper={(p) => {
            const saved = upsertPass(readPassesFromStorage(localStorage), {
              ...p,
              status: "draft",
              depth: "light",
            });
            writePassesToStorage(localStorage, saved);
            notifyPassesUpdated();
            window.location.href = `/drishti/pass/deep?passId=${encodeURIComponent(p.passId)}`;
          }}
          initialLens={resumeLens ?? initialLens}
          returnFocusRef={chipRef}
        />
      )}

      {pass && showSummary && (
        <div className="drishti-pass-summary-overlay" role="dialog" aria-modal="true">
          <DrishtiPassSummary
            pass={pass}
            storageWarning={storageWarning}
            showWhatsNext={summaryFreshComplete}
            scrollToBeforeAfter={scrollToBeforeAfter}
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
              closeSummary();
              setPass(createEmptyPass({ sourceUrl, preferredStudy: studySlug }));
              setPanelOpen(true);
              setSummaryFreshComplete(false);
            }}
            onDone={closeSummary}
          />
        </div>
      )}
    </>
  );
}
