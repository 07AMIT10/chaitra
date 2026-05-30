import type { ReactNode } from "react";
import "./code-workbench.css";

export type CodeWorkbenchProps = {
  header?: ReactNode;
  editor: ReactNode;
  terminal: ReactNode;
  runBar?: ReactNode;
};

export function CodeWorkbench({ header, editor, terminal, runBar }: CodeWorkbenchProps) {
  return (
    <div className="code-workbench">
      {header && <div className="code-workbench__header">{header}</div>}
      <div className="code-workbench__panes">
        <div className="code-workbench__pane code-workbench__pane--source">{editor}</div>
        <div className="code-workbench__pane code-workbench__pane--output">{terminal}</div>
      </div>
      {runBar && <div className="code-workbench__runbar-wrap">{runBar}</div>}
    </div>
  );
}
