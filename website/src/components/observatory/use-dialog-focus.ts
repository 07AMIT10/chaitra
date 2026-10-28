import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=\"hidden\"])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

/**
 * One modal, one focus loop. The hook moves focus into the panel, keeps Tab
 * inside it, closes on Escape, and returns focus to the element that opened
 * the panel when it unmounts.
 */
export function useDialogFocus(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = (): HTMLElement[] =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          !element.hasAttribute("hidden") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0,
      );

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (active === panel) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    };

    panel.focus();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [panelRef]);
}
