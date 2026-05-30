import { useCallback, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { DEFAULT_EXPLORATION, formatMcts, formatPercent, uctScore } from "../lib/mcts-math";
import {
  EXPLOIT_PRESET,
  EXPLORE_TRAP_PRESET,
  GROUND_TRUTH_BEST_MOVE,
  MANY_ROLLOUTS_PRESET,
  TOY_TREE,
  createInitialTreeState,
  mctsRecommendation,
  runMctsBatch,
  runMctsIteration,
  trueWinProb,
  type MctsTreeState,
} from "../lib/mcts-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./MonteCarloTreeSearchLab.css";

function makeRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function NodeBox({
  id,
  label,
  stats,
  active,
  recommended,
  reducedMotion,
}: {
  id: string;
  label: string;
  stats: { visits: number; wins: number };
  active: boolean;
  recommended: boolean;
  reducedMotion: boolean;
}) {
  const p = trueWinProb(id);
  return (
    <div
      className={`mcts-lab__node${active ? " mcts-lab__node--active" : ""}${
        recommended ? " mcts-lab__node--best" : ""
      }${reducedMotion ? " mcts-lab__node--static" : ""}`}
      title={p !== null ? `True P(win)≈${formatPercent(p)}` : "Internal node"}
    >
      <span className="mcts-lab__node-label">{label}</span>
      <span className="mcts-lab__node-stats">
        N={stats.visits} · W={stats.wins}
        {stats.visits > 0 ? ` · ${formatPercent(stats.wins / stats.visits)}` : ""}
      </span>
    </div>
  );
}

export default function MonteCarloTreeSearchLab() {
  const [explorationTenths, setExplorationTenths] = useState(Math.round(DEFAULT_EXPLORATION * 10));
  const [iterations, setIterations] = useState(60);
  const [seed, setSeed] = useState(42);
  const [state, setState] = useState<MctsTreeState>(() => createInitialTreeState());
  const [lastPhase, setLastPhase] = useState<string>("—");
  const [activePath, setActivePath] = useState<string[]>(["root"]);
  const [rolloutResult, setRolloutResult] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const exploration = explorationTenths / 10;
  const randRef = useMemo(() => makeRand(seed), [seed]);

  const recommendation = mctsRecommendation(state);
  const matchesTruth =
    recommendation === GROUND_TRUTH_BEST_MOVE && (state.nodes.A?.visits ?? 0) > 0;

  const rootStats = state.nodes.root ?? { visits: 0, wins: 0 };
  const rootChildren = useMemo(() => {
    return ["A", "B", "C"].map((id) => {
      const stats = state.nodes[id] ?? { visits: 0, wins: 0 };
      return {
        id,
        label: TOY_TREE[id]!.label,
        uct: uctScore(stats.wins, stats.visits, rootStats.visits, exploration),
        visits: stats.visits,
      };
    });
  }, [state, rootStats.visits, exploration]);

  const maxUct = Math.max(...rootChildren.map((c) => (Number.isFinite(c.uct) ? c.uct : 2)), 0.01);

  const runOne = useCallback(() => {
    const next: MctsTreeState = {
      nodes: Object.fromEntries(
        Object.entries(state.nodes).map(([k, v]) => [k, { ...v }])
      ),
    };
    const trace = runMctsIteration(next, exploration, randRef);
    setState(next);
    setLastPhase(trace.phase);
    setActivePath(trace.path);
    setRolloutResult(trace.rolloutResult);
  }, [state, exploration, randRef]);

  const resetAndRun = useCallback(
    (n: number, c: number, s: number) => {
      const { state: next, last } = runMctsBatch(n, c, s);
      setState(next);
      setLastPhase(last?.phase ?? "—");
      setActivePath(last?.path ?? ["root"]);
      setRolloutResult(last?.rolloutResult ?? null);
    },
    []
  );

  const applyExploit = () => {
    setExplorationTenths(Math.round(EXPLOIT_PRESET.exploration * 10));
    setIterations(EXPLOIT_PRESET.iterations);
    setSeed(EXPLOIT_PRESET.seed);
    resetAndRun(EXPLOIT_PRESET.iterations, EXPLOIT_PRESET.exploration, EXPLOIT_PRESET.seed);
  };

  const applyExploreTrap = () => {
    setExplorationTenths(Math.round(EXPLORE_TRAP_PRESET.exploration * 10));
    setIterations(EXPLORE_TRAP_PRESET.iterations);
    setSeed(EXPLORE_TRAP_PRESET.seed);
    resetAndRun(
      EXPLORE_TRAP_PRESET.iterations,
      EXPLORE_TRAP_PRESET.exploration,
      EXPLORE_TRAP_PRESET.seed
    );
  };

  const applyManyRollouts = () => {
    setExplorationTenths(Math.round(MANY_ROLLOUTS_PRESET.exploration * 10));
    setIterations(MANY_ROLLOUTS_PRESET.iterations);
    setSeed(MANY_ROLLOUTS_PRESET.seed);
    resetAndRun(
      MANY_ROLLOUTS_PRESET.iterations,
      MANY_ROLLOUTS_PRESET.exploration,
      MANY_ROLLOUTS_PRESET.seed
    );
  };

  const resetTree = () => {
    setState(createInitialTreeState());
    setLastPhase("—");
    setActivePath(["root"]);
    setRolloutResult(null);
  };

  const statsFor = (id: string) => state.nodes[id] ?? { visits: 0, wins: 0 };

  const metrics: LabMetric[] = [
    { id: "phase", label: "Last phase", value: lastPhase },
    { id: "c", label: "Exploration c", value: exploration.toFixed(2) },
    { id: "iters", label: "Root visits", value: String(rootStats.visits) },
    {
      id: "pick",
      label: "MCTS pick",
      value: recommendation ?? "—",
      tone: matchesTruth ? "aha" : recommendation ? "default" : "warn",
    },
    {
      id: "truth",
      label: "Ground truth",
      value: `Move ${GROUND_TRUTH_BEST_MOVE} (P≈${formatPercent(trueWinProb("A")!)}`,
    },
    {
      id: "rollout",
      label: "Last rollout",
      value: rolloutResult === null ? "—" : rolloutResult ? "win (+1)" : "loss (0)",
    },
  ];
  if (matchesTruth && rootStats.visits >= 40) {
    metrics.push({
      id: "aha",
      label: "Aha — UCT",
      value: `Move A wins visits after ${rootStats.visits} rollouts; trap C1 stays sparse.`,
      tone: "aha",
    });
  }

  const aVisits = state.nodes.A?.visits ?? 0;
  const cVisits = state.nodes.C?.visits ?? 0;
  const predictKey = `${exploration}-${iterations}-${seed}-${rootStats.visits}`;

  const compareLeft = recommendation
    ? `MCTS: play ${TOY_TREE[recommendation]!.label} · visits A/B/C = ${aVisits}/${state.nodes.B?.visits ?? 0}/${cVisits}`
    : `MCTS: run iterations — root children unvisited`;
  const compareRight = `Truth: ${TOY_TREE[GROUND_TRUTH_BEST_MOVE]!.label} · P(win)≈${formatPercent(
    trueWinProb(GROUND_TRUTH_BEST_MOVE)!
  )} vs C→C1 ≈${formatPercent(trueWinProb("C1")!)}`;

  return (
    <LabShell
      intro={
        <>
          <strong>Monte Carlo Tree Search</strong> on a tiny game tree: each iteration runs{" "}
          <strong>selection</strong> (UCT), <strong>expansion</strong>, random <strong>simulation</strong>
          , and <strong>backpropagation</strong>. Tune exploration <em>c</em> and watch Move A outrank the
          trap branch C→C1.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="mcts-c"
              label="Exploration constant (c)"
              min={2}
              max={35}
              value={explorationTenths}
              valueText={`c = ${exploration.toFixed(2)}`}
              onChange={setExplorationTenths}
            />
            <RangeControl
              id="mcts-iters"
              label="Batch iterations (preset runner)"
              min={10}
              max={300}
              step={10}
              value={iterations}
              valueText={`${iterations} iterations`}
              onChange={setIterations}
            />
            <RangeControl
              id="mcts-seed"
              label="RNG seed"
              min={1}
              max={200}
              value={seed}
              valueText={`seed ${seed}`}
              onChange={setSeed}
            />
            <ScenarioPresets
              aria-label="MCTS scenario presets"
              presets={[
                { id: "exploit", label: "Exploit (low c)", onSelect: applyExploit },
                { id: "trap", label: "Explore trap (high c)", onSelect: applyExploreTrap },
                { id: "many", label: "Many rollouts", onSelect: applyManyRollouts },
              ]}
            />
          </div>

          <div className="lab__row" role="group" aria-label="MCTS controls">
            <button type="button" className="lab__btn" onClick={runOne}>
              1 iteration
            </button>
            <button
              type="button"
              className="lab__btn lab__btn--ghost"
              onClick={() => resetAndRun(iterations, exploration, seed)}
            >
              Run {iterations} iterations
            </button>
            <button type="button" className="lab__btn lab__btn--ghost" onClick={resetTree}>
              Reset tree
            </button>
          </div>

          <p className="lab__hint">
            UCT at root (higher bar = higher score). Unvisited children score ∞ until expanded.
          </p>
          <div
            className="mcts-lab__uct"
            role="img"
            aria-label="Root child UCT scores"
          >
            {rootChildren.map((ch) => (
              <div
                key={ch.id}
                className={`mcts-lab__uct-bar${ch.visits === 0 ? " mcts-lab__uct-bar--muted" : ""}`}
                style={{
                  height: `${(Math.min(ch.uct, maxUct) / maxUct) * 100}%`,
                }}
                title={`${ch.label}: UCT=${formatMcts(ch.uct)} · N=${ch.visits}`}
              />
            ))}
          </div>

          <span className="mcts-lab__phase" role="status">
            Phase: {lastPhase}
          </span>

          <div
            className={`mcts-lab__tree${reducedMotion ? " mcts-lab__tree--static" : ""}`}
            role="img"
            aria-label="Toy game tree with visit counts"
          >
            <div className="mcts-lab__row">
              <NodeBox
                id="root"
                label="Root"
                stats={statsFor("root")}
                active={activePath.includes("root")}
                recommended={false}
                reducedMotion={reducedMotion}
              />
            </div>
            <div className="mcts-lab__connector">│</div>
            <div className="mcts-lab__row">
              {(["A", "B", "C"] as const).map((id) => (
                <NodeBox
                  key={id}
                  id={id}
                  label={TOY_TREE[id]!.label}
                  stats={statsFor(id)}
                  active={activePath.includes(id)}
                  recommended={recommendation === id}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
            <div className="mcts-lab__connector">└ C only →</div>
            <div className="mcts-lab__row">
              <NodeBox
                id="C1"
                label={TOY_TREE.C1!.label}
                stats={statsFor("C1")}
                active={activePath.includes("C1")}
                recommended={false}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={predictKey}
        prompt={
          <>
            With <strong>c={exploration.toFixed(2)}</strong> and{" "}
            <strong>{rootStats.visits}</strong> root visits, will <strong>Move A</strong> have more
            visits than <strong>Move C</strong> (UCT should favor the 78% leaf over the C→C1 trap)?
          </>
        }
        storageKey="mcts"
        options={[
          { id: "a-wins", label: "Yes — Move A leads in visits", isCorrect: matchesTruth },
          { id: "c-wins", label: "No — Move C has more visits", isCorrect: !matchesTruth },
        ]}
        revealLabel="Show MCTS vs ground truth"
      >
        <ComparePanel
          leftLabel="MCTS policy"
          rightLabel="Ground truth"
          left={compareLeft}
          right={compareRight}
        />
        <p className="lab__status" role="note">
          {matchesTruth
            ? `Move A leads visits (${aVisits} vs C=${cVisits}) — matches P(win)≈78% vs C1≈12%.`
            : rootStats.visits < 15
              ? "Run more iterations or lower c to exploit; high c keeps exploring C."
              : `MCTS pick ${recommendation ?? "—"} — try Many rollouts or Exploit preset.`}
        </p>
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        UCT = W/N + c√(ln N_parent / N). Last path: {activePath.join(" → ")}.
        {rolloutResult !== null ? ` Rollout: ${rolloutResult ? "win" : "loss"}.` : ""}
      </p>
    </LabShell>
  );
}
