import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { redDropProb } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function REDLab() {
  const [fill, setFill] = useState(70);
  const [minT, setMinT] = useState(20);
  const [maxT, setMaxT] = useState(90);
  const dropP = useMemo(() => redDropProb(fill / 100, minT / 100, maxT / 100), [fill, minT, maxT]);

  const metrics: LabMetric[] = [
    { id: "fill", label: "Queue fill", value: `${fill}%` },
    { id: "drop", label: "Drop probability", value: `${(dropP * 100).toFixed(0)}%`, tone: dropP > 0.5 ? "warn" : "default" },
  ];

  return (
    <MiniSimLab
      intro={<>Random Early Detection: drop probability rises linearly between min and max thresholds.</>}
      controls={[
        { id: "f", label: "Queue fill %", min: 0, max: 100, value: fill, valueText: `${fill}% full` },
        { id: "min", label: "Min threshold", min: 10, max: 50, value: minT, valueText: `${minT}%` },
        { id: "max", label: "Max threshold", min: 60, max: 100, value: maxT, valueText: `${maxT}%` },
      ]}
      onControlChange={(id, v) => (id === "f" ? setFill(v) : id === "min" ? setMinT(v) : setMaxT(v))}
      metrics={metrics}
      status={`At ${fill}% fill, drop probability is ${(dropP * 100).toFixed(0)}%.`}
    >
      <div className="minisim__bars" role="img" aria-label="RED drop probability">
        <div className="minisim__bar" style={{ height: `${dropP * 100}%`, background: dropP > 0.5 ? "#ef4444" : undefined }} />
      </div>
    </MiniSimLab>
  );
}
