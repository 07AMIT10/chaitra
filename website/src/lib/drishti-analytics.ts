export type DrishtiAnalyticsEvent =
  | "mirror-confirmed"
  | "echo-yes"
  | "echo-changed"
  | "echo-dismiss"
  | "whats-next-study-click"
  | "pass-journal-reopen"
  | "study-bridge-compare"
  | "apply-drishti-chip"
  | "hub-apply-drishti"
  | "pass-go-deeper"
  | "pass-deep-finish"
  | "pass-excerpt-study-link";

export function trackDrishti(
  event: DrishtiAnalyticsEvent,
  detail?: Record<string, string>
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("chaitra:analytics", { detail: { event, ...detail } })
  );
}

export function initDrishtiAnalytics(): () => void {
  const onClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-analytics]"
    );
    if (!target) return;
    const event = target.dataset.analytics as DrishtiAnalyticsEvent | undefined;
    if (!event) return;
    trackDrishti(event);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}
