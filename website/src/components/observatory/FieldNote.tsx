/**
 * The field note: branch title, an 800-character note with a live count, the
 * active lens prompt, and a saved indicator. Neutral copy only — there is no
 * shaming language here.
 */
import type { FieldNoteProps } from "./ui-types";
import { LIMITS } from "../../observatory/storage";

export function FieldNote({
  title,
  note,
  prompt,
  saved,
  onChangeTitle,
  onChangeNote,
}: FieldNoteProps) {
  return (
    <section className="obs-panel obs-fieldnote" aria-label="Field note">
      <h2 className="obs-panel-title">Field note</h2>

      <label className="obs-field">
        <span>Branch title</span>
        <input
          type="text"
          value={title}
          onChange={(event) => onChangeTitle(event.target.value)}
        />
      </label>

      <label className="obs-field">
        <span className="obs-field-label-row">
          Note
          <span className="obs-note-count obs-mono">
            {note.length} / {LIMITS.noteChars}
          </span>
        </span>
        <textarea
          rows={6}
          value={note}
          maxLength={LIMITS.noteChars}
          onChange={(event) => onChangeNote(event.target.value)}
        />
      </label>

      <p className="obs-note-prompt">
        <span className="obs-panel-title-text">Lens prompt</span> {prompt}
      </p>

      <p className="obs-note-saved" aria-live="polite">
        {saved ? "✓ Saved" : "Kept in the working draft"}
      </p>
    </section>
  );
}
