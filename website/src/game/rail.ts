export const HELP_IDLE_MS = 25_000;

export type HelpCheckParams = {
  hintIndex: number;
  hasRejection: boolean;
  status: "playing" | "won" | "lost";
  now?: number;
  lastAcceptedAt?: number;
};

export function shouldOfferHelp(params: HelpCheckParams): boolean {
  if (params.status !== "playing") return false;
  if (params.hintIndex > 0) return true;
  if (params.hasRejection) return true;
  if (params.lastAcceptedAt != null && params.now != null) {
    if (params.now - params.lastAcceptedAt >= HELP_IDLE_MS) return true;
  }
  return false;
}
