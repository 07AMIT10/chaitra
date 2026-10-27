/**
 * Board access and interaction helpers.
 * Determines whether a bound move element is currently interactive (clickable/focusable)
 * or rendered inert/blocked. Task 8 extends this file with overflow and fit helpers.
 */

export function isMoveInteractive(
  moveId: string | undefined,
  legalMoveIds: ReadonlySet<string> | undefined,
): boolean {
  if (!moveId) return false;
  if (!legalMoveIds) return true;
  return legalMoveIds.has(moveId);
}

export function shouldShowOverflowHint(scrollWidth: number, clientWidth: number): boolean {
  return scrollWidth > clientWidth + 2;
}

export function supportsFitView(kind: string): boolean {
  return kind === "graph" || kind === "tree" || kind === "number";
}

