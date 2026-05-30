import { useMemo, useState } from "react";
import {
  formatRank,
  l1Distance,
  suggestedIterations,
  topNodeIndex,
  uniformRank,
} from "../lib/pagerank-math";
import {
  CLASSIC_WEB,
  HUB_SPOKE,
  SPIDER_TRAP,
  getGraphPreset,
  nodePositions,
  powerIteration,
  type PageRankGraphPreset,
} from "../lib/pagerank-sim";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./PageRankLab.css";

export default function PageRankLab() {
  const [graphId, setGraphId] = useState<string>(CLASSIC_WEB.id);
  const [dampingPct, setDampingPct] = useState(85);
  const [iterations, setIterations] = useState(8);
  const reducedMotion = usePrefersReducedMotion();

  const graph = useMemo(() => getGraphPreset(graphId), [graphId]);
  const damping = dampingPct / 100;
  const n = graph.links.length;

  const ranks = useMemo(
    () => powerIteration(graph.links, damping, iterations),
    [graph.links, damping, iterations]
  );

  const uniform = useMemo(() => uniformRank(n), [n]);
  const topIdx = topNodeIndex(ranks);
  const deltaUniform = l1Distance(ranks, uniform);
  const prevRanks = useMemo(
    () => powerIteration(graph.links, damping, Math.max(0, iterations - 1)),
    [graph.links, damping, iterations]
  );
  const stepDelta = l1Distance(ranks, prevRanks);
  const suggested = suggestedIterations(n, damping);

  const applyClassic = () => {
    setGraphId(CLASSIC_WEB.id);
    setDampingPct(85);
    setIterations(12);
  };

  const applyHub = () => {
    setGraphId(HUB_SPOKE.id);
    setDampingPct(85);
    setIterations(10);
  };

  const applyTrap = () => {
    setGraphId(SPIDER_TRAP.id);
    setDampingPct(85);
    setIterations(15);
  };

  const stepOnce = () => setIterations((it) => Math.min(40, it + 1));
  const resetIterations = () => setIterations(1);

  const selectGraph = (preset: PageRankGraphPreset) => {
    setGraphId(preset.id);
    setIterations(1);
  };

  const positions = nodePositions(n);
  const maxRank = Math.max(...ranks, 1 / n);

  const metrics: LabMetric[] = [
    { id: "graph", label: "Graph", value: graph.label },
    { id: "d", label: "Damping (d)", value: `${dampingPct}%` },
    { id: "it", label: "Iterations", value: String(iterations) },
    { id: "top", label: "Top node", value: `${graph.nodeLabels[topIdx]} (${formatRank(ranks[topIdx])})` },
    { id: "delta", label: "L1 vs uniform", value: formatRank(deltaUniform) },
    { id: "step", label: "Δ last step", value: iterations > 0 ? formatRank(stepDelta) : "—" },
  ];
  if (stepDelta < 0.001 && iterations > 3) {
    metrics.push({
      id: "aha",
      label: "Converged",
      value: `Ranks stable (Δ < 0.001) after ${iterations} power steps.`,
      tone: "aha",
    });
  }

  const compareLeft = ranks
    .map((r, i) => `${graph.nodeLabels[i]}: ${(r * 100).toFixed(1)}%`)
    .join(" · ");
  const compareRight = uniform
    .map((u, i) => `${graph.nodeLabels[i]}: ${(u * 100).toFixed(1)}%`)
    .join(" · ");

  const convergedSoon = stepDelta < 0.05 && iterations >= 3;

  return (
    <LabShell
      intro={
        <>
          <strong>Power iteration</strong> on a tiny directed graph: each step applies the random-surfer
          update with damping <strong>d</strong> and teleport to all nodes on <strong>dangling</strong>{" "}
          pages — same recurrence as the README equation.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="pr-d"
              label="Damping (d)"
              min={50}
              max={95}
              value={dampingPct}
              valueText={`${dampingPct}% teleport ${100 - dampingPct}%`}
              onChange={setDampingPct}
            />
            <RangeControl
              id="pr-it"
              label="Power iterations"
              min={1}
              max={40}
              value={iterations}
              valueText={`${iterations} steps (suggested ~${suggested})`}
              onChange={setIterations}
            />
            <ScenarioPresets
              aria-label="PageRank graph presets"
              presets={[
                { id: "classic", label: "Classic web", onSelect: applyClassic },
                { id: "hub", label: "Hub & spokes", onSelect: applyHub },
                { id: "trap", label: "Spider trap", onSelect: applyTrap },
              ]}
            />
          </div>
          <div className="lab__row">
            <button type="button" className="lab__btn" onClick={stepOnce}>
              Step iteration
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={resetIterations}>
              Reset to 1 step
            </button>
          </div>
          <div className="lab__presets" role="group" aria-label="Graph topology">
            {[CLASSIC_WEB, HUB_SPOKE, SPIDER_TRAP].map((g) => (
              <button
                key={g.id}
                type="button"
                className={`lab__btn lab__btn--ghost${graphId === g.id ? " lab__btn--active" : ""}`}
                onClick={() => selectGraph(g)}
                aria-pressed={graphId === g.id}
              >
                {g.label}
              </button>
            ))}
          </div>
          <svg
            className={`pagerank-lab__graph${reducedMotion ? " pagerank-lab__graph--static" : ""}`}
            viewBox="0 0 1 1"
            role="img"
            aria-label={`Directed graph ${graph.label}: node sizes reflect PageRank`}
          >
            <defs>
              <marker
                id="pagerank-arrow"
                markerWidth="4"
                markerHeight="4"
                refX="3"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L4,2 L0,4 z" fill="var(--color-muted)" />
              </marker>
            </defs>
            {graph.links.map((targets, from) =>
              targets.map((to) => {
                const p0 = positions[from];
                const p1 = positions[to];
                const strong = ranks[from] > 1 / n && ranks[to] > 1 / n;
                return (
                  <line
                    key={`${from}-${to}`}
                    className={`pagerank-lab__edge${strong ? " pagerank-lab__edge--strong" : ""}`}
                    x1={p0.x}
                    y1={p0.y}
                    x2={p1.x}
                    y2={p1.y}
                  />
                );
              })
            )}
            {positions.map((p, i) => {
              const r = 0.04 + (ranks[i] / maxRank) * 0.05;
              return (
                <g key={i}>
                  <circle
                    className={`pagerank-lab__node${i === topIdx ? " pagerank-lab__node--top" : ""}`}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                  />
                  <text className="pagerank-lab__label" x={p.x} y={p.y}>
                    {graph.nodeLabels[i]}
                  </text>
                </g>
              );
            })}
          </svg>
          <div
            className={`pagerank-lab__bars${reducedMotion ? " pagerank-lab__graph--static" : ""}`}
            role="img"
            aria-label="PageRank bar chart versus uniform"
          >
            {ranks.map((rank, i) => (
              <div key={i} className="pagerank-lab__bar-wrap">
                <div
                  className="pagerank-lab__bar"
                  style={{ height: `${(rank / maxRank) * 100}%` }}
                  title={`PageRank ${graph.nodeLabels[i]}: ${formatRank(rank)}`}
                />
                <div
                  className="pagerank-lab__bar pagerank-lab__bar--uniform"
                  style={{ height: `${(uniform[i] / maxRank) * 100}%` }}
                  title={`Uniform ${graph.nodeLabels[i]}: ${formatRank(uniform[i])}`}
                />
                <span className="pagerank-lab__bar-label">{graph.nodeLabels[i]}</span>
              </div>
            ))}
          </div>
          <p className="lab__hint">
            Solid bars: PageRank after {iterations} step{iterations === 1 ? "" : "s"}. Faded bars: uniform
            1/N. Accent node is current top rank; thicker edges connect higher-ranked nodes.
          </p>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${graphId}-${dampingPct}-${iterations}`}
        prompt={
          <>
            On <strong>{graph.label}</strong> with <strong>d = {dampingPct}%</strong>, after{" "}
            <strong>{iterations}</strong> power steps, has the distribution <strong>converged</strong> (last-step
            L1 change &lt; 0.05)?
          </>
        }
        revealLabel="Show PageRank vs uniform distribution"
      >
        <ComparePanel
          leftLabel="PageRank (power method)"
          rightLabel="Uniform 1/N"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {convergedSoon
            ? `Yes — last-step Δ = ${formatRank(stepDelta)} (< 0.05).`
            : `Not yet — last-step Δ = ${formatRank(stepDelta)}; try ~${suggested} iterations.`}{" "}
          Top node: <strong>{graph.nodeLabels[topIdx]}</strong> at {formatRank(ranks[topIdx])}; L1 vs uniform:{" "}
          <strong>{formatRank(deltaUniform)}</strong>.
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {graph.label}: {iterations} iteration{iterations === 1 ? "" : "s"}, top {graph.nodeLabels[topIdx]}{" "}
        ({(ranks[topIdx] * 100).toFixed(1)}%). Last step Δ = {formatRank(stepDelta)}.
      </p>
    </LabShell>
  );
}
