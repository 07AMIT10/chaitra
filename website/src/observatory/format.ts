export function frameLabel(index: number, total: number): string {
  if (total <= 0) return "No frames";
  const current = Math.min(Math.max(index + 1, 1), total);
  return `Step ${current} / ${total}`;
}

export function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Number.isInteger(value)) return String(value);
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
