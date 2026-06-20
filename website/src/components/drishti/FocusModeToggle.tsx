import { useEffect, useState } from "react";

const STORAGE_KEY = "chaitra_drishti_focus_mode";

export function FocusModeToggle() {
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const on = saved === "true";
    setFocused(on);
    document.documentElement.classList.toggle("drishti-focus-mode", on);
  }, []);

  const toggle = () => {
    const next = !focused;
    setFocused(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    document.documentElement.classList.toggle("drishti-focus-mode", next);
  };

  return (
    <button
      type="button"
      className="drishti-focus-toggle"
      onClick={toggle}
      aria-pressed={focused}
    >
      {focused ? "Exit focus mode" : "Focus mode"}
    </button>
  );
}
