import { useMemo, useState } from "react";
import MiniSimLab from "../MiniSimLab";
import { mapReduceProgress } from "../../lib/minisim";
import type { LabMetric } from "../lab";
import "./minisim.css";

export default function MapReduceLab() {
  const [tasks, setTasks] = useState(4);
  const [failTask, setFailTask] = useState(2);
  const [withFailure, setWithFailure] = useState(true);
  const progress = useMemo(
    () => mapReduceProgress(tasks, withFailure ? failTask : null),
    [tasks, failTask, withFailure]
  );

  const metrics: LabMetric[] = [
    { id: "tasks", label: "Map tasks", value: String(tasks) },
    { id: "steps", label: "Timeline steps", value: String(progress.length) },
    { id: "fail", label: "Straggler", value: withFailure ? `task ${failTask}` : "none" },
  ];

  return (
    <MiniSimLab
      intro={<>Map → shuffle → reduce timeline. Kill a worker mid-shuffle to see retry gap.</>}
      controls={[
        { id: "t", label: "Map tasks", min: 2, max: 8, value: tasks, valueText: `${tasks} tasks` },
        { id: "f", label: "Failed task index", min: 0, max: tasks - 1, value: failTask, valueText: `task ${failTask}` },
      ]}
      onControlChange={(id, v) => (id === "t" ? setTasks(v) : setFailTask(v))}
      metrics={metrics}
      status={`${tasks} map tasks${withFailure ? `; task ${failTask} fails during shuffle` : ""}.`}
    >
      <div className="lab__row">
        <button type="button" className={`lab__btn ${withFailure ? "" : "lab__btn--ghost"}`} onClick={() => setWithFailure(true)}>Simulate failure</button>
        <button type="button" className={`lab__btn ${!withFailure ? "" : "lab__btn--ghost"}`} onClick={() => setWithFailure(false)}>No failure</button>
      </div>
      <div className="minisim__line" role="img" aria-label="Job progress">
        {progress.map((p, i) => (
          <div key={i} className="minisim__tick" style={{ height: `${p * 100}%` }} title={`step ${i + 1}`} />
        ))}
      </div>
    </MiniSimLab>
  );
}
