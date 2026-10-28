import { useEffect, useRef } from "react";

import type { ParkRecord } from "../../game/park";

export type ParkConflictCardProps = {
  record: ParkRecord;
  parkedTitle: string;
  currentTitle: string;
  onResumeParked: () => void;
  onReplace: () => void;
  onMap: () => void;
};

export default function ParkConflictCard({
  record: _record,
  parkedTitle,
  currentTitle,
  onResumeParked,
  onReplace,
  onMap,
}: ParkConflictCardProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="game-conflict game-park-conflict"
      data-conflict-card
      aria-labelledby="conflict-card-title"
    >
      <div className="game-conflict__content">
        <h2 id="conflict-card-title" ref={headingRef} tabIndex={-1} className="game-conflict__title">
          Different repair parked
        </h2>
        <p className="game-conflict__desc">
          You have an active parked repair for <b>{parkedTitle}</b>, but you are attempting to open <b>{currentTitle}</b>. Choose an action below.
        </p>
        <div className="game-conflict__actions">
          <button type="button" className="game-btn game-btn--primary" onClick={onResumeParked}>
            RESUME PARKED
          </button>
          <button type="button" className="game-btn" onClick={onReplace}>
            REPLACE
          </button>
          <button type="button" className="game-btn" onClick={onMap}>
            MISSION MAP
          </button>
        </div>
      </div>
    </section>
  );
}
