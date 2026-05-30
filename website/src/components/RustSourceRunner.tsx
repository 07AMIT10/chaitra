import { CodeWorkbench, CodeMirrorPane, TerminalPane } from "./code-workbench";
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
          <p>
            Reference source (read-only). WASM runner not available for this topic — clone the
            repo and run with cargo.
          </p>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
            {sourceLabel}
          </a>
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
