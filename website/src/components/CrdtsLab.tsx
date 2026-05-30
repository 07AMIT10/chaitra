import { useMemo, useState } from "react";
import { falsePositiveRate, formatReplicaVector, tombstoneMemoryBytes } from "../lib/crdt-math";
import {
  PROB_BLOOM_K,
  PROB_BLOOM_M,
  REPLICAS,
  counterValue,
  emptyCounter,
  emptyProbState,
  increment,
  lwwMerge,
  mergeCounters,
  naiveSumMerge,
  orSetElements,
  orSetAdd,
  presetCompactionStaleAdd,
  presetConcurrentIncrements,
  presetLwwConflict,
  presetPartitionHeal,
  probCompact,
  probDelete,
  probTryAdd,
  type GCounter,
  type LWWRegister,
  type ProbCompactionState,
} from "../lib/crdt-sim";
import {
  ComparePanel,
  LabShell,
  LabTabPanel,
  LabTabs,
  MetricsAside,
  PredictReveal,
  ScenarioPresets,
  type LabMetric,
  type LabTab,
} from "./lab";
import "./CrdtsLab.css";

type LabMode = "counter" | "tombstone";

const MODE_TABS: LabTab[] = [
  {
    id: "counter",
    label: "G-Counter lattice",
    panelId: "crdt-panel-counter",
    tabId: "crdt-tab-counter",
  },
  {
    id: "tombstone",
    label: "Prob. tombstones",
    panelId: "crdt-panel-tombstone",
    tabId: "crdt-tab-tombstone",
  },
];

export default function CrdtsLab() {
  const [mode, setMode] = useState<LabMode>("counter");
  const [counterA, setCounterA] = useState<GCounter>(() => emptyCounter([...REPLICAS]));
  const [counterB, setCounterB] = useState<GCounter>(() => emptyCounter([...REPLICAS]));
  const [lwwA, setLwwA] = useState<LWWRegister>({ value: 0, ts: 0 });
  const [lwwB, setLwwB] = useState<LWWRegister>({ value: 0, ts: 0 });
  const [probState, setProbState] = useState<ProbCompactionState>(() => emptyProbState());
  const [staleAttempted, setStaleAttempted] = useState(false);

  const mergedCounter = useMemo(() => mergeCounters(counterA, counterB), [counterA, counterB]);
  const naiveCounter = useMemo(() => naiveSumMerge(counterA, counterB), [counterA, counterB]);
  const mergedLww = useMemo(() => lwwMerge(lwwA, lwwB), [lwwA, lwwB]);

  const valA = counterValue(counterA);
  const valB = counterValue(counterB);
  const valMerged = counterValue(mergedCounter);
  const valNaive = counterValue(naiveCounter);
  const mergeDiffersFromNaive = valMerged !== valNaive;

  const fpEst = falsePositiveRate(
    PROB_BLOOM_M,
    probState.tombstones.size,
    PROB_BLOOM_K
  );
  const mem = tombstoneMemoryBytes(probState.tombstones.size, PROB_BLOOM_M);

  const applyConcurrent = () => {
    const { a, b } = presetConcurrentIncrements();
    setCounterA(a);
    setCounterB(b);
    setMode("counter");
    setStaleAttempted(false);
  };

  const applyPartition = () => {
    const { a, b } = presetPartitionHeal();
    setCounterA(a);
    setCounterB(b);
    setMode("counter");
    setStaleAttempted(false);
  };

  const applyCompaction = () => {
    setProbState(presetCompactionStaleAdd());
    setStaleAttempted(false);
    setMode("tombstone");
  };

  const applyLwwPreset = () => {
    const { a, b } = presetLwwConflict();
    setLwwA(a);
    setLwwB(b);
    setMode("counter");
  };

  const tryStaleBananaUpdate = () => {
    const result = probTryAdd(probState, "tag_b_stale", "Banana");
    setProbState(result.state);
    setStaleAttempted(true);
  };

  const compactTombstones = () => {
    setProbState((s) => probCompact(s));
    setStaleAttempted(false);
  };

  const counterMetrics: LabMetric[] = [
    { id: "va", label: "Replica A total", value: String(valA) },
    { id: "vb", label: "Replica B total", value: String(valB) },
    {
      id: "merged",
      label: "G-Counter ⊔ (max)",
      value: String(valMerged),
      tone: mergeDiffersFromNaive ? "aha" : "default",
    },
    {
      id: "naive",
      label: "Naive sum (wrong)",
      value: String(valNaive),
      tone: mergeDiffersFromNaive ? "warn" : "default",
    },
    {
      id: "lww",
      label: "LWW register ⊔",
      value: `${mergedLww.value} (ts ${mergedLww.ts})`,
    },
  ];

  const tombMetrics: LabMetric[] = [
    {
      id: "live",
      label: "Live OR-Set",
      value: orSetElements(probState.live).join(", ") || "(empty)",
    },
    {
      id: "tomb",
      label: "Exact tombstones",
      value: String(probState.tombstones.size),
    },
    {
      id: "fp",
      label: "Bloom FP (est.)",
      value: `${(fpEst * 100).toFixed(2)}%`,
      tone: fpEst > 0.05 ? "warn" : "default",
    },
    {
      id: "mem",
      label: "Tombstone memory",
      value: `${mem.exact}B exact vs ${mem.bloom}B bloom`,
      tone: probState.tombstones.size > 0 ? "aha" : "default",
    },
  ];

  const compareLeft = `CRDT ⊔: total ${valMerged} · ${formatReplicaVector(mergedCounter, [...REPLICAS])}`;
  const compareRight = mergeDiffersFromNaive
    ? `Naive sum: total ${valNaive} · ${formatReplicaVector(naiveCounter, [...REPLICAS])} (double-counts)`
    : `LWW ⊔: value ${mergedLww.value} at ts ${mergedLww.ts} (newest timestamp wins)`;

  const predictPartition =
    valA === valB && valA > 0 && counterA.get("Node_A") === counterB.get("Node_A");

  return (
    <LabShell
      intro={
        <>
          <strong>State-based CRDTs</strong> merge with a join ⊔ that is commutative, associative,
          and idempotent. A <strong>G-Counter</strong> takes per-replica <strong>max</strong>; summing
          replica vectors after a partition <strong>over-counts</strong>. <strong>Probabilistic
          tombstones</strong> compress deletes into a Bloom filter — occasional false positives drop
          stale adds.
        </>
      }
    >
      <LabTabs
        tabs={MODE_TABS}
        activeId={mode}
        onChange={(id) => setMode(id as LabMode)}
        ariaLabel="CRDT lab modes"
      />

      <LabTabPanel tab={MODE_TABS[0]} active={mode === "counter"}>
        <div className="lab__grid">
          <div>
            <div className="lab__controls-panel">
              <ScenarioPresets
                aria-label="G-Counter scenario presets"
                presets={[
                  { id: "concurrent", label: "Concurrent increments", onSelect: applyConcurrent },
                  { id: "partition", label: "Partition heal", onSelect: applyPartition },
                  { id: "lww", label: "LWW conflict", onSelect: applyLwwPreset },
                ]}
              />
            </div>

            <div
              className="crdt-lab__lattice"
              role="img"
              aria-label={`Merge lattice: A total ${valA}, B total ${valB}, merged ${valMerged}`}
            >
              <div className="crdt-lab__lattice-node crdt-lab__lattice-node--a">
                <span className="crdt-lab__lattice-label">Replica A</span>
                <code>{formatReplicaVector(counterA, [...REPLICAS])}</code>
                <span className="crdt-lab__lattice-sum">Σ = {valA}</span>
              </div>
              <div className="crdt-lab__lattice-node crdt-lab__lattice-node--b">
                <span className="crdt-lab__lattice-label">Replica B</span>
                <code>{formatReplicaVector(counterB, [...REPLICAS])}</code>
                <span className="crdt-lab__lattice-sum">Σ = {valB}</span>
              </div>
              <div className="crdt-lab__lattice-join" aria-hidden="true">
                ⊔ max
              </div>
              <div className="crdt-lab__lattice-node crdt-lab__lattice-node--merged">
                <span className="crdt-lab__lattice-label">Merged</span>
                <code>{formatReplicaVector(mergedCounter, [...REPLICAS])}</code>
                <span className="crdt-lab__lattice-sum">Σ = {valMerged}</span>
              </div>
            </div>

            <div className="crdt-lab__panels">
              <div className="crdt-lab__panel">
                <h3>Replica A</h3>
                <button
                  type="button"
                  className="lab__btn"
                  onClick={() => setCounterA((c) => increment(c, "Node_A"))}
                >
                  +1 on Node_A
                </button>
                <button
                  type="button"
                  className="lab__btn lab__btn--ghost"
                  onClick={() => setCounterA((c) => increment(c, "Node_B"))}
                >
                  +1 on Node_B
                </button>
              </div>
              <div className="crdt-lab__panel">
                <h3>Replica B</h3>
                <button
                  type="button"
                  className="lab__btn"
                  onClick={() => setCounterB((c) => increment(c, "Node_B"))}
                >
                  +1 on Node_B
                </button>
                <button
                  type="button"
                  className="lab__btn lab__btn--ghost"
                  onClick={() => setCounterB((c) => increment(c, "Node_C"))}
                >
                  +1 on Node_C
                </button>
              </div>
            </div>
            <p className="lab__hint">
              Lattice edges flow A, B → ⊔. After <strong>Partition heal</strong>, both replicas show
              3× on Node_A — max gives 3, naive sum gives 6.
            </p>
          </div>
          <MetricsAside metrics={counterMetrics} />
        </div>

        <PredictReveal
          key={`${valA}-${valB}-${valMerged}-${valNaive}`}
          prompt={
            predictPartition ? (
              <>
                Both replicas incremented <strong>Node_A</strong> three times while partitioned.
                Will the correct G-Counter total after ⊔ be <strong>{valMerged}</strong> or will a
                naive per-replica <strong>sum</strong> yield <strong>{valNaive}</strong>?
              </>
            ) : (
              <>
                Replica totals are A=<strong>{valA}</strong>, B=<strong>{valB}</strong>. After ⊔
                (componentwise max), is the merged total <strong>{valMerged}</strong> equal to the
                naive sum <strong>{valNaive}</strong>?
              </>
            )
          }
          revealLabel="Show CRDT merge vs naive sum / LWW"
        >
          <ComparePanel
            leftLabel="CRDT merge (correct ⊔)"
            rightLabel={mergeDiffersFromNaive ? "Naive sum (incorrect)" : "LWW register ⊔"}
            left={compareLeft}
            right={compareRight}
          />
          <p className="lab__status" role="note">
            {mergeDiffersFromNaive
              ? `Partition double-count: naive sum ${valNaive} ≠ CRDT ${valMerged}. Max per replica is the join on the counter lattice.`
              : `No double-count on this vector — LWW picks ts ${mergedLww.ts} → value ${mergedLww.value}. Try Partition heal preset.`}
          </p>
        </PredictReveal>
      </LabTabPanel>

      <LabTabPanel tab={MODE_TABS[1]} active={mode === "tombstone"}>
        <div className="lab__grid">
          <div>
            <div className="lab__controls-panel">
              <ScenarioPresets
                aria-label="Probabilistic tombstone presets"
                presets={[
                  { id: "compact", label: "Compaction demo", onSelect: applyCompaction },
                  {
                    id: "heal",
                    label: "Partition heal",
                    onSelect: () => {
                      applyPartition();
                      setMode("counter");
                    },
                  },
                ]}
              />
            </div>
            <div className="crdt-lab__panel">
              <h3>Probabilistic OR-Set</h3>
              <p className="lab__hint">
                Live: [{orSetElements(probState.live).join(", ") || "empty"}] · Deleted (exact): [
                {[...probState.tombstones].join(", ") || "none"}]
              </p>
              <div className="lab__row">
                <button
                  type="button"
                  className="lab__btn"
                  onClick={() => setProbState((s) => ({ ...s, live: orSetAdd(s.live, "tag_a", "Cherry") }))}
                >
                  Add Cherry
                </button>
                <button
                  type="button"
                  className="lab__btn lab__btn--ghost"
                  onClick={() => setProbState((s) => probDelete(s, "Banana"))}
                  disabled={!orSetElements(probState.live).includes("Banana")}
                >
                  Delete Banana → Bloom
                </button>
                <button
                  type="button"
                  className="lab__btn lab__btn--ghost"
                  onClick={tryStaleBananaUpdate}
                >
                  Stale: add Banana
                </button>
                <button type="button" className="lab__btn lab__btn--ghost" onClick={compactTombstones}>
                  Compact (clear bloom)
                </button>
              </div>
            </div>
            <p className="lab__hint">
              Deletion hashes into a Bloom filter; memory drops vs exact tombstone IDs. A delayed
              &quot;add Banana&quot; after delete is rejected when the filter says probably deleted.
            </p>
          </div>
          <MetricsAside metrics={tombMetrics} />
        </div>

        <PredictReveal
          key={`${staleAttempted}-${probState.tombstones.size}`}
          prompt={
            <>
              Node B was offline; Node A deleted <strong>Banana</strong> and compacted metadata into
              a Bloom filter. B wakes up and sends <strong>add Banana</strong>. Will the merge accept
              the stale add?
            </>
          }
          revealLabel="Show merge vs naive acceptance"
        >
          <ComparePanel
            leftLabel="Probabilistic CRDT"
            rightLabel="Naive (always apply)"
            left={
              staleAttempted
                ? probState.live.has("Banana")
                  ? "Stale add accepted — live set includes Banana"
                  : "Stale add rejected — Bloom says probably deleted"
                : "Press Stale: add Banana to simulate delayed message"
            }
            right="Naive LWW / last-writer would resurrect Banana without tombstone check"
          />
          <p className="lab__status" role="note">
            {staleAttempted
              ? probState.live.has("Banana")
                ? "Add applied (no tombstone hit for this key)."
                : "Rejected — converges without storing permanent tombstones; rare Bloom FP can drop live keys."
              : "Use Compaction demo preset, then Stale: add Banana."}
          </p>
        </PredictReveal>
      </LabTabPanel>

      <p className="lab__status" role="status" aria-live="polite">
        {mode === "counter"
          ? `G-Counter ⊔ total ${valMerged}${mergeDiffersFromNaive ? ` (naive wrongly ${valNaive})` : ""}.`
          : `Prob tombstones: ${probState.tombstones.size} exact · bloom ${PROB_BLOOM_M} bits.`}
      </p>
    </LabShell>
  );
}
