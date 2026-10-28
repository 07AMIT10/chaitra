/**
 * The lens readout under the specimen chamber: canonical lens title and
 * question, the frame-indexed projection, an honest absence banner, metrics,
 * the field-note prompt, and the frame stepper with `Step n / total`.
 * All content comes from the projection and the canonical lens data;
 * nothing is invented here.
 */
import type { LensReadoutProps } from "./ui-types";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";
import { frameLabel } from "../../observatory/format";
import type { Metric } from "../../observatory/types";

export function LensReadout({
  lens,
  projection,
  frameIndex,
  frameCount,
  onPrev,
  onNext,
}: LensReadoutProps) {
  const copy = LENS_BY_SLUG[lens];
  const title = copy?.title ?? lens;
  const glyph = copy?.glyph ?? "•";
  const lastFrame = Math.max(0, frameCount - 1);

  return (
    <section className="obs-panel obs-readout" aria-label={`${title} readout`}>
      <header className="obs-readout-head">
        <span className="obs-readout-glyph" aria-hidden="true">
          {glyph}
        </span>
        <div className="obs-readout-id">
          <h2 className="obs-readout-title">{title}</h2>
          <p className="obs-readout-question">{copy?.question ?? ""}</p>
        </div>
        <div className="obs-readout-frames" role="group" aria-label="Frames">
          <button
            type="button"
            className="obs-button obs-button--ghost"
            aria-label="Previous frame"
            disabled={frameIndex <= 0 || frameCount === 0}
            onClick={onPrev}
          >
            ‹
          </button>
          <span className="obs-mono obs-readout-step">
            {frameLabel(frameIndex, frameCount)}
          </span>
          <button
            type="button"
            className="obs-button obs-button--ghost"
            aria-label="Next frame"
            disabled={frameIndex >= lastFrame || frameCount === 0}
            onClick={onNext}
          >
            ›
          </button>
        </div>
      </header>

      {projection.available ? null : (
        <p className="obs-absence" role="note">
          <strong>Not available for this specimen.</strong>{" "}
          {projection.absenceReason ??
            "This specimen has no mechanism for this lens."}
        </p>
      )}

      <p className="obs-readout-text">{projection.readout}</p>

      {projection.metrics.length > 0 && (
        <dl className="obs-metrics">
          {projection.metrics.map((metric: Metric, index: number) => (
            <div
              key={`${metric.label}-${index}`}
              className={
                metric.tone === undefined
                  ? "obs-metric"
                  : `obs-metric obs-metric--${metric.tone}`
              }
            >
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="obs-note-prompt">
        <span className="obs-panel-title-text">Field-note prompt</span>{" "}
        {projection.notePrompt}
      </p>
    </section>
  );
}
