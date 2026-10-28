import type { VoiceTone } from "../../game/ship-voice";

import "../../styles/game-voice.css";

type Props = {
  line: string;
  speaker?: string;
  tone?: string;
  /**
   * Opt into role="status" only when this is the single live announcement for
   * the event. The game already has live regions for the log, faults, and the
   * win card; announcing here as well would repeat the line.
   */
  announce?: boolean;
};

const TONES: readonly VoiceTone[] = ["calm", "strained", "open"];

function safeTone(tone: string | undefined): VoiceTone {
  return TONES.includes(tone as VoiceTone) ? (tone as VoiceTone) : "calm";
}

/**
 * A compact ship-voice strip for the HUD, the log rail, or the win card.
 * Static by design: no typewriter, no idle motion, no per-line animation.
 */
export default function ShipVoice({
  line,
  speaker = "SABLE",
  tone,
  announce = false,
}: Props) {
  if (line.trim().length === 0) return null;

  const register = safeTone(tone);

  return (
    <div className={`ship-voice is-${register}`} role={announce ? "status" : undefined}>
      <p className="ship-voice__speaker">
        <span className="ship-voice__lamp" aria-hidden="true" />
        {speaker}
      </p>
      <p className="ship-voice__line">{line}</p>
    </div>
  );
}
