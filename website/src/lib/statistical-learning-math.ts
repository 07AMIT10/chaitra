/** Mean squared error for polynomial fit of degree d on synthetic points. */
export function mseForDegree(
  xs: number[],
  ys: number[],
  coeffs: number[]
): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    let pred = 0;
    for (let j = 0; j < coeffs.length; j++) {
      pred += coeffs[j] * xs[i] ** j;
    }
    const err = ys[i] - pred;
    sum += err * err;
  }
  return sum / xs.length;
}

/** Least-squares coefficients for degree d (normal equations, tiny n). */
export function polyFitCoeffs(xs: number[], ys: number[], degree: number): number[] {
  const d = Math.min(degree, xs.length - 1);
  const m = d + 1;
  const a: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const b = Array(m).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const powers = Array.from({ length: m }, (_, k) => xs[i] ** k);
    for (let r = 0; r < m; r++) {
      b[r] += powers[r] * ys[i];
      for (let c = 0; c < m; c++) a[r][c] += powers[r] * powers[c];
    }
  }
  return solveLinear(a, b);
}

function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    const div = aug[col][col] || 1e-9;
    for (let c = col; c <= n; c++) aug[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let c = col; c <= n; c++) aug[r][c] -= factor * aug[col][c];
    }
  }
  return aug.map((row) => row[n]);
}
