import type { BoardView, Status } from "../../game/types";

export type TelemetryStatus = Status | "note" | "standby";

type Props = {
  moves: number;
  hints?: number;
  hintsTotal?: number;
  status: TelemetryStatus;
  kind?: BoardView["kind"];
  /** The board's own caption: the only structured readout the level contract returns. */
  caption?: string;
};

const STATUS_LABEL: Record<TelemetryStatus, string> = {
  playing: "REPAIRING",
  won: "ONLINE",
  lost: "LOST",
  note: "NOTE",
  standby: "STANDBY",
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * A strip of honest readouts below the schematic. Every value is produced by
 * the session or the board caption; no score, budget, or count is invented.
 */
export default function GameTelemetry({
  moves,
  hints,
  hintsTotal,
  status,
  kind,
  caption,
}: Props) {
  return (
    <section
      className={`game-telemetry game-telemetry--${status}`}
      aria-label="Repair telemetry"
    >
      <div className="game-telemetry__head">
        <p className="game-telemetry__label">TELEMETRY</p>
        <span className="game-telemetry__rule" aria-hidden="true" />
      </div>

      <dl className="game-telemetry__grid">
        <div className="game-telemetry__readout">
          <dt>Moves</dt>
          <dd>{pad(moves)}</dd>
        </div>
        <div className={`game-telemetry__readout game-telemetry__readout--status is-${status}`}>
          <dt>System</dt>
          <dd>
            <span className="game-telemetry__lamp" aria-hidden="true" />
            {STATUS_LABEL[status]}
          </dd>
        </div>
        <div className="game-telemetry__readout">
          <dt>Board</dt>
          <dd>{kind ? kind.toUpperCase() : "—"}</dd>
        </div>
      </dl>

      {caption != null && (
        <p className="game-telemetry__caption">
          <span className="game-telemetry__caption-mark" aria-hidden="true">▸</span>
          <span>{caption}</span>
        </p>
      )}
    </section>
  );
}
