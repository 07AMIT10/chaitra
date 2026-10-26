import { useEffect, useState } from "react";

import { ACTS, LEVEL_META, prevMeta } from "../../game/levels/meta";
import { ACT_LORE, ENDING, LORE } from "../../game/lore";
import type { LevelMeta } from "../../game/types";
import {
  EMPTY_PROGRESS,
  loadProgress,
  resetProgress,
  type Progress,
} from "../../game/progress";
import {
  endingSummary,
  logProgress,
  loreEntriesFromLore,
  nextMission,
  type FragmentProgress,
} from "../../game/progression";
import GameMap from "./GameMap";
import "../../styles/game.css";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** One sentence, without cutting through a decimal such as 0.000807. */
function firstSentence(text: string): string {
  const cut = text.search(/[.!?]\s+(?=[A-Z“"'])/);
  return cut === -1 ? text : text.slice(0, cut + 1);
}

type DeckSummary = {
  act: (typeof ACTS)[number];
  levels: LevelMeta[];
  repaired: number;
  clean: number;
};

const LORE_ENTRIES = loreEntriesFromLore(LORE, ACT_LORE, ENDING, LEVEL_META);

function ShipLog({ log }: { log: FragmentProgress }) {
  const recovered = log.entries.filter(
    (entry) => entry.kind === "fragment" && entry.unlocked && entry.mission,
  );
  const latest = recovered[recovered.length - 1] ?? null;
  const latestText = latest?.mission ? LORE[latest.mission] : null;
  const latestDeck = latest?.act ? ACTS.find((act) => act.act === latest.act) : null;

  return (
    <section className="game-shiplog" id="ship-log" aria-labelledby="game-shiplog-title">
      <header className="game-shiplog__head">
        <div className="game-shiplog__ident">
          <p className="game-kicker game-shiplog__kicker">Ship&rsquo;s log · recovered fragments</p>
          <h2 className="game-shiplog__title" id="game-shiplog-title">
            The log
          </h2>
        </div>
        <p
          className="game-shiplog__count"
          aria-label={`${log.unlocked} of ${log.total} fragments recovered`}
        >
          <span className="game-shiplog__count-value">
            <b>{pad(log.unlocked)}</b>
            <span> / {pad(log.total)}</span>
          </span>
          <span className="game-shiplog__count-label">fragments recovered</span>
        </p>
      </header>

      {latest && latestText ? (
        <div className="game-shiplog__latest">
          <p className="game-shiplog__latest-id">
            Latest fragment · Mission {pad(latest.number ?? 0)}
            {latestDeck ? ` · ${latestDeck.name}` : ""}
          </p>
          <h3 className="game-shiplog__latest-title">{latestText.title}</h3>
          <p className="game-shiplog__latest-line">{firstSentence(latestText.fragment)}</p>
        </div>
      ) : (
        <p className="game-shiplog__empty">
          No fragment recovered. The first repair opens the log.
        </p>
      )}

      <details className="game-shiplog__details">
        <summary className="game-shiplog__summary">
          <span>
            {log.unlocked > 0
              ? `Read the log · ${pad(log.unlocked)} fragments`
              : "The log is sealed"}
          </span>
          <span className="game-shiplog__mark" aria-hidden="true" />
        </summary>
        <div className="game-shiplog__body">
          {recovered.length > 0 ? (
            <ol className="game-shiplog__entries">
              {recovered.map((entry) => {
                const text = entry.mission ? LORE[entry.mission] : null;
                const deck = entry.act ? ACTS.find((act) => act.act === entry.act) : null;
                return (
                  <li className="game-shiplog__entry" key={entry.id}>
                    <p className="game-shiplog__entry-id">
                      Mission {pad(entry.number ?? 0)}
                      {deck ? ` · ${deck.name}` : ""}
                    </p>
                    <h3 className="game-shiplog__entry-title">
                      {text?.title ?? entry.title ?? "Untitled fragment"}
                    </h3>
                    <p className="game-shiplog__entry-line">
                      {text?.fragment ?? "No fragment text on file."}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="game-shiplog__empty">
              The archive is empty. Repair a system to recover its fragment.
            </p>
          )}
          <p className="game-shiplog__remaining">
            {log.remaining === 0
              ? "The log is whole."
              : `${log.remaining} ${log.remaining === 1 ? "fragment remains" : "fragments remain"} sealed. Repairs open them.`}
          </p>
        </div>
      </details>
    </section>
  );
}

function ShipSchematic({
  decks,
  progress,
  nextSlug,
  solved,
  total,
  isUnlocked,
}: {
  decks: DeckSummary[];
  progress: Progress;
  nextSlug: string | null;
  solved: number;
  total: number;
  isUnlocked: (meta: LevelMeta) => boolean;
}) {
  return (
    <div className="game-schematic" aria-hidden="true">
      <div className="game-schematic__meta">
        <span>Hull elevation</span>
        <span>CV Chaitra · final approach</span>
      </div>

      <svg
        className="game-schematic__svg"
        viewBox="0 0 600 330"
        role="presentation"
        focusable="false"
      >
        <g className="ship-grid">
          <path d="M20 42h560M20 288h560" />
          <path d="M42 20v290M558 20v290" />
        </g>

        <g className="ship-engine">
          <path d="M18 140h22v64H18z" />
          <path d="M26 150h8M26 162h8M26 174h8M26 186h8M26 198h8" />
          <path d="M8 152l10 4M8 174h10M8 196l10-4" />
        </g>

        <g className="ship-hull">
          <path
            className="ship-hull__outer"
            d="M34 180C58 128 118 82 184 76H430L542 156L568 180L542 204L430 284H184C118 278 58 232 34 180Z"
          />
          <path
            className="ship-hull__inner"
            d="M50 180C72 138 126 94 188 88H424L524 160L540 180L524 200L424 272H188C126 266 72 222 50 180Z"
          />
          <g className="ship-ribs">
            {Array.from({ length: 13 }, (_, i) => (
              <path key={i} d={`M${104 + i * 28} 88v184`} />
            ))}
          </g>
          <path className="ship-hull__spine" d="M64 180h472" />
        </g>

        <g className="ship-core">
          <circle cx="493" cy="180" r="15" />
          <circle cx="493" cy="180" r="8" />
          <path d="M493 158v-5M493 207v-5M471 180h-5M520 180h-5" />
        </g>

        <g className="ship-decks">
          {decks.map((deck, index) => {
            const y = 126 + index * 54;
            const levels = deck.levels;
            const start = 150;
            const end = 444;
            const step = levels.length > 1 ? (end - start) / (levels.length - 1) : 0;
            return (
              <g key={deck.act.act} className={deck.levels.length === 0 ? "is-sealed" : ""}>
                <text className="ship-deck-label" x="96" y={y + 3} textAnchor="end">
                  D{index + 1}
                </text>
                <path className="ship-deck-line" d={`M${start} ${y}H${end}`} />
                {levels.map((level, levelIndex) => {
                  const record = progress.levels[level.slug];
                  const isNext = !record && level.slug === nextSlug;
                  const locked = !record && !isNext && !isUnlocked(level);
                  const state = record ? "repaired" : isNext ? "next" : locked ? "locked" : "open";
                  const x = levels.length === 1 ? 300 : start + levelIndex * step;
                  return (
                    <g key={level.slug} className={`ship-marker is-${state}`}>
                      <path className="ship-marker__tick" d={`M${x} ${y - 8}v16`} />
                      <circle className="ship-marker__body" cx={x} cy={y} r={isNext ? 5.5 : 3.8} />
                      {isNext && (
                        <circle className="ship-marker__orbit" cx={x} cy={y} r="11" />
                      )}
                      {record?.stars === 3 && (
                        <circle className="ship-marker__clean" cx={x + 9} cy={y - 9} r="2.2" />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        <g className="ship-labels">
          <path className="ship-callout" d="M118 76V60h78" />
          <text x="204" y="63">pressure hull</text>
          <path className="ship-callout" d="M466 284v12h-84" />
          <text x="374" y="303">repair registry</text>
          <text className="ship-coord" x="42" y="320">FRAME A · 000</text>
          <text className="ship-coord" x="558" y="320" textAnchor="end">FRAME B · 330</text>
        </g>
      </svg>

      <div className="game-schematic__ledger">
        {decks.map((deck) => {
          const percent =
            deck.levels.length > 0
              ? Math.round((deck.repaired / deck.levels.length) * 100)
              : 0;
          return (
            <div
              className={`game-schematic__deck${deck.repaired === deck.levels.length && deck.levels.length > 0 ? " is-clear" : ""}`}
              key={deck.act.act}
            >
              <span className="game-schematic__deck-id">D{pad(deck.act.act)}</span>
              <span className="game-schematic__deck-name">{deck.act.name}</span>
              <span className="game-schematic__deck-bar">
                <span style={{ width: `${percent}%` }} />
              </span>
              <span className="game-schematic__deck-count">
                {pad(deck.repaired)} / {pad(deck.levels.length)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="game-schematic__foot">
        <span className="game-schematic__online">
          <span className="game-schematic__dot" />
          Systems online
        </span>
        <span className="game-schematic__count">
          <b>{pad(solved)}</b> / {pad(total)}
        </span>
      </div>
    </div>
  );
}

export default function GameHub() {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const total = LEVEL_META.length;
  const decks: DeckSummary[] = ACTS.map((act) => {
    const levels = LEVEL_META.filter((level) => level.act === act.act);
    return {
      act,
      levels,
      repaired: levels.filter((level) => progress.levels[level.slug]).length,
      clean: levels.filter((level) => progress.levels[level.slug]?.stars === 3).length,
    };
  });
  const solved = decks.reduce((sum, deck) => sum + deck.repaired, 0);
  const clean = decks.reduce((sum, deck) => sum + deck.clean, 0);
  const clearedDecks = decks.filter(
    (deck) => deck.levels.length > 0 && deck.repaired === deck.levels.length,
  ).length;
  const next = nextMission(LEVEL_META, progress);
  const log = logProgress(LEVEL_META, progress, LORE_ENTRIES);
  const ending = endingSummary(LEVEL_META, progress, { lore: LORE_ENTRIES });
  const complete = ending.unlocked;
  const nextSlug = next?.meta.slug ?? null;
  const finalMeta = LEVEL_META[LEVEL_META.length - 1] ?? null;

  function isUnlocked(meta: LevelMeta): boolean {
    const previous = prevMeta(meta.slug);
    return !previous || Boolean(progress.levels[previous.slug]);
  }

  function reset() {
    if (typeof window === "undefined") return;
    if (window.confirm("Reset all repair progress? This clears only this browser.")) {
      setProgress(resetProgress());
    }
  }

  return (
    <div className="game-hub">
      <nav className="game-breadcrumb game-hub__crumb" aria-label="Breadcrumb">
        <a href="/algorithms">Algorithms</a>
        <span aria-hidden="true">/</span>
        <span>The Long Repair</span>
      </nav>

      <header className="game-hub__hero">
        <div className="game-hub__copy">
          <p className="game-hub__kicker">
            <span className="game-hub__signal" aria-hidden="true" />
            Salvage console · CV Chaitra
          </p>
          <h1 className="game-hub__title">
            <span>The Long</span>
            <span>Repair</span>
          </h1>
          <p className="game-hub__line">The ship is dying. The mathematics is the manual.</p>
          <p className="game-hub__sub">Make the algorithm&rsquo;s next move. Undo is free.</p>

          <div className="game-hub__stats" aria-label="Campaign progress">
            <div className="game-hub__stat">
              <span className="game-hub__stat-key">Systems repaired</span>
              <span className="game-hub__stat-value">
                <b>{pad(solved)}</b>
                <span> / {pad(total)}</span>
              </span>
            </div>
            <div className="game-hub__stat">
              <span className="game-hub__stat-key">Clean runs</span>
              <span className="game-hub__stat-value">
                <b>{pad(clean)}</b>
              </span>
            </div>
            <div className="game-hub__stat">
              <span className="game-hub__stat-key">Decks cleared</span>
              <span className="game-hub__stat-value">
                <b>{pad(clearedDecks)}</b>
                <span> / {pad(ACTS.length)}</span>
              </span>
            </div>
          </div>
        </div>

        <ShipSchematic
          decks={decks}
          progress={progress}
          nextSlug={nextSlug}
          solved={solved}
          total={total}
          isUnlocked={isUnlocked}
        />
      </header>

      {complete ? (
        <section className="game-ending" id="ending" aria-labelledby="game-ending-title">
          <div className="game-ending__main">
            <p className="game-ending__kicker">
              <span className="game-ending__signal" aria-hidden="true" />
              Campaign complete · CV Chaitra
            </p>
            <h2 className="game-ending__title" id="game-ending-title">
              {ENDING.title}
            </h2>
            <p className="game-ending__transmission">{ENDING.transmission}</p>
            <div className="game-ending__actions">
              <a className="game-ending__primary" href="#ship-log">
                Open the archive
                <span className="game-ending__arrow" aria-hidden="true">
                  →
                </span>
              </a>
              {finalMeta && (
                <a
                  className="game-ending__secondary"
                  href={`/algorithms/game/${finalMeta.slug}`}
                >
                  Replay the final repair
                </a>
              )}
            </div>
            <p className="game-ending__epilogue">{ENDING.epilogue}</p>
          </div>

          <dl className="game-ending__summary" aria-label="Campaign summary">
            <div className="game-ending__stat">
              <dt>Systems</dt>
              <dd>
                <b>{pad(solved)}</b>
                <span> / {pad(total)}</span>
              </dd>
            </div>
            <div className="game-ending__stat">
              <dt>Clean runs</dt>
              <dd>
                <b>{pad(clean)}</b>
              </dd>
            </div>
            <div className="game-ending__stat">
              <dt>Fragments</dt>
              <dd>
                <b>{pad(log.unlocked)}</b>
                <span> / {pad(log.total)}</span>
              </dd>
            </div>
            <div className="game-ending__stat">
              <dt>Decks cleared</dt>
              <dd>
                <b>{pad(clearedDecks)}</b>
                <span> / {pad(ACTS.length)}</span>
              </dd>
            </div>
          </dl>
        </section>
      ) : next ? (
        <a className="game-continue" href={`/algorithms/game/${next.meta.slug}`}>
          <span className="game-continue__mark" aria-hidden="true">
            {pad(next.meta.number)}
          </span>
          <span className="game-continue__body">
            <span className="game-continue__kicker">
              {next.index === 0 ? "Begin repair" : "Next repair"}
            </span>
            <span className="game-continue__title">{next.meta.title}</span>
            <span className="game-continue__meta">
              <span>Mission {pad(next.meta.number)}</span>
              <span>
                Deck {pad(next.deck.act)} · {next.deck.name}
              </span>
              <span>{next.meta.algorithm}</span>
              <span>{next.meta.minutes} min</span>
            </span>
          </span>
          <span className="game-continue__cta">
            Resume repair
            <span className="game-continue__arrow" aria-hidden="true">
              →
            </span>
          </span>
        </a>
      ) : null}

      <GameMap
        metas={LEVEL_META}
        progress={progress}
        nextSlug={nextSlug}
        isUnlocked={isUnlocked}
      />

      <div className="game-hub__tail">
        <ShipLog log={log} />

        <section className="game-how" aria-label="How a repair works">
          <details className="game-how__details">
            <summary className="game-how__summary">
              <span className="game-how__title">How a repair works</span>
              <span className="game-how__mark" aria-hidden="true" />
            </summary>
            <div className="game-how__body">
              <ol>
                <li>
                  Read the transmission. The goal is one sentence; the constraint is the rule you
                  must keep.
                </li>
                <li>
                  Make the move on the board. The ship enforces the rule and names it when the move
                  breaks it.
                </li>
                <li>
                  Undo is free. Solve the system to unlock the next one; a clean run is recorded
                  without gating anything.
                </li>
              </ol>
              <p className="game-how__ethics">
                Progress stays in this browser only. No accounts, streaks, or timers.
              </p>
            </div>
          </details>
        </section>
      </div>

      <footer className="game-hub__footer">
        <a className="game-hub__link" href="/algorithms">
          ← Algorithms, as mathematics
        </a>
        {solved > 0 && (
          <button type="button" className="game-hub__reset" onClick={reset}>
            Reset repair progress
          </button>
        )}
      </footer>
    </div>
  );
}
