import { useCallback, useEffect, useRef, useState } from "react";
import "./PyodideRunner.css";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const SCRIPT_WAIT_MS = 30_000;
const LOAD_TIMEOUT_MS = 120_000;

function injectPyodideScript(): Promise<void> {
  if (document.querySelector('script[data-chaitra-pyodide="1"]')) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${PYODIDE_CDN}pyodide.js`;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-chaitra-pyodide", "1");
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          "Could not load Pyodide from cdn.jsdelivr.net. Allow the CDN or disable strict browser shields.",
        ),
      );
    document.head.appendChild(script);
  });
}

async function waitForPyodideScript(): Promise<void> {
  if (!window.loadPyodide) {
    await injectPyodideScript();
  }
  const deadline = Date.now() + SCRIPT_WAIT_MS;
  while (!window.loadPyodide) {
    if (Date.now() > deadline) {
      throw new Error(
        "Pyodide script did not initialize. Allow cdn.jsdelivr.net and refresh the page.",
      );
    }
    await new Promise((r) => setTimeout(r, 80));
  }
}

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const loadPromiseRef = useRef<Promise<PyodideInterface> | null>(null);

  const ensurePyodide = useCallback(async (): Promise<PyodideInterface> => {
    if (pyodideRef.current) {
      return pyodideRef.current;
    }
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    setRuntimeState("loading");
    const promise = waitForPyodideScript()
      .then(() => window.loadPyodide!({ indexURL: PYODIDE_CDN }))
      .then((pyodide) => {
        pyodideRef.current = pyodide;
        setRuntimeState("ready");
        return pyodide;
      });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Pyodide download timed out. Check your connection and try again.")),
        LOAD_TIMEOUT_MS,
      );
    });

    const promiseWithTimeout = Promise.race([promise, timeout]);

    loadPromiseRef.current = promiseWithTimeout;
    try {
      return await promiseWithTimeout;
    } catch (err) {
      loadPromiseRef.current = null;
      setRuntimeState("idle");
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensurePyodide().catch((err) => {
      if (!cancelled) {
        setRuntimeState("idle");
        setLoadError(err instanceof Error ? err.message : String(err));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ensurePyodide]);

  const run = useCallback(async () => {
    setOutput("");
    setIsError(false);
    setLoadError(null);
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
      const message = err instanceof Error ? err.message : String(err);
      if (!pyodideRef.current) {
        setLoadError(message);
        setIsError(false);
        setOutput("");
      } else {
        setIsError(true);
        setOutput(message);
      }
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
        : loadError
          ? "Retry load"
          : "Run Python";

  const statusMessage = loadError
    ? loadError
    : runtimeState === "loading"
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
          <p
            className={`pyodide-runner__status${loadError ? " pyodide-runner__status--error" : ""}`}
            role={loadError ? "alert" : "status"}
            aria-live="polite"
          >
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
