import { useRef, useState } from "react";
import hints from "../../data/drishti/pass-hints.json";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";
import {
  isGapNote,
  LIGHT_NOTE_MAX,
  DEEP_NOTE_MAX,
  type LensSlug,
  type StudySlug,
} from "../../lib/drishti-pass";
import { StudyExcerptAccordion } from "./StudyExcerptAccordion";

const IDK_WHISPER = "Not knowing is data — you can leave this and return later.";
const WHISPER_MS = 2000;

type HintEntry = { microExample: string; deepPrompts: string[] };

type Props = {
  lensSlug: LensSlug;
  mode: "light" | "deep";
  lightNote?: string;
  deepNote?: string;
  preferredStudy?: StudySlug;
  onLightChange?: (value: string) => void;
  onDeepChange?: (value: string) => void;
};

export function DrishtiPassStep({
  lensSlug,
  mode,
  lightNote = "",
  deepNote = "",
  preferredStudy,
  onLightChange,
  onDeepChange,
}: Props) {
  const lens = LENS_BY_SLUG[lensSlug];
  const hint = (hints as Record<string, HintEntry>)[lensSlug];
  const [whisper, setWhisper] = useState(false);
  const whisperTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNoteBlur = (value: string) => {
    if (!isGapNote(value)) {
      setWhisper(false);
      return;
    }
    setWhisper(true);
    if (whisperTimer.current) clearTimeout(whisperTimer.current);
    whisperTimer.current = setTimeout(() => setWhisper(false), WHISPER_MS);
  };

  const handleNoteChange = (value: string, onChange: (v: string) => void) => {
    setWhisper(false);
    onChange(value);
  };

  if (!lens) return null;

  const textareaId = `drishti-pass-note-${lensSlug}-${mode}`;

  return (
    <div className="drishti-pass-step" data-lens={lensSlug}>
      <p className="drishti-pass-step__glyph" aria-hidden="true">
        {lens.glyph}
      </p>
      <h2 className="drishti-pass-step__question">{lens.question}</h2>
      <p className="drishti-pass-step__hook">{lens.hook}</p>

      {hint?.microExample && (
        <p className="drishti-pass-step__hint">
          <span className="drishti-pass-step__hint-label">Example: </span>
          {hint.microExample}
        </p>
      )}

      {mode === "light" && onLightChange && (
        <label className="drishti-pass-step__field" htmlFor={textareaId}>
          Your note
          <textarea
            id={textareaId}
            value={lightNote}
            maxLength={LIGHT_NOTE_MAX}
            rows={4}
            onChange={(e) => handleNoteChange(e.target.value, onLightChange)}
            onBlur={(e) => handleNoteBlur(e.target.value)}
            aria-describedby={`${textareaId}-count`}
          />
          <span id={`${textareaId}-count`} className="drishti-pass-step__count">
            {lightNote.length}/{LIGHT_NOTE_MAX}
          </span>
        </label>
      )}

      {mode === "deep" && (
        <>
          {lightNote && (
            <details className="drishti-pass-step__light-readonly">
              <summary>Light pass note</summary>
              <p>{lightNote}</p>
            </details>
          )}
          {hint?.deepPrompts && (
            <ul className="drishti-pass-step__prompts">
              {hint.deepPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          )}
          {onDeepChange && (
            <label className="drishti-pass-step__field" htmlFor={textareaId}>
              Go deeper
              <textarea
                id={textareaId}
                value={deepNote}
                maxLength={DEEP_NOTE_MAX}
                rows={6}
                onChange={(e) => handleNoteChange(e.target.value, onDeepChange)}
                onBlur={(e) => handleNoteBlur(e.target.value)}
                aria-describedby={`${textareaId}-count`}
              />
              <span id={`${textareaId}-count`} className="drishti-pass-step__count">
                {deepNote.length}/{DEEP_NOTE_MAX}
              </span>
            </label>
          )}
        </>
      )}

      {whisper && (
        <p className="drishti-pass-step__idk-whisper" role="status">
          {IDK_WHISPER}
        </p>
      )}

      <StudyExcerptAccordion lensSlug={lensSlug} preferredStudy={preferredStudy} />
    </div>
  );
}
