import { CodeWorkbench, CodeMirrorPane, TerminalPane, WorkbenchNotice } from "./code-workbench";
import { rustReadOnlyEditorExtensions } from "./code-workbench/editorExtensions";

export type RustSourceRunnerProps = {
  defaultSource: string;
  sourceUrl: string;
  sourceLabel?: string;
};

const TERMINAL_PLACEHOLDER =
  "WASM runner not wired for this topic yet. Clone the repo and run: cargo run";

export default function RustSourceRunner({
  defaultSource,
  sourceUrl,
  sourceLabel = "Reference source on GitHub",
}: RustSourceRunnerProps) {
  return (
    <CodeWorkbench
      header={
        <>
          <WorkbenchNotice variant="warning">
            Reference source is read-only. In-browser WASM is not available for this topic —
            clone the repo and run with <code>cargo run</code>.
          </WorkbenchNotice>
          <div className="code-workbench__header-row">
            <p>Rust reference from the repo.</p>
            <a
              className="code-workbench__github-link"
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {sourceLabel}
            </a>
          </div>
        </>
      }
      editor={
        <CodeMirrorPane
          value={defaultSource}
          extensions={rustReadOnlyEditorExtensions()}
          editable={false}
          ariaLabel="Rust reference source"
        />
      }
      terminal={<TerminalPane output="" placeholder={TERMINAL_PLACEHOLDER} />}
    />
  );
}
