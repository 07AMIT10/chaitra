import type { ReactNode } from "react";
import "./code-workbench.css";

export type CodeWorkbenchProps = {
  header?: ReactNode;
  editor: ReactNode;
  terminal: ReactNode;
  runBar?: ReactNode;
  sourceLabel?: string;
  outputLabel?: string;
};

export function CodeWorkbench({
  header,
  editor,
  terminal,
  runBar,
  sourceLabel = "Source",
  outputLabel = "Output",
}: CodeWorkbenchProps) {
  return (
    <div className="code-workbench code-workbench--lab">
      {header && <div className="code-workbench__header">{header}</div>}
      <div className="code-workbench__stack">
        <section className="code-workbench__pane code-workbench__pane--source" aria-label={sourceLabel}>
          <h3 className="code-workbench__pane-label">{sourceLabel}</h3>
          <div className="code-workbench__pane-body">{editor}</div>
        </section>
        {runBar && <div className="code-workbench__runbar-wrap">{runBar}</div>}
        <section className="code-workbench__pane code-workbench__pane--output" aria-label={outputLabel}>
          <h3 className="code-workbench__pane-label">{outputLabel}</h3>
          <div className="code-workbench__pane-body">{terminal}</div>
        </section>
      </div>
    </div>
  );
}
