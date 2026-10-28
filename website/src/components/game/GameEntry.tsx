import { useEffect } from "react";
import { LEVEL_META } from "../../game/levels/meta";
import { loadProgress } from "../../game/progress";
import { clearPark, loadPark } from "../../game/park";
import { resolveLanding } from "../../game/landing";
import { GAME_MAP_PATH } from "../../game/routes";

export default function GameEntry() {
  useEffect(() => {
    const progress = loadProgress();
    const parkResult = loadPark();
    const decision = resolveLanding(LEVEL_META, progress, parkResult);
    if (decision.kind === "mission") {
      if (decision.clearPark) clearPark();
      window.location.replace(`/algorithms/game/${decision.slug}`);
    } else {
      window.location.replace(GAME_MAP_PATH);
    }
  }, []);

  return (
    <div className="game-entry">
      <div className="game-entry__content">
        <p className="game-kicker">SALVAGE CONSOLE</p>
        <h1 className="game-entry__title">The Long Repair</h1>
        <p className="game-entry__status" role="status">
          Finding the next repair...
        </p>
        <p className="game-entry__action">
          <a className="game-btn" href={GAME_MAP_PATH}>
            Mission Map
          </a>
        </p>
        <noscript>
          <p className="game-noscript">
            The Long Repair needs JavaScript to run its puzzle boards.
            You can view the <a href={GAME_MAP_PATH}>Mission Map</a> or read the{" "}
            <a href="/algorithms">mathematics pages</a>.
          </p>
        </noscript>
      </div>
    </div>
  );
}
