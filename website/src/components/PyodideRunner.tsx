import { useCallback, useEffect, useRef, useState } from "react";
import "./PyodideRunner.css";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export type PyodideRunnerProps = {
  defaultCode: string;
  sourceUrl: string;
  sourceLabel?: string;
};

type RuntimeState = "idle" | "loading" | "ready" | "running";

export default function PyodideRunner({
  defaultCode,
  sourceUrl,
  sourceLabel = "Full source on GitHub",
}: PyodideRunnerProps) {
  const [code, setCode] = useState(defaultCode);
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>("idle");
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const loadPromiseRef = useRef<Promise<PyodideInterface> | null>(null);

  const ensurePyodide = useCallback(async (): Promise<PyodideInterface> => {
    if (pyodideRef.current) {
      return pyodideRef.current;
    }
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    const loadPyodide = window.loadPyodide;
    if (!loadPyodide) {
      throw new Error(
        "Pyodide is not available. Check your network connection, or open the full file on GitHub.",
      );
    }

    setRuntimeState("loading");
    const promise = loadPyodide({ indexURL: PYODIDE_CDN }).then((pyodide) => {
      pyodideRef.current = pyodide;
      setRuntimeState("ready");
      return pyodide;
    });

    loadPromiseRef.current = promise;
    try {
      return await promise;
    } catch (err) {
      loadPromiseRef.current = null;
      setRuntimeState("idle");
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensurePyodide().catch(() => {
      if (!cancelled) {
        setRuntimeState("idle");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ensurePyodide]);

  const run = useCallback(async () => {
    setOutput("");
    setIsError(false);
    try {
      const pyodide = await ensurePyodide();
      setRuntimeState("running");

      let stdout = "";
      pyodide.setStdout({
        batched: (msg: string) => {
          stdout += msg;
        },
      });

      const result = await pyodide.runPythonAsync(code);
      const resultText =
        result !== undefined && result !== null && result !== "" ? String(result) : "";
      const combined = [stdout.trimEnd(), resultText].filter(Boolean).join("\n");
      setOutput(combined || "(finished — no printed output)");
    } catch (err) {
      setIsError(true);
      setOutput(err instanceof Error ? err.message : String(err));
    } finally {
      setRuntimeState(pyodideRef.current ? "ready" : "idle");
    }
  }, [code, ensurePyodide]);

  const busy = runtimeState === "loading" || runtimeState === "running";
  const buttonLabel =
    runtimeState === "loading"
      ? "Loading Pyodide…"
      : runtimeState === "running"
        ? "Running…"
        : "Run Python";

  const statusMessage =
    runtimeState === "loading"
      ? "Downloading Python runtime — first load often takes 10–20 seconds."
      : runtimeState === "ready"
        ? "Python runtime ready."
        : null;

  return (
    <div className="pyodide-runner">
      <div className="pyodide-runner__header">
        <p>Edit and run the reference <code>BloomFilter</code> class (stdlib only).</p>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {sourceLabel}
        </a>
      </div>

      <textarea
        className="pyodide-runner__editor"
        aria-label="Python code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        rows={18}
        spellCheck={false}
        disabled={busy}
      />

      <div className="pyodide-runner__actions">
        <button type="button" className="pyodide-runner__btn" onClick={() => void run()} disabled={busy}>
          {buttonLabel}
        </button>
        {statusMessage && (
          <p className="pyodide-runner__status" role="status" aria-live="polite">
            {statusMessage}
          </p>
        )}
      </div>

      <pre
        className={`pyodide-runner__output${isError ? " pyodide-runner__output--error" : ""}`}
        role={isError ? "alert" : "region"}
        aria-label={isError ? "Python error" : "Program output"}
        aria-live="polite"
      >
        {output}
      </pre>
    </div>
  );
}
