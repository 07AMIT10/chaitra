/**
 * The run rail: Run, step back/forward, reset, a frame scrubber with
 * `Step n / total`, the outcome line, diagnostics, and the Keep-branch
 * action. Keep is always present; Save-as-bench follows its capability flag.
 * No timer, no score.
 */
import type { RunRailProps } from "./ui-types";
import type { RunOutcome } from "../../observatory/types";
import { frameLabel } from "../../observatory/format";
const OUTCOME_COPY: Record<RunOutcome, string> = {
  done: "Trace complete.",
  "max-steps": "Stopped at the frame cap; the trace is still inspectable.",
  cycle: "The trace ended on a cycle.",
  invalid: "No valid trace produced.",
};

export function RunRail({
  frameIndex,
  frameCount,
  outcome,
  diagnostics,
  dirty,
  hasRun,
  canSaveBench,
  onRun,
  onStep,
  onScrub,
  onReset,
  onKeep,
  onSaveBench,
}: RunRailProps) {
  const lastFrame = Math.max(0, frameCount - 1);
  const canStepBack = frameCount > 0 && frameIndex > 0;
  const canStepForward = frameCount > 0 && frameIndex < lastFrame;

  return (
    <section className="obs-panel obs-runrail" aria-label="Run controls">
      <h2 className="obs-panel-title">Run</h2>

      <div className="obs-runrail-actions" role="group" aria-label="Run actions">
        <button type="button" className="obs-button obs-button--accent" onClick={onRun}>
          Run
        </button>
        <button
          type="button"
          className="obs-button obs-button--ghost"
          aria-label="Step back one frame"
          disabled={!canStepBack}
          onClick={() => onStep(-1)}
        >
          ◀ Step back
        </button>
        <button
          type="button"
          className="obs-button obs-button--ghost"
          aria-label="Step forward one frame"
          disabled={!canStepForward}
          onClick={() => onStep(1)}
        >
          Step forward ▶
        </button>
        <button type="button" className="obs-button obs-button--ghost" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="obs-scrubber-row">
        <label className="obs-scrubber-label" htmlFor="obs-frame-scrubber">
          Frame
        </label>
        <input
          id="obs-frame-scrubber"
          className="obs-scrubber"
          type="range"
          min={0}
          max={lastFrame}
          value={Math.min(frameIndex, lastFrame)}
          disabled={frameCount === 0}
          aria-valuetext={frameLabel(frameIndex, frameCount)}
          onChange={(event) => onScrub(Number(event.target.value))}
        />
        <span className="obs-mono obs-scrubber-step">
          {frameLabel(frameIndex, frameCount)}
        </span>
      </div>

      <p className="obs-runrail-status">
        {!hasRun
          ? "No trace yet — choose Run to compute one."
          : dirty
            ? "The scenario changed after this trace; run again to recompute."
            : `Outcome: ${outcome} — ${OUTCOME_COPY[outcome as RunOutcome]}`}
      </p>

      {diagnostics.length > 0 && (
        <div className="obs-rejection" role="alert">
          <p>
            <strong>Diagnostics.</strong>
          </p>
          <ul className="obs-diagnostics">
            {diagnostics.map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${index}`}>
                <span className="obs-mono">{diagnostic.code}</span>
                <span className="obs-mono obs-diagnostics-path">
                  {diagnostic.path}
                </span>
                <span>{diagnostic.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="obs-runrail-keep">
        <button type="button" className="obs-button obs-button--accent" onClick={onKeep}>
          Keep branch
        </button>
        <button
          type="button"
          className="obs-button"
          disabled={!canSaveBench}
          onClick={onSaveBench}
        >
          Save as bench
        </button>
      </div>
    </section>
  );
}
