import { useMemo, useState } from "react";
import {
  REPLICAS,
  counterValue,
  emptyCounter,
  increment,
  mergeCounters,
  orSetAdd,
  orSetElements,
  orSetMerge,
  type GCounter,
  type ORSet,
} from "../lib/crdt-sim";
import { LabShell, MetricsAside, type LabMetric } from "./lab";
import "./CrdtsLab.css";

export default function CrdtsLab() {
  const [counterA, setCounterA] = useState<GCounter>(() => emptyCounter(REPLICAS));
  const [counterB, setCounterB] = useState<GCounter>(() => emptyCounter(REPLICAS));
  const [orSetA, setOrSetA] = useState<ORSet>(() => new Map());
  const [orSetB, setOrSetB] = useState<ORSet>(() => new Map());

  const mergedCounter = useMemo(() => mergeCounters(counterA, counterB), [counterA, counterB]);
  const mergedSet = useMemo(() => orSetMerge(orSetA, orSetB), [orSetA, orSetB]);

  const incA = () => setCounterA((c) => increment(c, "Node_A"));
  const incB = () => setCounterB((c) => increment(c, "Node_B"));
  const addToA = () => setOrSetA((s) => orSetAdd(s, "tag_a", `item_${orSetElements(s).length + 1}`));
  const addToB = () => setOrSetB((s) => orSetAdd(s, "tag_b", `item_${orSetElements(s).length + 1}`));

  const metrics: LabMetric[] = [
    { id: "ca", label: "Counter A", value: String(counterValue(counterA)) },
    { id: "cb", label: "Counter B", value: String(counterValue(counterB)) },
    { id: "merged", label: "Merged G-Counter", value: String(counterValue(mergedCounter)), tone: "aha" },
    { id: "set", label: "Merged OR-Set", value: orSetElements(mergedSet).join(", ") || "(empty)" },
  ];

  return (
    <LabShell
      intro={
        <>
          CRDTs merge without coordination: G-Counter takes per-replica <strong>max</strong>; OR-Set
          unions tag sets. Concurrent updates converge to the same state.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="crdt-lab__panel">
            <h3>Replica A</h3>
            <button type="button" className="lab__btn" onClick={incA}>
              Increment counter
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={addToA}>
              Add to OR-Set
            </button>
            <p className="lab__hint">Counter: {counterValue(counterA)}</p>
          </div>
          <div className="crdt-lab__panel">
            <h3>Replica B</h3>
            <button type="button" className="lab__btn" onClick={incB}>
              Increment counter
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={addToB}>
              Add to OR-Set
            </button>
            <p className="lab__hint">Counter: {counterValue(counterB)}</p>
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>
      <div className="lab__compare">
        <div>
          <strong>G-Counter merge</strong>
          {counterValue(mergedCounter)} (max per replica)
        </div>
        <div>
          <strong>OR-Set merge</strong>
          [{orSetElements(mergedSet).join(", ")}]
        </div>
      </div>
      <p className="lab__status" role="status" aria-live="polite">
        Merge is commutative — order of updates does not matter.
      </p>
    </LabShell>
  );
}
