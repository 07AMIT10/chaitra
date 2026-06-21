import { useEffect, useState } from "react";
import {
  findStudyBridgePass,
  getLensTitle,
  migratePasses,
} from "../../lib/drishti-return";
import { readPassesFromStorage, type StudySlug } from "../../lib/drishti-pass";

type Props = {
  studySlug: StudySlug;
  studyTitle: string;
};

export function DrishtiStudyBridge({ studySlug, studyTitle }: Props) {
  const [match, setMatch] = useState<ReturnType<typeof findStudyBridgePass>>(null);

  useEffect(() => {
    const load = () => {
      if (typeof localStorage === "undefined") return;
      const passes = migratePasses(readPassesFromStorage(localStorage));
      setMatch(findStudyBridgePass(passes, studySlug));
    };
    load();
    window.addEventListener("drishti:passes-updated", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("drishti:passes-updated", load);
      window.removeEventListener("storage", load);
    };
  }, [studySlug]);

  if (!match) return null;

  const { pass, lens } = match;
  const lensTitle = getLensTitle(lens);

  const openLens = () => {
    const el = document.getElementById(`lens-${lens}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    const summary = el?.querySelector("details summary") as HTMLElement | null;
    summary?.click();
  };

  const applyDrishti = () => {
    window.dispatchEvent(
      new CustomEvent("drishti:open-pass-at-lens", { detail: { lens } })
    );
  };

  return (
    <aside
      className="drishti-study-bridge"
      aria-label="Compare with your Drishti pass"
    >
      <p className="drishti-study-bridge__text">
        You looked at <strong>{pass.phenomenon}</strong> through {lensTitle} —
        compare with this study
      </p>
      <div className="drishti-study-bridge__actions">
        <button type="button" onClick={openLens}>
          See how {studyTitle} handles {lensTitle}
        </button>
        <button type="button" onClick={applyDrishti}>
          Apply Drishti
        </button>
      </div>
    </aside>
  );
}
