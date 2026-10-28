import { useEffect, useRef } from "react";

import type { Session } from "../../game/engine";
import type { ParkRecord } from "../../game/park";
import type { LevelMeta } from "../../game/types";

export type ResumeParkCardProps = {
  record: ParkRecord;
  session: Session;
  meta: LevelMeta;
  nextMoveLabel?: string | null;
  onResume: () => void;
  onStartFresh: () => void;
};

export default function ResumeParkCard({
  record,
  session: _session,
  meta,
  nextMoveLabel,
  onResume,
  onStartFresh,
}: ResumeParkCardProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="game-recap game-resume-park"
      data-resume-card
      aria-labelledby="resume-park-title"
    >
      <div className="game-recap__content">
        <h2 id="resume-park-title" ref={headingRef} tabIndex={-1} className="game-recap__title">
          REPAIR {meta.number} · {meta.title}
        </h2>
        <div className="game-recap__body">
          <p>
            Last move: <b>{record.lastMove?.label ?? "No move recorded"}</b>
          </p>
          <p>
            THE INVARIANT: <b>{meta.invariant}</b>
          </p>
          {nextMoveLabel && (
            <p>
              Next: <b>{nextMoveLabel}</b>
            </p>
          )}
        </div>
        <div className="game-recap__actions">
          <button type="button" className="game-btn game-btn--primary" onClick={onResume}>
            RESUME
          </button>
          <button type="button" className="game-btn" onClick={onStartFresh}>
            START FRESH
          </button>
        </div>
      </div>
    </section>
  );
}
