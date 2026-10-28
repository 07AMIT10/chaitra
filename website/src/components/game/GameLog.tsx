import type { GameEvent } from "../../game/types";
import type { TelemetryStatus } from "./GameTelemetry";

type Props = {
  events: GameEvent[];
  status: TelemetryStatus;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The right rail: the ship's running account of accepted and rejected moves.
 * The engine keeps the last eight events, so this is a session record rather
 * than an archive.
 */
export default function GameLog({ events, status }: Props) {
  return (
    <aside className={`game-log is-${status}`} aria-label="Ship log">
      <header className="game-log__head">
        <p className="game-log__title">SHIP LOG</p>
        <span className="game-log__lamp" aria-hidden="true" />
        <span className="game-log__count" aria-label={`${events.length} log entries`}>
          {pad(events.length)}
        </span>
      </header>

      <p className="game-log__sub">SESSION RECORD</p>

      <div className="game-log__lines" role="log" aria-live="polite" aria-relevant="additions">
        {events.length === 0 ? (
          <p className="game-log__line game-log__line--idle">Console idle. Make the first move.</p>
        ) : (
          events.map((event, i) => (
            <p
              key={i}
              className={`game-log__line${event.kind ? ` game-log__line--${event.kind}` : ""}`}
            >
              <span className="game-log__tick" aria-hidden="true" />
              {event.text}
            </p>
          ))
        )}
      </div>

      <p className="game-log__foot" aria-hidden="true">
        <span className="game-log__foot-rule" />
        <span>LOCAL · SESSION ONLY</span>
      </p>
    </aside>
  );
}
