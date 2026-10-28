import type { GameEvent, LevelModule, Move } from "../../types";
import { bellmanFordMeta } from "../meta/bellman-ford";

type BFState = {
  d: Record<string, number | null>;
  relaxations: number;
  lastEdge: string | null;
  used: string[];
  certified: boolean;
  lost: boolean;
};

type Road = { id: string; from: string; to: string; w: number };

const TOWNS = ["S", "P", "Q", "R", "T"] as const;

/**
 * The page's edge list, back to front; the road buttons keep that order.
 * The game relaxes one road per round, so the canonical path S→P→R→T
 * spends three rounds and the fourth is the certificate.
 */
const ROADS: Road[] = [
  { id: "R-T", from: "R", to: "T", w: -4 },
  { id: "P-T", from: "P", to: "T", w: 8 },
  { id: "P-R", from: "P", to: "R", w: 3 },
  { id: "Q-P", from: "Q", to: "P", w: 1 },
  { id: "S-P", from: "S", to: "P", w: 4 },
  { id: "S-Q", from: "S", to: "Q", w: 5 },
];

function initialState(): BFState {
  return {
    d: { S: 0, P: null, Q: 5, R: null, T: null },
    relaxations: 0,
    lastEdge: null,
    used: [],
    certified: false,
    lost: false,
  };
}

function fmt(value: number | null): string {
  return value === null ? "∞" : String(value);
}

function roundOf(state: BFState): number {
  return state.relaxations + 1;
}

function roadOf(id: string): Road | undefined {
  return ROADS.find((road) => road.id === id);
}

function statusOf(state: BFState): "playing" | "won" | "lost" {
  if (state.lost) return "lost";
  if (state.certified) return state.d.T === 3 ? "won" : "lost";
  return "playing";
}

const level: LevelModule<BFState> = {
  meta: bellmanFordMeta,
  initial: initialState(),

  moves(state) {
    if (state.certified) return [];

    const moves: Move[] = ROADS.map((road) => ({
      id: `relax:${road.id}`,
      label: `Relax ${road.from}→${road.to} (${road.w})`,
    }));
    moves.push({ id: "certify", label: `Certify round ${roundOf(state)}`, placement: "tray" });
    return moves;
  },

  apply(state, moveId) {
    if (moveId === "certify") {
      if (state.d.T === 3) {
        const events: GameEvent[] = [
          {
            text: `Certified on round ${roundOf(
              state,
            )}: T = 3; no incoming road lowers it. Row S ${fmt(state.d.S)}, P ${fmt(state.d.P)}, Q ${fmt(
              state.d.Q,
            )}, R ${fmt(state.d.R)}, T 3.`,
            kind: "good",
          },
        ];
        if (roundOf(state) > 4) {
          events.push({
            text: `The clean certificate is round 4; this one is round ${roundOf(state)}.`,
            kind: "info",
          });
        }
        return { state: { ...state, certified: true }, events };
      }

      const incoming = ROADS.filter((road) => road.to === "T" && state.d[road.from] !== null).map(
        (road) => ({ road, value: (state.d[road.from] as number) + road.w }),
      );
      const best = incoming.length === 0 ? null : Math.min(...incoming.map((entry) => entry.value));
      const reason =
        state.d.T === null
          ? "No road has reached T."
          : state.d.T === 12
            ? "P→T is 4 + 8, and R→T = −4 has not lowered it."
            : `Incoming roads give at best ${fmt(best)}; the repair certifies T = 3.`;

      return {
        state: { ...state, certified: true, lost: true },
        events: [
          {
            text: `Certificate refused: T reads ${fmt(state.d.T)}. ${reason} Row S ${fmt(
              state.d.S,
            )}, P ${fmt(state.d.P)}, Q ${fmt(state.d.Q)}, R ${fmt(state.d.R)}, T ${fmt(state.d.T)}.`,
            kind: "bad",
          },
        ],
      };
    }

    if (!moveId.startsWith("relax:")) {
      return { state, events: [], error: "Unknown move." };
    }

    const road = roadOf(moveId.slice("relax:".length));
    if (!road) return { state, events: [], error: "That road is not in the network." };

    const from = state.d[road.from];
    const before = state.d[road.to];
    const candidate = from === null ? null : from + road.w;
    const lowered = candidate !== null && (before === null || candidate < before);
    const relaxations = state.relaxations + 1;
    const d = lowered ? { ...state.d, [road.to]: candidate } : state.d;
    const used = lowered && !state.used.includes(road.id) ? [...state.used, road.id] : state.used;
    const events: GameEvent[] = [];

    if (from === null) {
      events.push({
        text: `Round ${relaxations}: ${road.from}→${road.to}. d(${road.from}) is ∞, so nothing crosses. No label falls; the round is spent.`,
        kind: "info",
      });
    } else if (lowered) {
      events.push({
        text: `Round ${relaxations}: ${road.from}→${road.to} sets d(${road.to}) = ${candidate} (${from} ${
          road.w < 0 ? "−" : "+"
        } ${Math.abs(road.w)}).`,
        kind: "good",
      });
    } else {
      events.push({
        text: `Round ${relaxations}: ${road.from}→${road.to} gives ${candidate}, not below d(${road.to}) = ${fmt(
          before,
        )}. No label falls; the round is spent.`,
        kind: "info",
      });
    }

    return {
      state: { ...state, d, relaxations, lastEdge: road.id, used },
      events,
    };
  },

  view(state) {
    const positions: Record<string, [number, number]> = {
      S: [60, 170],
      P: [220, 70],
      Q: [220, 270],
      R: [420, 50],
      T: [590, 170],
    };
    const lastHead = state.lastEdge === null ? null : roadOf(state.lastEdge)?.to ?? null;

    return {
      kind: "graph",
      height: 340,
      nodes: TOWNS.map((id) => {
        let nodeState: "target" | "active" | "done" | "idle" = "idle";
        if (id === "T") nodeState = "target";
        else if (id === lastHead) nodeState = "active";
        else if (state.d[id] !== null) nodeState = "done";
        return {
          id,
          x: positions[id][0],
          y: positions[id][1],
          label: id,
          sub: `d ${fmt(state.d[id])}`,
          state: nodeState,
        };
      }),
      edges: ROADS.map((road) => ({
        id: road.id,
        from: road.from,
        to: road.to,
        label: road.w < 0 ? `−${Math.abs(road.w)}` : String(road.w),
        directed: true,
        state: (state.lastEdge === road.id
          ? "active"
          : state.used.includes(road.id)
            ? "done"
            : "idle") as "active" | "done" | "idle",
        moveId: state.certified ? undefined : `relax:${road.id}`,
        aria: `${road.from} to ${road.to}, weight ${road.w}.`,
      })),
      caption: state.certified
        ? `Round ${roundOf(state)} · d = ${TOWNS.map((id) => fmt(state.d[id])).join(", ")} · ${
            state.d.T === 3 ? "certified" : "refused"
          }`
        : `Round ${roundOf(state)} · d = ${TOWNS.map((id) => fmt(state.d[id])).join(
            ", ",
          )} · clean certificate: round 4`,
    };
  },

  status(state) {
    return statusOf(state);
  },

  score(state) {
    if (statusOf(state) !== "won") return { stars: 1, detail: "The row is not certified." };
    const round = roundOf(state);
    if (round <= 4) {
      return { stars: 3, detail: "Certified on round 4: S 0, P 4, Q 5, R 7, T 3." };
    }
    if (round === 5) {
      return {
        stars: 2,
        detail: "Certified on round 5: the row is 0, 4, 5, 7, 3; the clean certificate is round 4.",
      };
    }
    return {
      stars: 1,
      detail: `Certified on round ${round}: the row is 0, 4, 5, 7, 3; the clean certificate is round 4.`,
    };
  },

  solution: ["relax:S-P", "relax:P-R", "relax:R-T", "certify"],
};

export default level;
