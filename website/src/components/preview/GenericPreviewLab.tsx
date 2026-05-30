import { useState } from "react";
import { LabShell, MetricsAside, PredictReveal, RangeControl, type LabMetric } from "../lab";
import { PREVIEW_LAB_CONFIG } from "./preview-lab-config";

type Props = { slug: string };

export default function GenericPreviewLab({ slug }: Props) {
  const config = PREVIEW_LAB_CONFIG[slug];
  if (!config) {
    return <p>Preview lab not configured for {slug}.</p>;
  }

  const [value, setValue] = useState(config.defaultValue);

  const metrics: LabMetric[] = [
    { id: "metric", label: config.metricLabel, value: config.formatMetric(value) },
  ];

  return (
    <LabShell intro={<>Explore how {config.sliderLabel.toLowerCase()} affects system behavior.</>}>
      <div className="lab__grid">
        <div>
          <RangeControl
            id={`preview-${slug}`}
            label={config.sliderLabel}
            min={config.sliderMin}
            max={config.sliderMax}
            step={config.sliderStep}
            value={value}
            valueText={config.formatMetric(value)}
            onChange={setValue}
          />
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <PredictReveal prompt={config.question} options={config.options} storageKey={config.storageKey}>
        <p className="lab__status">At this setting: {config.formatMetric(value)}.</p>
      </PredictReveal>
    </LabShell>
  );
}
