export type RunBarProps = {
  onRun: () => void;
  onReset?: () => void;
  runLabel: string;
  runDisabled?: boolean;
  resetDisabled?: boolean;
  statusMessage?: string;
  statusIsError?: boolean;
};

export function RunBar({
  onRun,
  onReset,
  runLabel,
  runDisabled = false,
  resetDisabled = false,
  statusMessage,
  statusIsError = false,
}: RunBarProps) {
  return (
    <div className="code-workbench__runbar">
      <button
        type="button"
        className="code-workbench__btn code-workbench__btn--primary"
        onClick={onRun}
        disabled={runDisabled}
      >
        {runLabel}
      </button>
      {onReset && (
        <button
          type="button"
          className="code-workbench__btn code-workbench__btn--secondary"
          onClick={onReset}
          disabled={resetDisabled}
        >
          Reset
        </button>
      )}
      {statusMessage && (
        <p
          className={[
            "code-workbench__status",
            statusIsError && "code-workbench__status--error",
          ]
            .filter(Boolean)
            .join(" ")}
          role={statusIsError ? "alert" : "status"}
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}
