/** CMS dimensions — mirrors count_min_sketch.py __init__ */
export function cmsDimensions(epsilon: number, delta: number): { width: number; depth: number } {
  const width = Math.ceil(Math.E / epsilon);
  const depth = Math.ceil(Math.log(1 / delta));
  return { width, depth };
}

export function errorBound(epsilon: number): string {
  return `±${(epsilon * 100).toFixed(1)}% of total stream mass`;
}
