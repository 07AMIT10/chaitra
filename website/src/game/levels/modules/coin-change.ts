import type {
  ArrayView,
  GameEvent,
  LevelModule,
  Move,
  NodeState,
  Status,
} from "../../types";
import { coinChangeMeta } from "../meta/coin-change";

type CoinState = {
  remaining: number;
  spent: number[];
};

const COINS = [1, 3, 4] as const;
const AMOUNT = 6;
const CLEAN = 2;

function initialState(): CoinState {
  return { remaining: AMOUNT, spent: [] };
}

function statusOf(state: CoinState): Status {
  return state.remaining === 0 ? "won" : "playing";
}

function spentLine(state: CoinState): string {
  return `${state.spent.length} canister${state.spent.length === 1 ? "" : "s"} spent${state.spent.length > 0 ? ` (${state.spent.join(" + ")})` : ""}.`;
}

function remainText(amount: number): string {
  return amount === 1 ? "1 liter remains" : `${amount} liters remain`;
}

const level: LevelModule<CoinState> = {
  meta: coinChangeMeta,
  initial: initialState(),

  moves(state) {
    if (state.remaining === 0) return [];
    return COINS.map<Move>((coin) => ({
      id: `spend:${coin}`,
      label: `Spend ${coin} L`,
      placement: "board",
    }));
  },

  apply(state, moveId) {
    const [kind, raw] = moveId.split(":");
    if (kind !== "spend" || !raw) {
      return { state, events: [], error: "Unknown move." };
    }
    const coin = Number(raw);
    if (!Number.isInteger(coin) || !COINS.includes(coin as (typeof COINS)[number])) {
      return { state, events: [], error: "That canister is not in the depot." };
    }
    if (state.remaining === 0) {
      return {
        state,
        events: [],
        error: "The chamber is at 0 liters; no canister fits.",
      };
    }
    if (coin > state.remaining) {
      return {
        state,
        events: [],
        error: `A ${coin}-liter canister does not fit: ${remainText(state.remaining)}.`,
      };
    }

    const remaining = state.remaining - coin;
    const spent = [...state.spent, coin];
    const next: CoinState = { remaining, spent };
    const events: GameEvent[] = [
      {
        text: `Spent ${coin} L. ${remainText(remaining)}.`,
        kind: "info",
      },
    ];

    if (remaining === 0) {
      events.push(
        spent.length === CLEAN
          ? {
              text: `0 liters. ${spent.join(" + ")}: the two-canister shortest path.`,
              kind: "good",
            }
          : {
              text: `0 liters in ${spent.length} canisters (${spent.join(" + ")}). The shortest path from 6 is 2.`,
              kind: "info",
            },
      );
    } else if (spent.length === CLEAN) {
      events.push({
        text: `${remainText(remaining)} after two canisters; a third closes it, one above the 3 + 3 path.`,
        kind: "info",
      });
    }

    return { state: next, events };
  },

  view(state): ArrayView {
    const fits = (coin: number) => coin <= state.remaining;
    const items: ArrayView["items"] = [
      {
        id: "amount",
        value: state.remaining,
        label: state.remaining === 1 ? "liter left" : "liters left",
        state: state.remaining === 0 ? "done" : "active",
        aria: `${remainText(state.remaining)}.`,
      },
      ...COINS.map((coin) => {
        const coinState: NodeState = state.remaining === 0 ? "done" : fits(coin) ? "active" : "idle";
        return {
          id: `coin-${coin}`,
          value: coin,
          label: coin === 1 ? "liter" : "liters",
          state: coinState,
          moveId: state.remaining === 0 ? undefined : `spend:${coin}`,
          aria: fits(coin)
            ? `Spend a ${coin}-liter canister; ${remainText(state.remaining)}.`
            : `A ${coin}-liter canister does not fit; ${remainText(state.remaining)}.`,
        };
      }),
    ];

    return {
      kind: "array",
      caption: `Canisters spent: ${state.spent.length}${state.spent.length > 0 ? ` (${state.spent.join(" + ")})` : ""} · Remaining: ${state.remaining} L · Clean run: ${CLEAN}`,
      items,
    };
  },

  status: statusOf,

  score(state) {
    if (state.remaining !== 0) {
      return {
        stars: 1,
        detail: `${spentLine(state)} ${remainText(state.remaining)}.`,
      };
    }
    if (state.spent.length === CLEAN) {
      return {
        stars: 3,
        detail: `2 canisters: ${state.spent.join(" + ")}. The amount reaches 0 on the shortest path.`,
      };
    }
    if (state.spent.length === 3) {
      return {
        stars: 2,
        detail: `3 canisters (${state.spent.join(" + ")}). The shortest path from 6 is 3 + 3, two canisters.`,
      };
    }
    return {
      stars: 1,
      detail: `${state.spent.length} canisters (${state.spent.join(" + ")}). The path from 6 to 0 is longer than 2.`,
    };
  },

  solution: ["spend:3", "spend:3"],
};

export default level;
