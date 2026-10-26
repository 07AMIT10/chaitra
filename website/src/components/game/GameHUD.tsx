import type { LevelMeta } from "../../game/types";
import SoundToggle from "./SoundToggle";

type Props = {
  meta: LevelMeta;
  actName: string;
  repaired: number;
  total: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The persistent console masthead. It is deliberately a full instrument band,
 * not a breadcrumb: mission, deck, campaign progress, audio, and the way back
 * to the map all stay in one place for the whole repair.
 */
export default function GameHUD({
  meta,
  actName,
  repaired,
  total,
  soundEnabled,
  onToggleSound,
}: Props) {
  return (
    <header className="game-hud">
      <a className="game-hud__brand" href="/algorithms/game" aria-label="The Long Repair — open the mission map">
        <span className="game-hud__mark" aria-hidden="true">
          <svg viewBox="0 0 40 40" focusable="false">
            <path d="M20 3.5 34.3 11.7v16.6L20 36.5 5.7 28.3V11.7Z" />
            <path d="M20 9.5v21M9.5 15.7l21 8.6M30.5 15.7l-21 8.6" />
            <circle cx="20" cy="20" r="4.2" />
            <path d="M20 2v4M20 34v4M4.5 12l3.5 2M32 26l3.5 2M4.5 28l3.5-2M32 14l3.5-2" />
          </svg>
        </span>
        <span className="game-hud__name">
          <span className="game-hud__title">THE LONG REPAIR</span>
          <span className="game-hud__sub">SALVAGE CONSOLE</span>
        </span>
      </a>

      <div className="game-hud__instruments">
        <div className="game-hud__cell">
          <span className="game-hud__label">MISSION</span>
          <span className="game-hud__value game-hud__value--id">
            <b>{pad(meta.number)}</b>
            <span className="game-hud__slash">/</span>
            <span>{pad(total)}</span>
          </span>
        </div>

        <div className="game-hud__cell">
          <span className="game-hud__label">DECK</span>
          <span className="game-hud__value">
            <b>{meta.act}</b>
            <span className="game-hud__dot" aria-hidden="true">·</span>
            <span>{actName.toUpperCase()}</span>
          </span>
        </div>

        <div className="game-hud__cell game-hud__cell--systems">
          <span className="game-hud__label">SYSTEMS</span>
          <span className="game-hud__value">
            <b>{pad(repaired)}</b>
            <span className="game-hud__slash">/</span>
            <span>{pad(total)}</span>
          </span>
          <span
            className="game-hud__meter"
            aria-hidden="true"
          >
            {Array.from({ length: Math.max(total, 1) }, (_, i) => (
              <span key={i} className={i < repaired ? "is-up" : undefined} />
            ))}
          </span>
        </div>
      </div>

      <div className="game-hud__controls">
        <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
        <a className="game-hud__map" href="/algorithms/game" aria-label="Open the mission map">
          <span className="game-hud__map-icon" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          MAP
        </a>
      </div>
    </header>
  );
}
