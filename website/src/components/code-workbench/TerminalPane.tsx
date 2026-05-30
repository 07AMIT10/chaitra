export type TerminalPaneProps = {
  output: string;
  isError?: boolean;
  placeholder?: string;
};

export function TerminalPane({
  output,
  isError = false,
  placeholder,
}: TerminalPaneProps) {
  const showPlaceholder = !output && placeholder;
  const displayText = output || placeholder || "";

  return (
    <pre
      className={[
        "code-workbench__terminal",
        isError && "code-workbench__terminal--error",
        showPlaceholder && "code-workbench__terminal--placeholder",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-live="polite"
      role={isError ? "alert" : "region"}
      aria-label={isError ? "Error output" : "Program output"}
    >
      {displayText}
    </pre>
  );
}
