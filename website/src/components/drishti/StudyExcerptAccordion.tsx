import { useId, useState } from "react";
import excerpts from "../../data/drishti/pass-excerpts.json";
import type { LensSlug, StudySlug } from "../../lib/drishti-pass";

type ExcerptEntry = { title: string; excerpt: string };

type Props = {
  lensSlug: LensSlug;
  preferredStudy?: StudySlug;
};

const STUDY_ORDER: StudySlug[] = [
  "sleep",
  "blood-circulation",
  "the-office-as-a-computer",
  "global-supply-chains",
  "photosynthesis",
  "internet-routing",
  "the-immune-system",
  "urban-traffic-networks",
  "power-grids",
];

export function StudyExcerptAccordion({ lensSlug, preferredStudy }: Props) {
  const baseId = useId();
  const lensExcerpts = (excerpts as Record<string, Record<string, ExcerptEntry>>)[lensSlug];
  if (!lensExcerpts) return null;

  const ordered = [
    ...(preferredStudy && lensExcerpts[preferredStudy]
      ? [preferredStudy]
      : []),
    ...STUDY_ORDER.filter((s) => s !== preferredStudy && lensExcerpts[s]),
  ];

  if (ordered.length === 0) return null;

  return (
    <div className="drishti-pass-excerpt">
      {ordered.map((studySlug) => {
        const entry = lensExcerpts[studySlug];
        if (!entry) return null;
        return (
          <ExcerptItem
            key={studySlug}
            id={`${baseId}-${studySlug}`}
            studySlug={studySlug}
            entry={entry}
          />
        );
      })}
    </div>
  );
}

function ExcerptItem({
  id,
  studySlug,
  entry,
}: {
  id: string;
  studySlug: StudySlug;
  entry: ExcerptEntry;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="drishti-pass-excerpt__item"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>See how {entry.title}…</summary>
      <p>{entry.excerpt}</p>
      <a href={`/drishti/studies/${studySlug}`} data-analytics="pass-excerpt-study-link">
        Read full study →
      </a>
    </details>
  );
}
