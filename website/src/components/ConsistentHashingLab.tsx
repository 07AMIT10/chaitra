import { useMemo, useState } from "react";
import {
  ConsistentHashRing,
  DEMO_KEYS,
  DEMO_SERVERS,
} from "../lib/ring-sim";
import { LabShell, MetricsAside, RangeControl, type LabMetric } from "./lab";
import "./ConsistentHashingLab.css";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ConsistentHashingLab() {
  const [replicas, setReplicas] = useState(3);
  const [activeServers, setActiveServers] = useState<string[]>([...DEMO_SERVERS]);
  const [removedServer, setRemovedServer] = useState<string | null>(null);

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

  const removeServer = (name: string) => {
    setRemovedServer(name);
    setActiveServers((prev) => prev.filter((s) => s !== name));
  };

  const restoreServer = () => {
    if (removedServer) {
      setActiveServers((prev) => [...prev, removedServer].sort());
      setRemovedServer(null);
    }
  };

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
        tone: remap.moved > 0 ? "warn" : "default",
      }
    );
  }

  const serverColor = (name: string | null) => {
    if (!name) return "#666";
    const idx = activeServers.indexOf(name);
    return COLORS[idx % COLORS.length];
  };

  return (
    <LabShell
      intro={
        <>
          Keys and servers sit on an MD5 hash ring. Adding or removing a node only remaps keys
          between its neighbors — same recipe as <code>consistent_hashing.py</code>.
        </>
      }
    >
      <div className="lab__grid">
        <div>
          <RangeControl
            id="ring-replicas"
            label="Virtual nodes (replicas)"
            min={1}
            max={20}
            value={replicas}
            valueText={`${replicas} vnodes per server`}
            onChange={setReplicas}
          />
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
            {assignments.map((a, i) => {
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
      <p className="lab__status" role="status" aria-live="polite">
        {activeServers.length} servers, {replicas} vnodes each.
        {remap
          ? ` After removing ${removedServer}: ${remap.moved} keys moved, ${remap.stayed} stayed.`
          : " Remove a server to see minimal remapping."}
      </p>
    </LabShell>
  );
}
