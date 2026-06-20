import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import {
  PHENOMENON_MAX,
  type DrishtiPassState,
  type LensSlug,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
} from "../../lib/drishti-pass";
import { DrishtiPassStep } from "./DrishtiPassStep";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Props = {
  open: boolean;
  pass: DrishtiPassState;
  onPassChange: (pass: DrishtiPassState) => void;
  onClose: () => void;
  onFinish: (pass: DrishtiPassState) => void;
  onGoDeeper: (pass: DrishtiPassState) => void;
  initialLens?: LensSlug;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function DrishtiPassPanel({
  open,
  pass,
  onPassChange,
  onClose,
  onFinish,
  onGoDeeper,
  initialLens,
  returnFocusRef,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const passRef = useRef(pass);
  passRef.current = pass;
  const [liveMsg, setLiveMsg] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const persist = useCallback(
    (next: DrishtiPassState) => {
      passRef.current = next;
      onPassChange(next);
      const passes = readPassesFromStorage(localStorage);
      const updated = upsertPass(passes, next);
      const result = writePassesToStorage(localStorage, updated);
      if (!result.ok && result.reason === "quota") {
        setStorageWarning("Storage full — notes kept for this session only.");
      }
    },
    [onPassChange]
  );

  const flushDebounce = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, []);

  const debouncedPersist = useCallback(
    (next: DrishtiPassState) => {
      passRef.current = next;
      onPassChange(next);
      flushDebounce();
      saveTimer.current = setTimeout(() => {
        persist(next);
        saveTimer.current = null;
      }, 500);
    },
    [flushDebounce, onPassChange, persist]
  );

  const persistNow = useCallback(
    (next?: DrishtiPassState) => {
      flushDebounce();
      persist(next ?? passRef.current);
    },
    [flushDebounce, persist]
  );

  useEffect(() => {
    if (!open) return;
    const step = pass.currentStep;
    if (step === 0) {
      setLiveMsg("Setup — name your phenomenon");
    } else if (step >= 1 && step <= 7) {
      const lens = DRISHTI_LENSES[step - 1];
      setLiveMsg(`Step ${step} of 7: ${lens.title}`);
    } else {
      setLiveMsg("Pass complete — finish or go deeper");
    }
  }, [open, pass.currentStep]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open, pass.currentStep]);

  useEffect(() => {
    if (!open || !initialLens || pass.currentStep !== 0) return;
    if (!pass.phenomenon.trim()) return;
    const idx = DRISHTI_LENSES.findIndex((l) => l.slug === initialLens);
    if (idx >= 0) {
      persist({ ...pass, currentStep: idx + 1 });
    }
  }, [open, initialLens]); // eslint: resume lens only on open

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const root = dialogRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [open, pass.currentStep]);

  const closePanel = useCallback(() => {
    persistNow({ ...passRef.current, status: "draft" });
    onClose();
    returnFocusRef?.current?.focus();
  }, [onClose, persistNow, returnFocusRef]);

  const handleClose = () => {
    const current = passRef.current;
    const hasNotes =
      current.phenomenon.trim() ||
      Object.values(current.lenses).some((l) => l.light?.trim() || l.deep?.trim());
    if (hasNotes && !window.confirm("Save draft and close?")) return;
    closePanel();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pass]);

  useEffect(() => () => flushDebounce(), [flushDebounce]);

  if (!open) return null;

  const lensIndex = pass.currentStep - 1;
  const lensSlug = DRISHTI_LENSES[lensIndex]?.slug as LensSlug | undefined;

  const phenomenonReady = pass.phenomenon.trim().length > 0;
  const showProgress = pass.currentStep >= 1 && pass.currentStep <= 7;
  const progressLabel =
    pass.currentStep === 8
      ? "Complete"
      : showProgress
        ? `Lens ${pass.currentStep} of 7`
        : pass.currentStep === 0
          ? "Setup"
          : null;

  return (
    <>
      <button
        type="button"
        className="drishti-pass-panel__backdrop"
        aria-label="Close pass panel"
        tabIndex={-1}
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        className="drishti-pass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drishti-pass-title"
        tabIndex={-1}
      >
        <header className="drishti-pass-panel__header">
          <div className="drishti-pass-panel__header-text">
            <h2 id="drishti-pass-title">Apply Drishti</h2>
            {progressLabel && (
              <p className="drishti-pass-panel__progress" aria-live="polite">
                {progressLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            className="drishti-pass-panel__close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="visually-hidden" aria-live="polite">
          {liveMsg}
        </div>

        <div className="drishti-pass-panel__body">
          {storageWarning && (
            <p className="drishti-pass-panel__warning" role="status">
              {storageWarning}
            </p>
          )}

          {pass.currentStep === 0 && (
            <>
              <p className="drishti-pass-panel__intro">
                Name something you&apos;re trying to understand — your team, a habit, a
                project. We&apos;ll walk you through seven questions in order.
              </p>
              <div className="drishti-pass-panel__phenomenon">
                <label className="drishti-pass-panel__field" htmlFor="drishti-phenomenon">
                  <span className="drishti-pass-panel__field-label">Your phenomenon</span>
                  <input
                    id="drishti-phenomenon"
                    className="drishti-pass-panel__input"
                    value={pass.phenomenon}
                    maxLength={PHENOMENON_MAX}
                    placeholder="e.g. my team's standup ritual"
                    onChange={(e) =>
                      debouncedPersist({ ...pass, phenomenon: e.target.value })
                    }
                    onBlur={(e) =>
                      persistNow({ ...passRef.current, phenomenon: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </label>
                <label className="drishti-pass-panel__field" htmlFor="drishti-context">
                  <span className="drishti-pass-panel__field-label">
                    Optional context
                    <span className="drishti-pass-panel__field-hint"> — one line</span>
                  </span>
                  <input
                    id="drishti-context"
                    className="drishti-pass-panel__input"
                    value={pass.context ?? ""}
                    maxLength={200}
                    placeholder="Why you're looking at this now"
                    onChange={(e) =>
                      debouncedPersist({ ...pass, context: e.target.value })
                    }
                    onBlur={(e) =>
                      persistNow({ ...passRef.current, context: e.target.value })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {pass.currentStep >= 1 && pass.currentStep <= 7 && lensSlug && (
            <DrishtiPassStep
              lensSlug={lensSlug}
              mode="light"
              lightNote={pass.lenses[lensSlug].light ?? ""}
              preferredStudy={pass.preferredStudy}
              onLightChange={(value) => {
                const next = {
                  ...pass,
                  lenses: {
                    ...pass.lenses,
                    [lensSlug]: { ...pass.lenses[lensSlug], light: value },
                  },
                };
                debouncedPersist(next);
              }}
            />
          )}

          {pass.currentStep === 8 && (
            <div className="drishti-pass-panel__complete">
              <p className="drishti-pass-panel__ring" aria-hidden="true">
                7/7
              </p>
              <p>Light pass complete. Finish with a summary or go deeper.</p>
            </div>
          )}
        </div>

        <footer className="drishti-pass-panel__footer">
          {pass.currentStep === 0 && !phenomenonReady && (
            <p className="drishti-pass-panel__footer-hint">
              Name your phenomenon to continue
            </p>
          )}

          <div className="drishti-pass-panel__footer-actions">
            {pass.currentStep > 0 && pass.currentStep <= 8 && (
              <button
                type="button"
                className="drishti-pass-panel__btn drishti-pass-panel__btn--secondary"
                onClick={() =>
                  persistNow({ ...pass, currentStep: Math.max(0, pass.currentStep - 1) })
                }
              >
                Back
              </button>
            )}
            {pass.currentStep === 0 && (
              <button
                type="button"
                className="drishti-pass-panel__btn drishti-pass-panel__btn--primary"
                disabled={!phenomenonReady}
                onClick={() => persistNow({ ...pass, currentStep: 1 })}
              >
                Begin pass →
              </button>
            )}
            {pass.currentStep >= 1 && pass.currentStep < 7 && (
              <button
                type="button"
                className="drishti-pass-panel__btn drishti-pass-panel__btn--primary"
                onClick={() =>
                  persistNow({ ...pass, currentStep: pass.currentStep + 1 })
                }
              >
                Next →
              </button>
            )}
            {pass.currentStep === 7 && (
              <button
                type="button"
                className="drishti-pass-panel__btn drishti-pass-panel__btn--primary"
                onClick={() => persistNow({ ...pass, currentStep: 8 })}
              >
                Next →
              </button>
            )}
            {pass.currentStep === 8 && (
              <>
                <button
                  type="button"
                  className="drishti-pass-panel__btn drishti-pass-panel__btn--secondary"
                  onClick={() => {
                    flushDebounce();
                    onFinish(passRef.current);
                  }}
                >
                  Finish
                </button>
                <button
                  type="button"
                  className="drishti-pass-panel__btn drishti-pass-panel__btn--primary"
                  onClick={() => {
                    flushDebounce();
                    persistNow({ ...passRef.current, status: "draft" });
                    onGoDeeper(passRef.current);
                  }}
                  data-analytics="pass-go-deeper"
                >
                  Go deeper →
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
