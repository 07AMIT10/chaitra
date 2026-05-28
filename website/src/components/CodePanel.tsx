import { lazy, Suspense, useCallback, useState, type KeyboardEvent, type ReactNode } from "react";
import "./CodePanel.css";

const PyodideRunner = lazy(() => import("./PyodideRunner"));
const WasmBloomRunner = lazy(() => import("./WasmBloomRunner"));

export type CodePanelTab = "python" | "rust" | "github";

export type CodePanelProps = {
  defaultPythonCode: string;
  pythonSourceUrl: string;
  pythonSourceLabel?: string;
  rustSourceUrl?: string;
  rustSourceLabel?: string;
  githubTreeUrl: string;
  githubLabel?: string;
};

function TabPlaceholder({ message }: { message: string }) {
  return <p className="code-panel__placeholder">{message}</p>;
}

export default function CodePanel({
  defaultPythonCode,
  pythonSourceUrl,
  pythonSourceLabel,
  rustSourceUrl,
  rustSourceLabel,
  githubTreeUrl,
  githubLabel = "BLOOM_FILTERS on GitHub",
}: CodePanelProps) {
  const [activeTab, setActiveTab] = useState<CodePanelTab>("python");
  const [mounted, setMounted] = useState({ python: true, rust: false, github: false });

  const tabOrder: CodePanelTab[] = ["python", "rust", "github"];

  const selectTab = useCallback((tab: CodePanelTab) => {
    setActiveTab(tab);
    setMounted((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  }, []);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, tab: CodePanelTab) => {
    const idx = tabOrder.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      selectTab(tabOrder[(idx + 1) % tabOrder.length]);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      selectTab(tabOrder[(idx - 1 + tabOrder.length) % tabOrder.length]);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(tabOrder[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(tabOrder[tabOrder.length - 1]);
    }
  };

  const panels: Record<CodePanelTab, ReactNode> = {
    python: mounted.python ? (
      <Suspense fallback={<TabPlaceholder message="Loading Python runner…" />}>
        <PyodideRunner
          defaultCode={defaultPythonCode}
          sourceUrl={pythonSourceUrl}
          sourceLabel={pythonSourceLabel}
        />
      </Suspense>
    ) : null,
    rust: mounted.rust ? (
      <Suspense fallback={<TabPlaceholder message="Loading Rust WASM…" />}>
        <WasmBloomRunner sourceUrl={rustSourceUrl} sourceLabel={rustSourceLabel} />
      </Suspense>
    ) : null,
    github: mounted.github ? (
      <div className="code-panel__github">
        <p>
          Full reference implementations, benchmarks, and tests live in the repo. Run locally with{" "}
          <code>python bloom_filter.py</code> or <code>cargo run</code> on the Rust file.
        </p>
        <ul>
          <li>
            <a href={pythonSourceUrl} target="_blank" rel="noopener noreferrer">
              bloom_filter.py
            </a>
          </li>
          <li>
            <a
              href={rustSourceUrl ?? "https://github.com/07AMIT10/chaitra/blob/main/BLOOM_FILTERS/bloom_filter.rs"}
              target="_blank"
              rel="noopener noreferrer"
            >
              bloom_filter.rs
            </a>
          </li>
          <li>
            <a href={githubTreeUrl} target="_blank" rel="noopener noreferrer">
              {githubLabel}
            </a>
          </li>
        </ul>
      </div>
    ) : null,
  };

  return (
    <div className="code-panel">
      <div className="code-panel__tabs" role="tablist" aria-label="Implementation runners">
        {(
          [
            ["python", "Python"],
            ["rust", "Rust (WASM)"],
            ["github", "GitHub"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`code-tab-${id}`}
            aria-selected={activeTab === id}
            aria-controls={`code-panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            className="code-panel__tab"
            onClick={() => selectTab(id)}
            onKeyDown={(e) => onTabKeyDown(e, id)}
          >
            {label}
          </button>
        ))}
      </div>

      {(["python", "rust", "github"] as const).map((id) => (
        <div
          key={id}
          id={`code-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`code-tab-${id}`}
          hidden={activeTab !== id}
          className="code-panel__panel"
        >
          {panels[id]}
        </div>
      ))}
    </div>
  );
}
