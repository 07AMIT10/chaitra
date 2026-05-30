/** Formulas for CRDTs + probabilistic tombstones — mirrors README */

export { falsePositiveRate } from "./bloom-math";

export function formatReplicaVector(counter: Map<string, number>, replicas: string[]): string {
  const parts = replicas.map((r) => `${r.split("_")[1] ?? r}:${counter.get(r) ?? 0}`);
  return `[${parts.join(", ")}]`;
}

export function formatCounterTotal(value: number): string {
  return String(value);
}

/** Memory proxy: bytes for exact tombstone set vs compact bloom */
export function tombstoneMemoryBytes(
  exactTombstones: number,
  bloomBits: number
): { exact: number; bloom: number } {
  const exact = exactTombstones * 32;
  const bloom = Math.ceil(bloomBits / 8);
  return { exact, bloom };
}
