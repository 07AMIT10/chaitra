import { useEffect, useState } from "react";
import pathSlugs from "../data/learning-path.json";

const STORAGE_KEY = "chaitra-learning-path";

function loadVisited(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveVisited(visited: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
}

export default function LearningPathProgress() {
  const [visited, setVisited] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setVisited(loadVisited());
  }, []);

  const mark = (slug: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(slug);
      saveVisited(next);
      return next;
    });
  };

  const doneCount = pathSlugs.filter((s) => visited.has(s)).length;

  return (
    <section className="learning-path" aria-labelledby="learning-path-title">
      <header className="home-section__header">
        <h2 id="learning-path-title">Learning path</h2>
        <p>
          {doneCount} of {pathSlugs.length} checkpoints visited — progress saved in this browser.
        </p>
      </header>
      <ol className="learning-path__list">
        {pathSlugs.map((slug, index) => {
          const done = visited.has(slug);
          return (
            <li key={slug} className={done ? "learning-path__item learning-path__item--done" : "learning-path__item"}>
              <span className="learning-path__step" aria-hidden="true">
                {index + 1}
              </span>
              <a href={`/topics/${slug}`}>{slug.replace(/-/g, " ")}</a>
              <button type="button" className="learning-path__mark" onClick={() => mark(slug)} disabled={done}>
                {done ? "Visited" : "Mark visited"}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
