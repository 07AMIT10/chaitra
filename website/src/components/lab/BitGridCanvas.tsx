import { useCallback, useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

export type BitGridColors = {
  off: string;
  on: string;
  probe: string;
};

const DEFAULT_COLORS: BitGridColors = {
  off: "#2a3544",
  on: "#3d9eff",
  probe: "#ffb86b",
};

const MAX_VISIBLE_COLS = 128;

type BitGridCanvasProps = {
  length: number;
  bits: readonly boolean[] | Uint8Array | readonly number[];
  probeIndices?: readonly number[];
  highlightProbes?: boolean;
  colors?: BitGridColors;
  ariaLabel: string;
  className?: string;
};

/** Canvas strip for membership-sketch bit arrays (Bloom, future CMS rows). */
export function BitGridCanvas({
  length,
  bits,
  probeIndices = [],
  highlightProbes = false,
  colors = DEFAULT_COLORS,
  ariaLabel,
  className = "lab__canvas",
}: BitGridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const m = length;
    const visible = m > MAX_VISIBLE_COLS ? MAX_VISIBLE_COLS : m;
    const stride = m > MAX_VISIBLE_COLS ? Math.ceil(m / MAX_VISIBLE_COLS) : 1;
    const cell = visible > 128 ? 5 : visible > 64 ? 6 : 8;
    const gap = 1;
    const height = 32;
    canvas.width = visible * (cell + gap);
    canvas.height = height;

    const probeSet = new Set(highlightProbes ? probeIndices : []);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let v = 0; v < visible; v++) {
      const i = v * stride;
      const x = v * (cell + gap);
      const isProbe = probeSet.has(i);
      if (isProbe) ctx.fillStyle = colors.probe;
      else if (bits[i]) ctx.fillStyle = colors.on;
      else ctx.fillStyle = colors.off;
      ctx.fillRect(x, 2, cell, height - 4);
    }
  }, [bits, colors, highlightProbes, length, probeIndices]);

  useEffect(() => {
    draw();
  }, [draw, reducedMotion]);

  const sampled = length > MAX_VISIBLE_COLS;
  const label = sampled
    ? `${ariaLabel} (showing ${MAX_VISIBLE_COLS} sampled columns of ${length})`
    : ariaLabel;

  return (
    <div className="lab__viz-wrap">
      <canvas ref={canvasRef} className={className} role="img" aria-label={label} />
    </div>
  );
}

export type BitLegendItem = {
  id: string;
  label: string;
  swatchClass: string;
};

type BitGridLegendProps = {
  items: BitLegendItem[];
};

export function BitGridLegend({ items }: BitGridLegendProps) {
  return (
    <div className="lab__legend">
      {items.map((item) => (
        <span key={item.id} className={`lab__swatch ${item.swatchClass}`}>
          <i aria-hidden /> {item.label}
        </span>
      ))}
    </div>
  );
}
