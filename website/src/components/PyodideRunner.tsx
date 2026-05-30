import { useCallback, useRef, useState } from "react";
import { CodeWorkbench, CodeMirrorPane, RunBar, TerminalPane, WorkbenchNotice } from "./code-workbench";
import { pythonEditorExtensions } from "./code-workbench/editorExtensions";
import { appendBatchedLine, formatTerminalOutput } from "../lib/format-stdout";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const SCRIPT_WAIT_MS = 30_000;
const LOAD_TIMEOUT_MS = 180_000;

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

  const run = useCallback(async () => {
    setOutput("");
    setIsError(false);
    setLoadError(null);
    try {
      const pyodide = await ensurePyodide();
      setRuntimeState("running");

      let stdout = "";
      pyodide.setStdout({
        batched: (line: string) => {
          stdout = appendBatchedLine(stdout, line);
        },
      });
      type StdStreamHandler = Parameters<PyodideInterface["setStdout"]>[0];
      const setStderr = (pyodide as { setStderr?(options: StdStreamHandler): void }).setStderr;
      if (typeof setStderr === "function") {
        setStderr({
          batched: (line: string) => {
            stdout = appendBatchedLine(stdout, line);
          },
        });
      }

      const result = await pyodide.runPythonAsync(code);
      const resultText =
        result !== undefined && result !== null && result !== "" ? String(result) : "";
      const combined = formatTerminalOutput(
        [stdout.trimEnd(), resultText].filter(Boolean).join("\n"),
      );
      setOutput(combined);
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

  const handleReset = () => {
    setCode(defaultCode);
    setOutput("");
    setIsError(false);
    setLoadError(null);
  };

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
        : "Click Run Python to download the in-browser runtime (first run may take 30–60s).";

  const terminalPlaceholder =
    runtimeState === "ready" && !output && !loadError
      ? "Output appears here after you run your code."
      : undefined;

  return (
    <CodeWorkbench
      header={
        <>
          <WorkbenchNotice>
            Edit the reference implementation and click <strong>Run Python</strong>. First run
            downloads the in-browser runtime from the CDN (about 30–60 seconds).
          </WorkbenchNotice>
          <div className="code-workbench__header-row">
            <p>Python in the browser (stdlib only).</p>
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
          value={code}
          onChange={setCode}
          extensions={pythonEditorExtensions()}
          editable={!busy}
          ariaLabel="Python code"
        />
      }
      terminal={
        <TerminalPane output={output} isError={isError} placeholder={terminalPlaceholder} />
      }
      runBar={
        <RunBar
          onRun={() => void run()}
          onReset={handleReset}
          runLabel={buttonLabel}
          runDisabled={busy}
          resetDisabled={busy}
          statusMessage={statusMessage}
          statusIsError={!!loadError}
        />
      }
    />
  );
}
