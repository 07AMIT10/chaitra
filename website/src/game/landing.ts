import type { LevelMeta } from "./types";
import type { Progress } from "./progress";
import type { ParkLoadResult, ParkRecord } from "./park";
import { nextMission, missionAccess } from "./progression";

export type LandingDecision =
  | {
      kind: "mission";
      slug: string;
      meta: LevelMeta;
      parked?: ParkRecord;
      clearPark?: boolean;
    }
  | {
      kind: "map";
      reason: "complete" | "parked-sealed" | "no-missions";
      parkSlug?: string;
    };

export function campaignComplete(
  metas: readonly LevelMeta[] | LevelMeta[],
  progress: Progress,
): boolean {
  if (metas.length < 24) return false;
  return metas.every((m) => Boolean(progress.levels[m.slug]));
}

export function resolveLanding(
  metas: readonly LevelMeta[] | LevelMeta[],
  progress: Progress,
  parkResult: ParkLoadResult | null,
  _now?: number,
): LandingDecision {
  if (metas.length === 0) {
    return { kind: "map", reason: "no-missions" };
  }
  if (campaignComplete(metas, progress)) {
    return { kind: "map", reason: "complete" };
  }

  // If a valid unexpired park record exists
  if (parkResult?.record) {
    const meta = metas.find((m) => m.slug === parkResult.record!.slug);
    if (meta) {
      const access = missionAccess(metas, progress, meta.slug);
      const isAllowed = Boolean(
        (access as { allowed?: boolean; open?: boolean }).allowed ?? access.open,
      );
      if (isAllowed) {
        return {
          kind: "mission",
          slug: meta.slug,
          meta,
          parked: parkResult.record,
        };
      }
      return {
        kind: "map",
        reason: "parked-sealed",
        parkSlug: meta.slug,
      };
    }
  }

  const shouldClearPark = Boolean(parkResult?.expired);
  const next = nextMission(metas, progress);
  if (next) {
    return {
      kind: "mission",
      slug: next.meta.slug,
      meta: next.meta,
      ...(shouldClearPark ? { clearPark: true } : {}),
    };
  }

  return {
    kind: "mission",
    slug: metas[0].slug,
    meta: metas[0],
    ...(shouldClearPark ? { clearPark: true } : {}),
  };
}
