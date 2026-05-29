import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { schedulingHistogram } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function ProbSchedulingLab() {
  const [tasks, setTasks] = useState(100);
  const [workers, setWorkers] = useState(5);
  const loads = useMemo(() => schedulingHistogram(tasks, workers), [tasks, workers]);
  const maxLoad = Math.max(...loads);

  const metrics: LabMetric[] = [
    { id: "tasks", label: "Tasks", value: String(tasks) },
    { id: "workers", label: "Workers", value: String(workers) },
    { id: "max", label: "Max load", value: String(maxLoad) },
    { id: "avg", label: "Avg load", value: (tasks / workers).toFixed(1) },
  ];

  return (
    <MiniSimLab
      intro={<>Random task placement histogram vs uniform expectation.</>}
      controls={[
        { id: "t", label: "Tasks", min: 20, max: 300, step: 10, value: tasks, valueText: `${tasks} tasks` },
        { id: "w", label: "Workers", min: 2, max: 10, value: workers, valueText: `${workers} workers` },
      ]}
      onControlChange={(id, v) => (id === "t" ? setTasks(v) : setWorkers(v))}
      metrics={metrics}
      status={`Max load ${maxLoad} vs expected ${(tasks / workers).toFixed(1)}.`}
    >
      <div className="minisim__bars" role="img" aria-label="Worker loads">
        {loads.map((l, i) => (
          <div key={i} className="minisim__bar" style={{ height: `${(l / maxLoad) * 100}%` }} title={`Worker ${i}: ${l}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
