import { useMemo, useState } from "react";
import {
  idealRemapFractionOnRemove,
  moduloRemapFractionOnShrink,
} from "../lib/ring-math";
import {
  ConsistentHashRing,
  DEMO_KEYS,
  DEMO_SERVERS,
  moduloRemapCount,
} from "../lib/ring-sim";
import {
  ComparePanel,
  LabShell,
  MetricsAside,
  PredictReveal,
  RangeControl,
  ScenarioPresets,
  type LabMetric,
} from "./lab";
import "./ConsistentHashingLab.css";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

type LabState = {
  replicas: number;
  activeServers: string[];
  removedServer: string | null;
};

const INITIAL: LabState = {
  replicas: 3,
  activeServers: [...DEMO_SERVERS],
  removedServer: null,
};

export default function ConsistentHashingLab() {
  const [{ replicas, activeServers, removedServer }, setLab] = useState<LabState>(INITIAL);

  const ring = useMemo(() => {
    const r = new ConsistentHashRing(replicas);
    for (const s of activeServers) r.addNode(s);
    return r;
  }, [replicas, activeServers]);

  const beforeRing = useMemo(() => {
    if (!removedServer) return null;
    const r = new ConsistentHashRing(replicas);
    for (const s of [...activeServers, removedServer]) r.addNode(s);
    return r;
  }, [replicas, activeServers, removedServer]);

  const assignments = ring.assignKeys(DEMO_KEYS);
  const remap =
    beforeRing && removedServer
      ? ring.remapCount(beforeRing, DEMO_KEYS)
      : null;

  const serversBeforeRemove = removedServer ? activeServers.length + 1 : activeServers.length;
  const idealFraction = idealRemapFractionOnRemove(serversBeforeRemove);
  const idealMoved = Math.round(idealFraction * DEMO_KEYS.length);
  const moduloFraction =
    removedServer && serversBeforeRemove > 1
      ? moduloRemapFractionOnShrink(serversBeforeRemove, activeServers.length)
      : null;
  const moduloRemap =
    removedServer && serversBeforeRemove > 1
      ? moduloRemapCount(DEMO_KEYS, serversBeforeRemove, activeServers.length)
      : null;

  const removeServer = (name: string) => {
    setLab((prev) => ({
      ...prev,
      removedServer: name,
      activeServers: prev.activeServers.filter((s) => s !== name),
    }));
  };

  const restoreServer = () => {
    if (!removedServer) return;
    setLab((prev) => ({
      ...prev,
      activeServers: [...prev.activeServers, removedServer].sort(),
      removedServer: null,
    }));
  };

  const applyThreeServers = () => setLab(INITIAL);

  const applyRemoveOneNode = () =>
    setLab({
      replicas: 3,
      activeServers: ["Server_A", "Server_C"],
      removedServer: "Server_B",
    });

  const applyHighVnodes = () =>
    setLab({
      replicas: 20,
      activeServers: [...DEMO_SERVERS],
      removedServer: null,
    });

  const metrics: LabMetric[] = [
    { id: "vnodes", label: "Vnodes per server", value: String(replicas) },
    { id: "servers", label: "Active servers", value: String(activeServers.length) },
    { id: "keys", label: "Sample keys", value: String(DEMO_KEYS.length) },
  ];
  if (remap) {
    metrics.push(
      { id: "stayed", label: "Keys unchanged", value: String(remap.stayed), tone: "default" },
      {
        id: "moved",
        label: "Keys remapped",
        value: String(remap.moved),
        tone: remap.moved > idealMoved + 1 ? "warn" : "default",
      },
      {
        id: "ideal",
        label: "Ideal ~1/N moved",
        value: `~${idealMoved} of ${DEMO_KEYS.length}`,
        tone: "default",
      }
    );
    if (moduloRemap && moduloFraction != null) {
      metrics.push({
        id: "aha",
        label: "Modulo would move",
        value: `${moduloRemap.moved}/${DEMO_KEYS.length} (${(moduloFraction * 100).toFixed(0)}%)`,
        tone: "aha",
      });
    }
  }

  const serverColor = (name: string | null) => {
    if (!name) return "#666";
    const idx = activeServers.indexOf(name);
    return COLORS[idx % COLORS.length];
  };

  const compareLeft = remap
    ? `${remap.moved} remapped, ${remap.stayed} stable (consistent hash ring)`
    : "Remove a server to measure remapping";

  const compareRight = remap
    ? `Ideal ~${idealMoved} move; modulo resize would move ${moduloRemap?.moved ?? "—"} of ${DEMO_KEYS.length}`
    : `With ${activeServers.length} servers, expect ~${Math.round((1 / Math.max(activeServers.length, 1)) * DEMO_KEYS.length)} keys to move per removal`;

  return (
    <LabShell
      intro={
        <>
          Keys and servers sit on an MD5 hash ring. Removing a node only reassigns keys that
          belonged to it — same recipe as <code>consistent_hashing.py</code>.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <div className="lab__controls-panel">
            <RangeControl
              id="ring-replicas"
              label="Virtual nodes (replicas)"
              min={1}
              max={20}
              value={replicas}
              valueText={`${replicas} vnodes per server`}
              onChange={(v) => setLab((prev) => ({ ...prev, replicas: v }))}
            />
            <ScenarioPresets
              aria-label="Hash ring scenario presets"
              presets={[
                { id: "three", label: "3 servers", onSelect: applyThreeServers },
                { id: "remove", label: "Remove one node", onSelect: applyRemoveOneNode },
                { id: "vnodes", label: "High vnodes", onSelect: applyHighVnodes },
              ]}
            />
          </div>
          <div className="ring-lab__servers" role="group" aria-label="Servers">
            {activeServers.map((s) => (
              <button
                key={s}
                type="button"
                className="lab__btn lab__btn--ghost"
                onClick={() => removeServer(s)}
              >
                Remove {s}
              </button>
            ))}
            {removedServer && (
              <button type="button" className="lab__btn" onClick={restoreServer}>
                Restore {removedServer}
              </button>
            )}
          </div>
          <svg
            className="ring-lab__svg"
            viewBox="0 0 200 200"
            role="img"
            aria-label="Hash ring with key assignments"
          >
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--color-muted)" strokeWidth="1" />
            {assignments.map((a) => {
              const angle = (a.hash / 2 ** 32) * 2 * Math.PI - Math.PI / 2;
              const x = 100 + 80 * Math.cos(angle);
              const y = 100 + 80 * Math.sin(angle);
              return (
                <circle
                  key={a.key}
                  cx={x}
                  cy={y}
                  r="5"
                  fill={serverColor(a.node)}
                  aria-label={`${a.key} → ${a.node}`}
                />
              );
            })}
            {activeServers.map((s, i) => {
              const pos = ring.ring[i * replicas] ?? 0;
              const angle = (pos / 2 ** 32) * 2 * Math.PI - Math.PI / 2;
              const x = 100 + 70 * Math.cos(angle);
              const y = 100 + 70 * Math.sin(angle);
              return (
                <text key={s} x={x} y={y} fontSize="8" textAnchor="middle" fill={COLORS[i % COLORS.length]}>
                  {s.replace("Server_", "")}
                </text>
              );
            })}
          </svg>
          <ul className="ring-lab__assignments">
            {assignments.map((a) => (
              <li key={a.key}>
                <span style={{ color: serverColor(a.node) }}>{a.key}</span> → {a.node}
              </li>
            ))}
          </ul>
        </div>
        <MetricsAside metrics={metrics} />
      </div>

      <PredictReveal
        key={`${replicas}-${activeServers.join(",")}-${removedServer ?? "none"}`}
        prompt={
          <>
            {removedServer ? (
              <>
                After removing <strong>{removedServer}</strong>, how many of the {DEMO_KEYS.length}{" "}
                sample keys remap vs stay on the same server? (Ideal bound: ~{idealMoved} move.)
              </>
            ) : (
              <>
                Remove a server (or use <strong>Remove one node</strong>): how many keys will remap
                vs stay stable?
              </>
            )}
          </>
        }
        storageKey="consistent-hash"
        options={remap ? [
          { id: "close", label: `Close to ideal (~${idealMoved} keys move)`, isCorrect: remap.moved <= idealMoved + 2 },
          { id: "many", label: "Many more keys move than ideal", isCorrect: remap.moved > idealMoved + 2 },
        ] : undefined}
        revealLabel="Show remapped vs stable"
      >
        <ComparePanel
          leftLabel="Consistent hashing"
          rightLabel="Ground truth / baseline"
          left={compareLeft}
          right={compareRight}
        />
        {remap && moduloRemap && (
          <p className="lab__status" role="note">
            Only keys owned by the removed node should move (~1/{serversBeforeRemove} of the ring).
            Naive <code>hash % N</code> would reshuffle {moduloRemap.moved} keys (
            {(moduloFraction! * 100).toFixed(0)}%).
          </p>
        )}
      </PredictReveal>

      <p className="lab__status" role="status" aria-live="polite">
        {activeServers.length} servers, {replicas} vnodes each.
        {remap
          ? ` After removing ${removedServer}: ${remap.moved} keys moved, ${remap.stayed} stayed.`
          : " Remove a server to see minimal remapping."}
      </p>
    </LabShell>
  );
}
