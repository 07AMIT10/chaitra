import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

export type LabTab = {
  id: string;
  label: string;
  panelId: string;
  tabId: string;
};

type LabTabsProps = {
  tabs: LabTab[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel: string;
};

/** Accessible tablist for goal vs manual (or other parameter modes). */
export function LabTabs({ tabs, activeId, onChange, ariaLabel }: LabTabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const keyboardNav = useRef(false);

  useEffect(() => {
    if (keyboardNav.current) {
      tabRefs.current.get(activeId)?.focus();
      keyboardNav.current = false;
    }
  }, [activeId]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentId: string) => {
      const ids = tabs.map((t) => t.id);
      const idx = ids.indexOf(currentId);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        keyboardNav.current = true;
        onChange(ids[(idx + 1) % ids.length]);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        keyboardNav.current = true;
        onChange(ids[(idx - 1 + ids.length) % ids.length]);
      } else if (e.key === "Home") {
        e.preventDefault();
        keyboardNav.current = true;
        onChange(ids[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        keyboardNav.current = true;
        onChange(ids[ids.length - 1]);
      }
    },
    [onChange, tabs]
  );

  return (
    <div className="lab__tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el);
            else tabRefs.current.delete(tab.id);
          }}
          type="button"
          role="tab"
          id={tab.tabId}
          className="lab__tab"
          aria-selected={activeId === tab.id}
          aria-controls={tab.panelId}
          tabIndex={activeId === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => onKeyDown(e, tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type LabTabPanelProps = {
  tab: LabTab;
  active: boolean;
  children: ReactNode;
  className?: string;
};

export function LabTabPanel({ tab, active, children, className }: LabTabPanelProps) {
  return (
    <div
      id={tab.panelId}
      role="tabpanel"
      aria-labelledby={tab.tabId}
      hidden={!active}
      className={className ?? "lab__controls"}
    >
      {active ? children : null}
    </div>
  );
}

export type RangeControlProps = {
  id: string;
  label: ReactNode;
  min: number;
  max: number;
  step?: number;
  value: number;
  valueText: string;
  onChange: (value: number) => void;
  hint?: ReactNode;
};

/** Labeled range input with mono value readout and optional hint. */
export function RangeControl({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  valueText,
  onChange,
  hint,
}: RangeControlProps) {
  return (
    <div className="lab__control">
      <div className="lab__control-head">
        <label htmlFor={id}>{label}</label>
        <span className="lab__value">{valueText}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
      />
      {hint != null && <span className="lab__hint">{hint}</span>}
    </div>
  );
}

type ParameterPanelProps = {
  children: ReactNode;
  className?: string;
};

/** Groups parameter controls (tabs + sliders) in the main lab column. */
export function ParameterPanel({ children, className }: ParameterPanelProps) {
  return <div className={className ?? "lab__controls"}>{children}</div>;
}
