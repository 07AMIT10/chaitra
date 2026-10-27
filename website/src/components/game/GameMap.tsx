import { Fragment, useState } from "react";

import { ACTS } from "../../game/levels/meta";
import type { Progress } from "../../game/progress";
import {
  actProgress,
  actTransition,
  type ActProgress,
  type ActTransition,
} from "../../game/progression";
import type { Act, LevelMeta } from "../../game/types";

type Props = {
  metas: LevelMeta[];
  progress: Progress;
  nextSlug: string | null;
  isUnlocked: (meta: LevelMeta) => boolean;
};

type NodeState = "repaired" | "next" | "open" | "locked";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function nodeState(
  meta: LevelMeta,
  progress: Progress,
  nextSlug: string | null,
  isUnlocked: (meta: LevelMeta) => boolean,
): NodeState {
  if (progress.levels[meta.slug]) return "repaired";
  if (meta.slug === nextSlug) return "next";
  if (!isUnlocked(meta)) return "locked";
  return "open";
}

function stateLabel(state: NodeState): string {
  if (state === "repaired") return "Repaired";
  if (state === "next") return "Next repair";
  if (state === "open") return "Open";
  return "Sealed";
}

function NodeGlyph({
  meta,
  state,
  clean,
}: {
  meta: LevelMeta;
  state: NodeState;
  clean: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <polygon
        className="game-map__node-shell"
        points="15,2 49,2 62,15 62,49 49,62 15,62 2,49 2,15"
      />
      <polygon
        className="game-map__node-inner"
        points="18,6 46,6 58,18 58,46 46,58 18,58 6,46 6,18"
      />
      <text className="game-map__node-num" x="32" y="34" textAnchor="middle">
        {pad(meta.number)}
      </text>
      {state === "repaired" && (
        <path className="game-map__node-check" d="M24 45l4 4 10-10" />
      )}
      {state === "next" && (
        <path className="game-map__node-chevron" d="M27 45l5 4 5-4" />
      )}
      {state === "open" && <circle className="game-map__node-open" cx="32" cy="46" r="2.2" />}
      {state === "locked" && (
        <path className="game-map__node-lock" d="M28 46h8" />
      )}
      {clean && <circle className="game-map__node-clean" cx="49" cy="15" r="3" />}
    </svg>
  );
}

function MapNode({
  meta,
  state,
  clean,
  inspected,
  onInspect,
}: {
  meta: LevelMeta;
  state: NodeState;
  clean: boolean;
  inspected: boolean;
  onInspect: (slug: string) => void;
}) {
  const label = `Mission ${pad(meta.number)}, ${meta.title}, ${meta.algorithm}, ${meta.minutes} minutes. ${stateLabel(state)}${state === "repaired" ? ", replay available" : ""}${clean ? ", clean run" : ""}.`;

  if (state === "locked") {
    return (
      <span
        className={`game-map__node is-locked${inspected ? " is-inspected" : ""}`}
        aria-disabled="true"
        onMouseEnter={() => onInspect(meta.slug)}
      >
        <NodeGlyph meta={meta} state={state} clean={false} />
        <span className="visually-hidden">{label}</span>
      </span>
    );
  }

  return (
    <a
      className={`game-map__node is-${state}${inspected ? " is-inspected" : ""}`}
      href={`/algorithms/game/${meta.slug}`}
      aria-label={label}
      aria-current={state === "next" ? "step" : undefined}
      onMouseEnter={() => onInspect(meta.slug)}
      onFocus={() => onInspect(meta.slug)}
    >
      <NodeGlyph meta={meta} state={state} clean={clean} />
      {state === "next" && (
        <span className="game-map__slot-tag" aria-hidden="true">
          Next
        </span>
      )}
    </a>
  );
}

function ActCurtain({
  transition,
  href,
}: {
  transition: ActTransition;
  href: string | null;
}) {
  if (!transition.due || !transition.nextDeck || !href) return null;
  const deck = transition.nextDeck;

  return (
    <aside className="game-curtain" aria-label={`${deck.label} opening`}>
      <div className="game-curtain__body">
        <p className="game-curtain__kicker">{transition.kicker}</p>
        <p className="game-curtain__line">{transition.nextLine}</p>
      </div>
      <a
        className="game-curtain__step"
        href={href}
        aria-label={`Step into ${deck.label}`}
      >
        Step in
        <span className="game-curtain__arrow" aria-hidden="true">
          →
        </span>
      </a>
    </aside>
  );
}

function Deck({
  act,
  state,
  progress,
  nextSlug,
  isUnlocked,
}: {
  act: (typeof ACTS)[number];
  state: ActProgress;
  progress: Progress;
  nextSlug: string | null;
  isUnlocked: (meta: LevelMeta) => boolean;
}) {
  const [inspectedSlug, setInspectedSlug] = useState<string | null>(null);
  const titleId = `game-deck-${act.act}-title`;
  const levels = state.levels;
  const hasNext = levels.some((level) => level.slug === nextSlug);
  const cleared = state.complete;

  const fallback =
    levels.find((level) => level.slug === nextSlug) ??
    levels.find((level) => !progress.levels[level.slug]) ??
    levels[levels.length - 1];

  const inspected = levels.find((level) => level.slug === inspectedSlug) ?? fallback;
  const record = inspected ? progress.levels[inspected.slug] : undefined;
  const nodeStatus = inspected ? nodeState(inspected, progress, nextSlug, isUnlocked) : null;

  return (
    <section
      className={`game-deck${hasNext ? " is-current" : ""}${cleared ? " is-cleared" : ""}${levels.length === 0 ? " is-sealed" : ""}`}
      aria-labelledby={titleId}
    >
      <header className="game-deck__head">
        <div className="game-deck__ident">
          <span className="game-deck__tag">Deck {pad(act.act)}</span>
          <h3 className="game-deck__name" id={titleId}>
            {act.name}
          </h3>
          {cleared && (
            <span className="game-deck__cleared">
              <span className="game-deck__cleared-mark" aria-hidden="true" />
              Deck cleared
            </span>
          )}
          <p className="game-deck__promise">{act.subtitle}</p>
        </div>
        <div className="game-deck__count">
          <span className="game-deck__count-label">Systems</span>
          <span className="game-deck__count-value">
            <b>{pad(state.repaired)}</b>
            <span> / {pad(levels.length)}</span>
          </span>
          <span className="game-deck__meter" aria-hidden="true">
            <span style={{ width: `${state.percent}%` }} />
          </span>
          <span className="visually-hidden">
            {state.repaired} of {levels.length} systems repaired, {state.clean} clean
            {state.clean === 1 ? " run" : " runs"}
            {cleared ? ". Deck cleared" : ""}.
          </span>
        </div>
      </header>

      {levels.length === 0 ? (
        <div className="game-deck__sealed">
          <span className="game-deck__sealed-rail" aria-hidden="true" />
          <p className="game-deck__sealed-note">No systems assigned. Deck sealed.</p>
        </div>
      ) : (
        <div className="game-deck__body">
          <div className="game-deck__rail">
            <ol className="game-deck__nodes" aria-label={`Deck ${act.act} systems`}>
              {levels.map((level) => {
                const levelState = nodeState(level, progress, nextSlug, isUnlocked);
                const levelRecord = progress.levels[level.slug];
                return (
                  <li className={`game-map__slot is-${levelState}`} key={level.slug}>
                    <MapNode
                      meta={level}
                      state={levelState}
                      clean={levelRecord?.stars === 3}
                      inspected={level.slug === inspected?.slug}
                      onInspect={setInspectedSlug}
                    />
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="game-deck__readout" aria-hidden="true">
            <div className="game-deck__readout-top">
              <span className="game-deck__readout-kicker">Inspection</span>
              <span
                className={`game-deck__state is-${nodeStatus ?? "locked"}${record?.stars === 3 ? " is-clean" : ""}`}
              >
                {stateLabel(nodeStatus ?? "locked")}
                {record?.stars === 3 ? " · Clean" : ""}
              </span>
            </div>
            {inspected ? (
              <>
                <span className="game-deck__readout-id">Mission {pad(inspected.number)}</span>
                <p className="game-deck__readout-title">{inspected.title}</p>
                <p className="game-deck__readout-meta">{inspected.algorithm}</p>
                <p className="game-deck__readout-data">
                  ~{inspected.minutes} min
                  {record ? ` · ${record.moves} moves · replay` : ""}
                  {nodeStatus === "locked" ? " · prior system required" : ""}
                </p>
              </>
            ) : (
              <p className="game-deck__readout-title">No systems assigned</p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

export default function GameMap({ metas, progress, nextSlug, isUnlocked }: Props) {
  const nextMeta = nextSlug ? metas.find((meta) => meta.slug === nextSlug) ?? null : null;
  const currentAct = nextMeta?.act ?? null;

  return (
    <section className="game-map" aria-labelledby="game-map-title">
      <header className="game-map__head">
        <div className="game-map__heading">
          <p className="game-kicker game-map__kicker">Ship schematic · repair registry</p>
          <h2 className="game-map__title" id="game-map-title">
            Mission map
          </h2>
          <p className="game-map__hint">Hover or focus to inspect. Select to open or replay.</p>
        </div>
        <ul className="game-map__legend" aria-label="Map key">
          <li className="game-map__legend-item">
            <span className="game-map__legend-key is-repaired" aria-hidden="true" />
            Repaired · replay
          </li>
          <li className="game-map__legend-item">
            <span className="game-map__legend-key is-clean" aria-hidden="true" />
            Clean run
          </li>
          <li className="game-map__legend-item">
            <span className="game-map__legend-key is-next" aria-hidden="true" />
            Next
          </li>
          <li className="game-map__legend-item">
            <span className="game-map__legend-key is-locked" aria-hidden="true" />
            Sealed
          </li>
        </ul>
      </header>

      <div className="game-map__decks">
        {ACTS.map((act) => {
          const state = actProgress(metas, progress, act.act);
          const previousAct = (act.act - 1) as Act;
          const curtain =
            currentAct === act.act && act.act > 1
              ? actTransition(metas, progress, previousAct)
              : null;
          const firstOfNextAct = curtain?.nextDeck?.act ?? null;
          const firstOfNext =
            firstOfNextAct != null
              ? metas.find((meta) => meta.act === firstOfNextAct) ?? null
              : null;

          return (
            <Fragment key={act.act}>
              {curtain && firstOfNext && (
                <ActCurtain
                  transition={curtain}
                  href={`/algorithms/game/${firstOfNext.slug}`}
                />
              )}
              <Deck
                act={act}
                state={state}
                progress={progress}
                nextSlug={nextSlug}
                isUnlocked={isUnlocked}
              />
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
