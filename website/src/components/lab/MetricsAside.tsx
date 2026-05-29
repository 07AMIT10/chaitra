import type { ReactNode } from "react";

export type LabMetric = {
  id: string;
  label: string;
  value: ReactNode;
  tone?: "default" | "warn" | "aha";
};

type MetricsAsideProps = {
  metrics: LabMetric[];
  ariaLabel?: string;
};

/** Live metrics column (`<dl>`) with optional warn/aha emphasis. */
export function MetricsAside({ metrics, ariaLabel = "Live metrics" }: MetricsAsideProps) {
  return (
    <aside className="lab__metrics" aria-label={ariaLabel}>
      {metrics.map((m) => (
        <dl
          key={m.id}
          className={
            m.tone === "warn"
              ? "lab__metric lab__metric--warn"
              : m.tone === "aha"
                ? "lab__metric lab__metric--aha"
                : "lab__metric"
          }
        >
          <dt>{m.label}</dt>
          <dd>{m.value}</dd>
        </dl>
      ))}
    </aside>
  );
}
