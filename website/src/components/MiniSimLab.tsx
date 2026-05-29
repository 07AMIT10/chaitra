import type { ReactNode } from "react";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import type { MiniSimControl } from "../lib/sketches/types";

export type MiniSimLabProps = {
  intro: ReactNode;
  controls: MiniSimControl[];
  onControlChange: (id: string, value: number) => void;
  metrics: LabMetric[];
  status: string;
  children: ReactNode;
};

/** Tier B shared wrapper — sliders + viz + metrics */
export default function MiniSimLab({
  intro,
  controls,
  onControlChange,
  metrics,
  status,
  children,
}: MiniSimLabProps) {
  return (
    <LabShell intro={intro}>
      <div className="lab__grid">
        <div>
          {controls.map((c) => (
            <RangeControl
              key={c.id}
              id={c.id}
              label={c.label}
              min={c.min}
              max={c.max}
              step={c.step}
              value={c.value}
              valueText={c.valueText}
              onChange={(v) => onControlChange(c.id, v)}
            />
          ))}
          {children}
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        {status}
      </p>
    </LabShell>
  );
}
