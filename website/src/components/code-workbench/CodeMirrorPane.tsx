import CodeMirror from "@uiw/react-codemirror";
import type { Extension } from "@codemirror/state";

export type CodeMirrorPaneProps = {
  value: string;
  onChange?: (value: string) => void;
  extensions: Extension[];
  editable?: boolean;
  ariaLabel: string;
  minHeight?: string;
};

export function CodeMirrorPane({
  value,
  onChange,
  extensions,
  editable = true,
  ariaLabel,
  minHeight = "20rem",
}: CodeMirrorPaneProps) {
  return (
    <div className="code-workbench__editor" aria-label={ariaLabel}>
      <CodeMirror
        value={value}
        extensions={extensions}
        editable={editable}
        onChange={onChange}
        basicSetup={false}
        height="100%"
        style={{ minHeight }}
      />
    </div>
  );
}
