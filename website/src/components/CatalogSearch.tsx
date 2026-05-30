import { useState, useMemo } from "react";

export interface TopicRow {
  slug: string;
  title: string;
  folder: string;
  status: string;
  hasLab?: boolean;
  hasCode?: boolean;
  hasPython?: boolean;
  hasRust?: boolean;
}

interface CatalogSearchProps {
  topics: TopicRow[];
}

const GITHUB_REPO = "https://github.com/07AMIT10/chaitra/tree/main";

function statusClass(status: string): string {
  if (status === "golden" || status === "live") return "catalog__status--live";
  if (status === "preview") return "catalog__status--preview";
  if (status === "readme-only") return "catalog__status--narrative";
  return "catalog__status--narrative";
}

export default function CatalogSearch({ topics }: CatalogSearchProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "labs" | "previews" | "readme">("all");

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      // 1. Text Search Filter
      const query = search.toLowerCase();
      const matchesText =
        t.title.toLowerCase().includes(query) ||
        t.slug.toLowerCase().includes(query) ||
        t.folder.toLowerCase().includes(query);

      if (!matchesText) return false;

      // 2. Status Pill Filter
      if (activeFilter === "labs") {
        return t.hasLab || t.status === "golden" || t.status === "live";
      }
      if (activeFilter === "previews") {
        return t.status === "preview";
      }
      if (activeFilter === "readme") {
        return t.status === "readme-only" || t.status === "coded" || t.status === "readme";
      }
      return true;
    });
  }, [topics, search, activeFilter]);

  // Counts for pills
  const counts = useMemo(() => {
    let labs = 0;
    let previews = 0;
    let readmes = 0;
    topics.forEach((t) => {
      if (t.status === "readme-only" || t.status === "coded" || t.status === "readme") {
        readmes++;
      } else if (t.hasLab || t.status === "golden" || t.status === "live") {
        labs++;
      } else if (t.status === "preview") {
        previews++;
      }
    });
    return { all: topics.length, labs, previews, readmes };
  }, [topics]);

  return (
    <div>
      <div className="catalog__search-controls">
        <div className="catalog__search-input-wrapper">
          <input
            type="search"
            className="catalog__search-input"
            placeholder="Search topics by name, algorithm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search topics"
          />
        </div>
        <div className="catalog__filter-pills" role="group" aria-label="Filter topics by status">
          <button
            type="button"
            className={`catalog__filter-pill ${activeFilter === "all" ? "catalog__filter-pill--active" : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            className={`catalog__filter-pill ${activeFilter === "labs" ? "catalog__filter-pill--active" : ""}`}
            onClick={() => setActiveFilter("labs")}
          >
            Labs ({counts.labs})
          </button>
          <button
            type="button"
            className={`catalog__filter-pill ${activeFilter === "previews" ? "catalog__filter-pill--active" : ""}`}
            onClick={() => setActiveFilter("previews")}
          >
            Previews ({counts.previews})
          </button>
          <button
            type="button"
            className={`catalog__filter-pill ${activeFilter === "readme" ? "catalog__filter-pill--active" : ""}`}
            onClick={() => setActiveFilter("readme")}
          >
            Readme-only ({counts.readmes})
          </button>
        </div>
      </div>

      {filteredTopics.length === 0 ? (
        <div className="catalog__empty-state">
          <p>No topics match your search criteria. Try a different search query!</p>
        </div>
      ) : (
        <ul className="catalog__grid">
          {filteredTopics.map((t) => {
            const hasSitePage =
              t.status === "golden" ||
              t.status === "live" ||
              t.status === "preview" ||
              t.status === "readme-only";
            const href = hasSitePage ? `/topics/${t.slug}` : `${GITHUB_REPO}/topics/${t.folder}`;
            const langs = [t.hasPython && "Py", t.hasRust && "Rs"].filter(Boolean).join(" · ");
            return (
              <li key={t.slug} className="catalog__card">
                <a href={href}>{t.title}</a>
                <div className="catalog__meta">
                  <span className={`catalog__status ${statusClass(t.status)}`}>{t.status}</span>
                  {t.hasLab && <span>Lab</span>}
                  {langs && <span className="catalog__langs">{langs}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
