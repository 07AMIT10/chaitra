/** Fraction of keys that must move when removing one node (consistent hashing lower bound). */
export function idealRemapFractionOnRemove(serversBefore: number): number {
  if (serversBefore <= 0) return 0;
  return 1 / serversBefore;
}

/** Fraction of keys that move under modulo resize N → N−1 (naive baseline). */
export function moduloRemapFractionOnShrink(oldN: number, newN: number): number {
  if (oldN <= 0 || newN <= 0) return 0;
  return (oldN - 1) / oldN;
}
