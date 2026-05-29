/** Sampled CMS matrix heatmap — avoids 200+ column horizontal blowout. */

const MAX_VISIBLE_COLS = 64;

type Props = {
  table: number[][];
  width: number;
  depth: number;
};

function sampleIndices(total: number, max: number): number[] {
  if (total <= max) {
    return Array.from({ length: total }, (_, i) => i);
  }
  const indices: number[] = [];
  for (let i = 0; i < max; i++) {
    indices.push(Math.floor((i * total) / max));
  }
  return indices;
}

export function CmsHeatmap({ table, width, depth }: Props) {
  const colIndices = sampleIndices(width, MAX_VISIBLE_COLS);
  const sampled = table.map((row) => colIndices.map((ci) => row[ci] ?? 0));
  const maxCell = Math.max(1, ...sampled.flat());

  return (
    <div className="cms-heatmap">
      <p className="cms-heatmap__caption">
        Matrix sketch ({depth} rows × {width} columns)
        {width > MAX_VISIBLE_COLS && (
          <> — showing {MAX_VISIBLE_COLS} sampled columns</>
        )}
      </p>
      <div
        className="cms-heatmap__grid"
        role="img"
        aria-label={`Count-Min Sketch heatmap, ${depth} rows by ${width} columns`}
      >
        {sampled.map((row, ri) => (
          <div
            key={ri}
            className="cms-heatmap__row"
            style={{ ["--cms-cols" as string]: String(colIndices.length) }}
          >
            {row.map((cell, ci) => (
              <div
                key={ci}
                className="cms-heatmap__cell"
                style={{ opacity: 0.12 + (cell / maxCell) * 0.88 }}
                title={`row ${ri}, col ${colIndices[ci]}: ${cell}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
