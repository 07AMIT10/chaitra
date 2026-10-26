import {
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

import { ACTS } from "../../game/levels/meta";
import { SHIP } from "../../game/lore";
import type { Progress, SolvedLevel } from "../../game/progress";
import type { LevelMeta } from "../../game/types";
import "../../styles/game-ship.css";

/**
 * Living-ship hero for the hub. A side elevation of the Chaitra, cut open to
 * three deck bands; every mission is a socket on those bands. The hull seam,
 * the deck conduits and the integrity rail all fill from the same progress, so
 * the ship heals as the campaign does.
 *
 * Playable systems (repaired, next, open) are links. Sealed systems are inert
 * by design, matching the campaign map; direct mission URLs still play.
 */

type Props = {
  levels: LevelMeta[];
  progress: Progress;
  nextSlug: string;
  className?: string;
};

type PortState = "repaired" | "next" | "open" | "locked";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function stateLabel(state: PortState | null, record?: SolvedLevel): string {
  if (state === "repaired") return record?.stars === 3 ? "Repaired · clean" : "Repaired";
  if (state === "next") return "Next repair";
  if (state === "open") return "Open";
  if (state === "locked") return "Sealed";
  return "No system selected";
}

/** A seeder hull: flat-backed stern, long ribbed body, bridge blister, seed bow. */
const HULL_PATH =
  "M104 54C144 32 204 24 276 24H920C948 26 962 40 974 56C982 70 986 110 990 170C986 230 982 270 974 284C962 300 948 314 920 316H276C204 316 144 308 104 286C62 264 42 220 42 170C42 120 62 76 104 54Z";

const RIB_X = Array.from({ length: 13 }, (_, index) => 120 + index * 62);

const OCTAGON = "14,2 30,2 42,14 42,30 30,42 14,42 2,30 2,14";
const OCTAGON_INNER = "17,6 27,6 38,17 38,27 27,38 17,38 6,27 6,17";
const OCTAGON_ORBIT = "17,0 27,0 44,17 44,27 27,44 17,44 0,27 0,17";

function PortGlyph({
  number,
  clean,
  state,
}: {
  number: number;
  clean: boolean;
  state: PortState;
}) {
  return (
    <span className="ship-port__glyph" aria-hidden="true">
      <svg viewBox="0 0 44 44" focusable="false">
        <polygon className="ship-port__shell" points={OCTAGON} />
        <polygon className="ship-port__inner" points={OCTAGON_INNER} />
        {state === "next" ? (
          <polygon className="ship-port__orbit" points={OCTAGON_ORBIT} />
        ) : null}
      </svg>
      <span className="ship-port__num">{pad(number)}</span>
      {clean ? <span className="ship-port__clean" /> : null}
    </span>
  );
}

export default function ShipSchematic({
  levels,
  progress,
  nextSlug,
  className,
}: Props) {
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, "");
  const rootRef = useRef<HTMLElement>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const ordered = [...levels].sort((a, b) => a.number - b.number);
  const indexBySlug = new Map(ordered.map((level, index) => [level.slug, index]));

  const total = ordered.length;
  const repaired = ordered.filter((level) => progress.levels[level.slug]).length;
  const clean = ordered.filter((level) => progress.levels[level.slug]?.stars === 3).length;
  const complete = total > 0 && repaired === total;
  const percent = total > 0 ? Math.round((repaired / total) * 100) : 0;
  const heal = total > 0 ? Math.max(0, Math.min(100, (repaired / total) * 100)) : 0;
  const deckCount = ACTS.filter((act) => ordered.some((level) => level.act === act.act)).length;

  const defaultSlug =
    ordered.find((level) => level.slug === nextSlug)?.slug ??
    ordered.find((level) => !progress.levels[level.slug])?.slug ??
    ordered[ordered.length - 1]?.slug ??
    null;

  const activeSlug = hoveredSlug ?? focusedSlug ?? selectedSlug ?? defaultSlug;
  const active = ordered.find((level) => level.slug === activeSlug) ?? null;
  const activeRecord = active ? progress.levels[active.slug] : undefined;
  const activeState = active ? stateOf(active) : null;
  const activeDeck = active
    ? ACTS.find((act) => act.act === active.act) ?? null
    : null;

  function stateOf(level: LevelMeta): PortState {
    if (progress.levels[level.slug]) return "repaired";
    if (level.slug === nextSlug) return "next";
    const index = indexBySlug.get(level.slug) ?? 0;
    if (index === 0 || progress.levels[ordered[index - 1].slug]) return "open";
    return "locked";
  }

  function portLabel(level: LevelMeta, state: PortState): string {
    const record = progress.levels[level.slug];
    const cleanText = record?.stars === 3 ? " Clean run." : "";
    const stateText =
      state === "repaired"
        ? "Repaired."
        : state === "next"
          ? "Next repair."
          : state === "open"
            ? "Open."
            : "Sealed. A prior system is required.";
    return `Mission ${pad(level.number)}, ${level.title}. ${level.algorithm}, ${level.minutes} minutes. ${stateText}${cleanText}`;
  }

  function moveFocus(event: KeyboardEvent<HTMLAnchorElement>) {
    const key = event.key;
    if (
      key !== "ArrowRight" &&
      key !== "ArrowLeft" &&
      key !== "ArrowUp" &&
      key !== "ArrowDown" &&
      key !== "Home" &&
      key !== "End"
    ) {
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    const current = event.currentTarget;
    const deck = Number(current.dataset.deck);
    const slot = Number(current.dataset.slot);
    const ports = Array.from(root.querySelectorAll<HTMLAnchorElement>("a.ship-port"));
    const inDeck = ports.filter((port) => Number(port.dataset.deck) === deck);
    let target: HTMLAnchorElement | undefined;

    if (key === "ArrowRight" || key === "ArrowLeft") {
      const index = ports.indexOf(current);
      target = ports[index + (key === "ArrowRight" ? 1 : -1)];
    } else if (key === "Home" || key === "End") {
      target = key === "Home" ? inDeck[0] : inDeck[inDeck.length - 1];
    } else {
      const direction = key === "ArrowUp" ? -1 : 1;
      for (let d = deck + direction; d >= 1 && d <= 3; d += direction) {
        const candidates = ports
          .filter((port) => Number(port.dataset.deck) === d)
          .sort(
            (a, b) =>
              Math.abs(Number(a.dataset.slot) - slot) -
              Math.abs(Number(b.dataset.slot) - slot),
          );
        if (candidates.length > 0) {
          target = candidates[0];
          break;
        }
      }
    }

    if (target && target !== current) {
      event.preventDefault();
      target.focus();
    }
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) setFocusedSlug(null);
  }

  const uidTitle = `${uid}-ship-title`;
  const uidDesc = `${uid}-ship-desc`;

  const decks = ACTS.map((act) => {
    const deckLevels = ordered.filter((level) => level.act === act.act);
    const deckRepaired = deckLevels.filter((level) => progress.levels[level.slug]).length;
    return { act, levels: deckLevels, repaired: deckRepaired };
  });

  return (
    <section
      ref={rootRef}
      className={`ship-schematic${complete ? " is-complete" : ""}${className ? ` ${className}` : ""}`}
      aria-labelledby={uidTitle}
      aria-describedby={uidDesc}
      onMouseLeave={() => setHoveredSlug(null)}
      onBlur={handleBlur}
    >
      <p className="visually-hidden" id={uidDesc}>
        Side cutaway of the generation ship {SHIP.name}, bound for {SHIP.destination}.
        Three deck bands carry {total} systems. Repaired systems are cyan, the next repair
        is amber, sealed systems are outlined. Use the arrow keys to move between ports;
        Enter opens a repair.
      </p>

      <header className="ship__head">
        <div className="ship__ident">
          <p className="ship__eyebrow">
            {SHIP.registry} · Seeder class
          </p>
          <h2 className="ship__name" id={uidTitle}>
            {SHIP.name}
          </h2>
        </div>
        <div className="ship__dest">
          <span className="ship__dest-key">Destination</span>
          <span className="ship__dest-name">{SHIP.destination}</span>
        </div>
      </header>

      <div className="ship__integrity">
        <span className="ship__integrity-label">
          {complete ? "Hull sound" : "Hull integrity"}
        </span>
        <div
          className="ship__meter"
          role="progressbar"
          aria-label="Hull integrity"
          aria-valuemin={0}
          aria-valuemax={total || 1}
          aria-valuenow={repaired}
          aria-valuetext={`${repaired} of ${total} systems repaired; hull integrity ${percent} percent`}
        >
          {ordered.map((level) => (
            <span
              key={level.slug}
              className={`ship__meter-seg is-${stateOf(level)}`}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="ship__integrity-value">
          <b>{pad(repaired)}</b>
          <span> / {pad(total)}</span>
          <i>{percent}%</i>
        </span>
      </div>

      <div className="ship__stage">
        <span className="ship__frame-tag" aria-hidden="true">
          Hull cutaway · {pad(deckCount)} decks
        </span>
        <span className="ship__sweep" aria-hidden="true" />

        <div className="ship__frame">
          <svg
            className="ship__hull-art"
            viewBox="0 0 1000 340"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <clipPath id={`${uid}-clip`}>
                <path d={HULL_PATH} />
              </clipPath>
              <pattern
                id={`${uid}-hatch`}
                width="9"
                height="9"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(38)"
              >
                <line className="ship__hatch-line" x1="0" y1="0" x2="0" y2="9" />
              </pattern>
            </defs>

            <g clipPath={`url(#${uid}-clip)`}>
              <path className="ship__hull-fill" d={HULL_PATH} />
              <rect
                className="ship__hull-hatch"
                x="8"
                y="0"
                width="196"
                height="340"
                fill={`url(#${uid}-hatch)`}
              />
              <rect
                className="ship__hull-hatch"
                x="836"
                y="0"
                width="164"
                height="340"
                fill={`url(#${uid}-hatch)`}
              />
              <g className="ship__ribs">
                {RIB_X.map((x) => (
                  <path key={x} className="ship__rib" d={`M${x} 0V340`} />
                ))}
              </g>
              <path className="ship__keel" d="M104 170H996" />
            </g>

            <path className="ship__hull-outer" d={HULL_PATH} vectorEffect="non-scaling-stroke" />
            <path
              className="ship__hull-inner"
              d="M110 58C150 38 208 30 278 30H914C940 32 954 42 966 56C974 70 978 108 982 170C978 232 974 270 966 284C954 298 940 308 914 310H278C208 310 150 302 110 282C74 262 54 218 54 170C54 122 74 78 110 58Z"
              vectorEffect="non-scaling-stroke"
            />

            <g className="ship__fins">
              <path d="M340 24L364 8H500L524 24" vectorEffect="non-scaling-stroke" />
              <path d="M260 316L282 332H392L414 316" vectorEffect="non-scaling-stroke" />
            </g>

            <g className="ship__engine">
              <path className="ship__engine-block" d="M10 112H52V228H10Z" />
              <path d="M10 124H2L0 132V148L2 156H10" />
              <path d="M10 158H0V182H10" />
              <path d="M10 186H2L0 192V208L2 216H10" />
              <path className="ship__engine-coil" d="M20 124V216M30 124V216M40 124V216" />
              <path className="ship__engine-brace" d="M52 136H64M52 204H64" />
              <path className="ship__engine-plume" d="M0 156H4M0 170H3M0 184H4" />
            </g>

            <g className="ship__bridge">
              <path d="M886 24C900 8 930 6 948 24" vectorEffect="non-scaling-stroke" />
              <path d="M900 19H938" vectorEffect="non-scaling-stroke" />
              <path d="M974 150C982 156 986 160 992 166" vectorEffect="non-scaling-stroke" />
              <path d="M974 190C982 184 986 180 992 174" vectorEffect="non-scaling-stroke" />
              <path className="ship__beacon" d="M992 166L996 170L992 174L988 170Z" />
            </g>

            <path
              className="ship__hull-heal"
              d={HULL_PATH}
              pathLength={100}
              style={{ strokeDasharray: `${heal} 100` }}
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <div className="ship__decks">
            {decks.map(({ act, levels: deckLevels, repaired: deckRepaired }) => {
              const deckTitleId = `${uid}-deck-${act.act}`;
              const clear = deckLevels.length > 0 && deckRepaired === deckLevels.length;
              return (
                <section
                  className={`ship-deck${clear ? " is-clear" : ""}`}
                  aria-labelledby={deckTitleId}
                  key={act.act}
                >
                  <header className="ship-deck__head">
                    <span className="ship-deck__no">Deck {pad(act.act)}</span>
                    <h3 className="ship-deck__name" id={deckTitleId}>
                      <span className="visually-hidden">Deck {act.act}, </span>
                      {act.name}
                    </h3>
                    <span className="ship-deck__promise">{act.subtitle}</span>
                    <span className="ship-deck__count">
                      <b>{pad(deckRepaired)}</b>
                      <span> / {pad(deckLevels.length)}</span>
                    </span>
                  </header>

                  {deckLevels.length > 0 ? (
                    <ol className="ship-deck__track" aria-label={`${act.name} systems`}>
                      {deckLevels.map((level, slot) => {
                        const state = stateOf(level);
                        const record = progress.levels[level.slug];
                        const cleanRun = record?.stars === 3;
                        const label = portLabel(level, state);
                        const glyph = (
                          <PortGlyph
                            number={level.number}
                            clean={cleanRun}
                            state={state}
                          />
                        );

                        return (
                          <li
                            key={level.slug}
                            className={`ship-deck__slot is-${state}${cleanRun ? " is-clean" : ""}`}
                          >
                            {state === "locked" ? (
                              <span
                                className={`ship-port is-locked${cleanRun ? " is-clean" : ""}`}
                                role="img"
                                aria-label={label}
                                data-deck={level.act}
                                data-slot={slot}
                                onMouseEnter={() => setHoveredSlug(level.slug)}
                              >
                                {glyph}
                              </span>
                            ) : (
                              <a
                                className={`ship-port is-${state}${cleanRun ? " is-clean" : ""}`}
                                href={`/algorithms/game/${level.slug}`}
                                aria-label={label}
                                aria-current={state === "next" ? "step" : undefined}
                                data-deck={level.act}
                                data-slot={slot}
                                onMouseEnter={() => setHoveredSlug(level.slug)}
                                onFocus={() => setFocusedSlug(level.slug)}
                                onClick={() => setSelectedSlug(level.slug)}
                                onKeyDown={moveFocus}
                              >
                                {glyph}
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="ship-deck__empty">No systems assigned. Deck sealed.</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ship__readout" data-state={activeState ?? "empty"} role="group" aria-label="System detail">
        {active ? (
          <>
            <div className="ship__readout-top">
              <span className="ship__readout-id">
                System {pad(active.number)} / {pad(total)}
              </span>
              <span className={`ship__state is-${activeState}`}>
                <span className="ship__state-dot" aria-hidden="true" />
                {stateLabel(activeState, activeRecord)}
              </span>
            </div>
            <div className="ship__readout-main" key={active.slug}>
              <p className="ship__readout-title">{active.title}</p>
              <p className="ship__readout-meta">
                <span className="ship__algo">{active.algorithm}</span>
                <span>{active.minutes} min</span>
                <span>
                  Deck {pad(active.act)}
                  {activeDeck ? ` · ${activeDeck.name}` : ""}
                </span>
                {activeState === "locked" ? (
                  <span className="ship__readout-sealed">Prior system required</span>
                ) : null}
                {activeRecord ? <span>{activeRecord.moves} moves</span> : null}
                {activeRecord?.stars === 3 ? (
                  <span className="ship__readout-clean">Clean run</span>
                ) : null}
              </p>
            </div>
          </>
        ) : (
          <p className="ship__readout-title">No systems assigned</p>
        )}
      </div>

      <footer className="ship__foot">
        <ul className="ship__legend" aria-label="Schematic key">
          <li>
            <span className="ship__legend-key is-repaired" aria-hidden="true" />
            Repaired
          </li>
          <li>
            <span className="ship__legend-key is-clean" aria-hidden="true" />
            Clean
          </li>
          <li>
            <span className="ship__legend-key is-next" aria-hidden="true" />
            Next
          </li>
          <li>
            <span className="ship__legend-key is-locked" aria-hidden="true" />
            Sealed
          </li>
        </ul>
        <p className="ship__crew">
          {clean} clean · {SHIP.crew}
        </p>
      </footer>
    </section>
  );
}
