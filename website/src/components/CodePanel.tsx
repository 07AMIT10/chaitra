import { lazy, Suspense, useCallback, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import "./CodePanel.css";

const PyodideRunner = lazy(() => import("./PyodideRunner"));
const RustWasmRunner = lazy(() => import("./RustWasmRunner"));
const RustSourceRunner = lazy(() => import("./RustSourceRunner"));

export type CodePanelTab = "python" | "rust" | "github";

export type WasmRunnerId = "bloom-filter";

export type CodePanelProps = {
  defaultPythonCode: string;
  pythonSourceUrl: string;
  pythonSourceLabel?: string;
  rustSourceCode?: string;
  rustSourceUrl?: string;
  rustSourceLabel?: string;
  wasmRunner?: WasmRunnerId;
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
  rustSourceCode,
  rustSourceUrl,
  rustSourceLabel,
  wasmRunner,
  githubTreeUrl,
  githubLabel = "Topic folder on GitHub",
}: CodePanelProps) {
  const showRustTab = Boolean(rustSourceCode || wasmRunner);
  const tabOrder = useMemo<CodePanelTab[]>(
    () => (showRustTab ? ["python", "rust", "github"] : ["python", "github"]),
    [showRustTab],
  );

  const [activeTab, setActiveTab] = useState<CodePanelTab>("python");
  const [mounted, setMounted] = useState({ python: true, rust: false, github: false });

  const selectTab = useCallback(
    (tab: CodePanelTab) => {
      setActiveTab(tab);
      setMounted((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
    },
    [],
  );

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

  const rustPanel: ReactNode = (() => {
    if (wasmRunner === "bloom-filter" && rustSourceCode) {
      return (
        <Suspense fallback={<TabPlaceholder message="Loading Rust WASM…" />}>
          <RustWasmRunner
            defaultSource={rustSourceCode}
            sourceUrl={rustSourceUrl ?? githubTreeUrl}
            sourceLabel={rustSourceLabel}
          />
        </Suspense>
      );
    }
    if (rustSourceCode) {
      return (
        <Suspense fallback={<TabPlaceholder message="Loading Rust source…" />}>
          <RustSourceRunner
            defaultSource={rustSourceCode}
            sourceUrl={rustSourceUrl ?? githubTreeUrl}
            sourceLabel={rustSourceLabel}
          />
        </Suspense>
      );
    }
    return null;
  })();

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
    rust: mounted.rust ? rustPanel : null,
    github: mounted.github ? (
      <div className="code-panel__github">
        <p>
          Full reference implementations, benchmarks, and tests live in the repo. Clone locally to
          run Python or Rust with your own inputs and tooling.
        </p>
        <ul>
          <li>
            <a href={pythonSourceUrl} target="_blank" rel="noopener noreferrer">
              {pythonSourceLabel ?? "Python source on GitHub"}
            </a>
          </li>
          {rustSourceUrl && (
            <li>
              <a href={rustSourceUrl} target="_blank" rel="noopener noreferrer">
                {rustSourceLabel ?? "Rust source on GitHub"}
              </a>
            </li>
          )}
          <li>
            <a href={githubTreeUrl} target="_blank" rel="noopener noreferrer">
              {githubLabel}
            </a>
          </li>
        </ul>
      </div>
    ) : null,
  };

  const tabs: { id: CodePanelTab; label: string }[] = showRustTab
    ? [
        { id: "python", label: "Python" },
        { id: "rust", label: "Rust (WASM)" },
        { id: "github", label: "GitHub" },
      ]
    : [
        { id: "python", label: "Python" },
        { id: "github", label: "GitHub" },
      ];

  return (
    <div className="code-panel">
      <div className="code-panel__tabs" role="tablist" aria-label="Implementation runners">
        {tabs.map(({ id, label }) => (
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

      {tabOrder.map((id) => (
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
