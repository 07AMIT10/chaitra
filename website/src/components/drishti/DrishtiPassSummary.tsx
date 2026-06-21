import { useState } from "react";
import hints from "../../data/drishti/pass-hints.json";
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import { generateLetter, generateMirror } from "../../lib/drishti-mirror";
import {
  detectGaps,
  lensNoteForSummary,
  NOW_SENTENCE_MAX,
  type DrishtiPassState,
  type LensSlug,
} from "../../lib/drishti-pass";

type HintEntry = {
  microExample: string;
  deepPrompts: string[];
  gapNudge?: string;
  letterAudience?: string;
};

type Props = {
  pass: DrishtiPassState;
  onInsightChange: (insight: string) => void;
  onNowSentenceChange?: (value: string) => void;
  onMirrorConfirmed?: (confirmed: boolean) => void;
  onCopy: () => void;
  onNewPass: () => void;
  onDone: () => void;
  storageWarning?: string | null;
};

export function DrishtiPassSummary({
  pass,
  onInsightChange,
  onNowSentenceChange,
  onMirrorConfirmed,
  onCopy,
  onNewPass,
  onDone,
  storageWarning,
}: Props) {
  const [showInsightEdit, setShowInsightEdit] = useState(false);
  const { mirrorText } = generateMirror(pass);
  const letter = pass.letter ?? generateLetter(pass);
  const gaps = detectGaps(pass).slice(0, 2);

  return (
    <div className="drishti-mirror-room" data-depth={pass.depth}>
      <header>
        <h2 id="drishti-mirror-title">{pass.phenomenon}</h2>
        {pass.context && (
          <p className="drishti-mirror-room__context">{pass.context}</p>
        )}
      </header>

      <section
        className="drishti-mirror-before-after"
        aria-labelledby="drishti-mirror-before-after-heading"
      >
        <h3 id="drishti-mirror-before-after-heading">Before → After</h3>
        <div className="drishti-mirror-before-after__grid">
          <div className="drishti-mirror-before-after__col drishti-mirror-before-after__col--before">
            <p className="drishti-mirror-before-after__label">Before</p>
            <p>
              {pass.phenomenon}
              {pass.context ? ` — ${pass.context}` : ""}
            </p>
          </div>
          <p className="drishti-mirror-before-after__connector" aria-hidden="true">
            →
          </p>
          <div className="drishti-mirror-before-after__col drishti-mirror-before-after__col--after">
            <p className="drishti-mirror-before-after__label">After</p>
            {pass.nowSentence?.trim() ? (
              <p>{pass.nowSentence}</p>
            ) : (
              <p className="drishti-mirror-before-after__placeholder">
                You finished the pass — add one sentence when you&apos;re ready.
              </p>
            )}
            <label htmlFor="drishti-now-sentence">
              <span className="visually-hidden">How you see it now</span>
              <textarea
                id="drishti-now-sentence"
                value={pass.nowSentence ?? ""}
                maxLength={NOW_SENTENCE_MAX}
                rows={2}
                placeholder={`In one sentence, how do you see ${pass.phenomenon} differently now?`}
                onChange={(e) => onNowSentenceChange?.(e.target.value)}
              />
            </label>
          </div>
        </div>
      </section>

      <section
        className="drishti-mirror-gaps"
        aria-labelledby="drishti-mirror-gaps-heading"
      >
        <h3 id="drishti-mirror-gaps-heading">Open lenses</h3>
        {gaps.length === 0 ? (
          <p className="drishti-mirror-gaps__all">
            You engaged with all seven lenses.
          </p>
        ) : (
          <>
            <p className="drishti-mirror-gaps__intro">
              You didn&apos;t have to know everything. These lenses stayed open —
              that&apos;s useful information.
            </p>
            <ul className="drishti-mirror-gaps__list">
              {gaps.map((slug) => {
                const lens = DRISHTI_LENSES.find((l) => l.slug === slug)!;
                const note = lensNoteForSummary(pass, slug);
                const hint = (hints as Record<string, HintEntry>)[slug];
                return (
                  <li key={slug} className="drishti-mirror-gaps__card">
                    <p className="drishti-mirror-gaps__lens">
                      {lens.glyph} {lens.title}
                    </p>
                    <p className="drishti-mirror-gaps__note">
                      {note?.trim() || "left blank"}
                    </p>
                    {hint?.gapNudge && (
                      <p className="drishti-mirror-gaps__nudge">{hint.gapNudge}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section
        className="drishti-mirror-letter"
        aria-labelledby="drishti-mirror-letter-heading"
      >
        <h3 id="drishti-mirror-letter-heading">Letter</h3>
        <div className="drishti-mirror-letter__body">
          {letter.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section
        className="drishti-mirror-reflection"
        aria-labelledby="drishti-mirror-reflection-heading"
      >
        <h3 id="drishti-mirror-reflection-heading">Mirror</h3>
        <p>{mirrorText}</p>
      </section>

      <section
        className="drishti-mirror-confirm"
        aria-labelledby="drishti-mirror-confirm-heading"
      >
        <h3 id="drishti-mirror-confirm-heading">
          Does this reflect what shifted for you?
        </h3>
        <div className="drishti-mirror-confirm__actions">
          <button
            type="button"
            onClick={() => {
              onMirrorConfirmed?.(true);
              if (!pass.insight?.trim() && pass.nowSentence?.trim()) {
                onInsightChange(pass.nowSentence.trim());
              }
            }}
          >
            Yes, that&apos;s it
          </button>
          <button type="button" onClick={() => setShowInsightEdit(true)}>
            Close, but not quite
          </button>
          <button type="button" onClick={() => onMirrorConfirmed?.(false)}>
            Skip
          </button>
        </div>
        {(showInsightEdit || pass.insight) && (
          <label htmlFor="drishti-insight">
            What shifted?
            <textarea
              id="drishti-insight"
              value={pass.insight ?? ""}
              maxLength={400}
              rows={3}
              onChange={(e) => onInsightChange(e.target.value)}
            />
          </label>
        )}
      </section>

      <details className="drishti-mirror-receipt">
        <summary>Full pass notes</summary>
        <ul className="drishti-mirror-receipt__notes">
          {DRISHTI_LENSES.map((lens) => {
            const slug = lens.slug as LensSlug;
            const text = lensNoteForSummary(pass, slug);
            return (
              <li key={slug} className="drishti-mirror-receipt__row">
                <p className="drishti-mirror-receipt__lens">
                  <span className="drishti-mirror-receipt__glyph" aria-hidden="true">
                    {lens.glyph}
                  </span>
                  <span className="drishti-mirror-receipt__label">{lens.title}</span>
                </p>
                <p className="drishti-mirror-receipt__note">{text || "—"}</p>
              </li>
            );
          })}
        </ul>
      </details>

      {storageWarning && (
        <p className="drishti-mirror-room__warning" role="status">
          {storageWarning}
        </p>
      )}

      <div className="drishti-mirror-room__actions">
        <button type="button" onClick={onCopy}>
          Copy pass
        </button>
        <button type="button" onClick={onNewPass}>
          New pass
        </button>
        <button type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
