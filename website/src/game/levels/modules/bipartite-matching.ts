import type { GameEvent, LevelModule, Move, PairingView } from "../../types";
import { bipartiteMatchingMeta } from "../meta/bipartite-matching";

type BMState = {
  /** Alternating chain of applicant and role names, e.g. Ben, Wren, Ana, Xiu. */
  path: string[];
  matchLeft: Record<string, string | null>;
  matchRight: Record<string, string | null>;
  starts: number;
  backtracks: number;
  flips: number;
};

const LEFT = ["Ana", "Ben", "Cara", "Dan"];
const RIGHT = ["Wren", "Xiu", "Yara", "Zed"];

/** The six acceptable edges on the page. */
const ACCEPTS: Record<string, string[]> = {
  Ana: ["Wren", "Xiu", "Zed"],
  Ben: ["Wren"],
  Cara: ["Yara"],
  Dan: ["Yara"],
};

function isLeft(id: string): boolean {
  return LEFT.includes(id);
}

function isRight(id: string): boolean {
  return RIGHT.includes(id);
}

function placements(state: BMState): number {
  return LEFT.filter((id) => state.matchLeft[id] !== null).length;
}

function lastOf(state: BMState): string | null {
  return state.path.length === 0 ? null : state.path[state.path.length - 1];
}

function initialState(): BMState {
  return {
    path: [],
    matchLeft: { Ana: "Wren", Ben: null, Cara: "Yara", Dan: null },
    matchRight: { Wren: "Ana", Xiu: null, Yara: "Cara", Zed: null },
    starts: 0,
    backtracks: 0,
    flips: 0,
  };
}

const level: LevelModule<BMState> = {
  meta: bipartiteMatchingMeta,
  initial: initialState(),

  moves(state) {
    if (placements(state) >= 3) return [];

    const moves: Move[] = [];
    for (const id of LEFT) {
      moves.push({ id: `left:${id}`, label: `Select ${id}`, placement: "board" });
    }
    for (const id of RIGHT) {
      moves.push({ id: `right:${id}`, label: `Select ${id}`, placement: "board" });
    }

    const last = lastOf(state);
    if (last !== null) {
      if (isRight(last)) {
        moves.push({ id: "flip", label: "Flip the chain", placement: "tray" });
      }
      moves.push({ id: "backtrack", label: "Remove last link", placement: "tray" });
    }
    return moves;
  },

  apply(state, moveId) {
    if (placements(state) >= 3) {
      return {
        state,
        events: [],
        error: "The matching already holds 3 placements; the board's ceiling is 3.",
      };
    }

    if (moveId === "backtrack") {
      if (state.path.length === 0) {
        return { state, events: [], error: "No chain is open." };
      }
      const removed = state.path[state.path.length - 1];
      const path = state.path.slice(0, -1);
      return {
        state: { ...state, path, backtracks: state.backtracks + 1 },
        events: [
          {
            text:
              path.length === 0
                ? `Removed ${removed}. No chain is open.`
                : `Removed ${removed}. Chain: ${path.join(" → ")}.`,
            kind: "info",
          },
        ],
      };
    }

    if (moveId === "flip") {
      const last = lastOf(state);
      if (state.path.length < 2 || last === null || !isRight(last)) {
        return {
          state,
          events: [],
          error: "A chain must end at a role before it can be flipped.",
        };
      }

      const holder = state.matchRight[last];
      if (holder !== null) {
        return {
          state,
          events: [],
          error: `The chain ends at ${last}, held by ${holder}. Flipping would evict ${holder} and add no placement; follow the matched link to ${holder} or remove the last link.`,
        };
      }

      const nextLeft = { ...state.matchLeft };
      const nextRight = { ...state.matchRight };
      for (const id of state.path) {
        if (isLeft(id)) nextLeft[id] = null;
        else nextRight[id] = null;
      }

      const pairs: string[] = [];
      for (let i = 0; i < state.path.length; i += 2) {
        const applicant = state.path[i];
        const role = state.path[i + 1];
        nextLeft[applicant] = role;
        nextRight[role] = applicant;
        pairs.push(`${applicant}–${role}`);
      }

      const count = LEFT.filter((id) => nextLeft[id] !== null).length;
      const events: GameEvent[] = [
        {
          text: `Flipped ${state.path.join(" → ")}. New placements: ${pairs.join(", ")}. Board holds ${count} of 4.`,
          kind: "good",
        },
      ];
      if (count >= 3) {
        events.push({
          text: "Third placement. Dan has no chain to a free role: Cara and Dan accept only Yara.",
          kind: "info",
        });
      }

      return {
        state: {
          ...state,
          path: [],
          matchLeft: nextLeft,
          matchRight: nextRight,
          flips: state.flips + 1,
        },
        events,
      };
    }

    if (moveId.startsWith("left:")) {
      const id = moveId.slice("left:".length);
      if (!isLeft(id)) {
        return { state, events: [], error: `${id} is not an applicant on this roster.` };
      }
      if (state.path.includes(id)) {
        return { state, events: [], error: `${id} is already in this chain.` };
      }

      if (state.path.length === 0) {
        const held = state.matchLeft[id];
        if (held !== null) {
          return {
            state,
            events: [],
            error: `${id} already holds ${held}. An augmenting chain starts at a free applicant.`,
          };
        }
        return {
          state: { ...state, path: [id], starts: state.starts + 1 },
          events: [
            {
              text: `Chain opened at ${id}, a free applicant. Next: an acceptable role.`,
              kind: "info",
            },
          ],
        };
      }

      const last = state.path[state.path.length - 1];
      if (isLeft(last)) {
        return {
          state,
          events: [],
          error: `The chain is at ${last}, an applicant. The next link must be a role.`,
        };
      }
      if (isRight(last)) {
        const holder = state.matchRight[last];
        if (holder === null) {
          return {
            state,
            events: [],
            error: `${last} is a free role. The chain already ends at ${last}; flip it or remove the last link.`,
          };
        }
        if (holder !== id) {
          return {
            state,
            events: [],
            error: `${last} is held by ${holder}; the chain must follow the matched link to ${holder}.`,
          };
        }
        const path = [...state.path, id];
        return {
          state: { ...state, path },
          events: [
            {
              text: `Followed the matched link ${last} → ${id}. Next: an unmatched role from ${id}.`,
              kind: "info",
            },
          ],
        };
      }
      return { state, events: [], error: "Unknown link." };
    }

    if (moveId.startsWith("right:")) {
      const id = moveId.slice("right:".length);
      if (!isRight(id)) {
        return { state, events: [], error: `${id} is not a role on this roster.` };
      }
      if (state.path.includes(id)) {
        return { state, events: [], error: `${id} is already in this chain.` };
      }
      if (state.path.length === 0) {
        const free = LEFT.filter((applicant) => state.matchLeft[applicant] === null);
        return {
          state,
          events: [],
          error: `No chain is open. Start at a free applicant: ${free.join(", ")}.`,
        };
      }

      const last = state.path[state.path.length - 1];
      if (isRight(last)) {
        return {
          state,
          events: [],
          error: `The chain is at ${last}, a role. The next link must be an applicant.`,
        };
      }
      if (!ACCEPTS[last]?.includes(id)) {
        return {
          state,
          events: [],
          error: `${last} accepts ${ACCEPTS[last]?.join(", ") ?? "no role"}; ${id} is not on that list.`,
        };
      }
      if (state.matchLeft[last] === id) {
        return {
          state,
          events: [],
          error: `${last} already holds ${id}; an alternating chain leaves ${last} on an unmatched role.`,
        };
      }

      const holder = state.matchRight[id];
      if (holder !== null && state.path.includes(holder)) {
        return {
          state,
          events: [],
          error: `${id} is matched to ${holder}, already in this chain.`,
        };
      }

      const path = [...state.path, id];
      return {
        state: { ...state, path },
        events: [
          {
            text:
              holder === null
                ? `Chain reaches free role ${id}: ${path.join(" → ")}. Flip it to add one placement.`
                : `Reached ${id}, held by ${holder}. Follow the matched link to ${holder}.`,
            kind: "info",
          },
        ],
      };
    }

    return { state, events: [], error: "Unknown move." };
  },

  view(state) {
    const won = placements(state) >= 3;
    const inPath = new Set(state.path);
    const links: PairingView["links"] = [];

    for (const id of LEFT) {
      const role = state.matchLeft[id];
      if (role !== null) {
        links.push({ left: id, right: role, state: "done" });
      }
    }
    for (let i = 0; i + 1 < state.path.length; i += 2) {
      const applicant = state.path[i];
      const role = state.path[i + 1];
      if (state.matchLeft[applicant] !== role) {
        links.push({ left: applicant, right: role, state: "active" });
      }
    }

    const left: PairingView["left"] = LEFT.map((id) => ({
      id,
      label: id,
      state: inPath.has(id) ? "target" : state.matchLeft[id] !== null ? "done" : "idle",
      moveId: won ? undefined : `left:${id}`,
    }));
    const right: PairingView["right"] = RIGHT.map((id) => ({
      id,
      label: id,
      state: inPath.has(id) ? "target" : state.matchRight[id] !== null ? "done" : "idle",
      moveId: won ? undefined : `right:${id}`,
    }));

    const last = lastOf(state);
    const free = LEFT.filter((id) => state.matchLeft[id] === null);
    let caption: string;
    if (won) {
      caption = `Placements: 3 / 4 · maximum (Berge) · Hall: {Cara, Dan} → {Yara}`;
    } else if (state.path.length > 0) {
      const ending =
        last !== null && isRight(last)
          ? state.matchRight[last] === null
            ? " (free)"
            : " (held)"
          : "";
      caption = `Placements: ${placements(state)} / 4 · Chain: ${state.path.join(" → ")}${ending} · Clean run: 1 chain`;
    } else {
      caption = `Placements: ${placements(state)} / 4 · Chain: none · Free applicants: ${free.join(", ")} · Clean run: 1 chain`;
    }

    return {
      kind: "pairing",
      left,
      right,
      links,
      caption,
    };
  },

  status(state) {
    return placements(state) >= 3 ? "won" : "playing";
  },

  score(state) {
    if (placements(state) < 3) {
      return {
        stars: 1,
        detail: `${placements(state)} placements on the board; the ceiling is 3.`,
      };
    }
    if (state.starts === 1 && state.backtracks === 0) {
      return {
        stars: 3,
        detail: "Three placements from one chain; Dan has no augmenting route.",
      };
    }
    const chainWord = state.starts === 1 ? "start" : "starts";
    const linkWord = state.backtracks === 1 ? "link" : "links";
    if (state.starts <= 2 && state.backtracks <= 2) {
      return {
        stars: 2,
        detail: `Three placements; ${state.starts} chain ${chainWord} and ${state.backtracks} removed ${linkWord}.`,
      };
    }
    return {
      stars: 1,
      detail: `Three placements; ${state.starts} chain ${chainWord} and ${state.backtracks} removed ${linkWord}.`,
    };
  },

  solution: ["left:Ben", "right:Wren", "left:Ana", "right:Xiu", "flip"],
};

export default level;
