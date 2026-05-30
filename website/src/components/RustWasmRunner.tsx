import { useCallback, useEffect, useRef, useState } from "react";
import { CodeWorkbench, CodeMirrorPane, RunBar, TerminalPane } from "./code-workbench";
import { rustReadOnlyEditorExtensions } from "./code-workbench/editorExtensions";

const WASM_JS = "/wasm/bloom_filter/bloom_filter_wasm.js";
const WASM_BIN = "/wasm/bloom_filter/bloom_filter_wasm_bg.wasm";

type WasmModule = {
  default: (input?: RequestInfo | URL) => Promise<unknown>;
  run_reference_demo: () => string;
};

export type RustWasmRunnerProps = {
  defaultSource: string;
  sourceUrl: string;
  sourceLabel?: string;
};

type LoadState = "loading" | "ready" | "error" | "running";

function wasmLoadErrorMessage(detail: string): string {
  return `Rust WASM failed to load. Rebuild with \`npm run build:wasm\`, or open the reference implementation on GitHub.\n(${detail})`;
}

export default function RustWasmRunner({
  defaultSource,
  sourceUrl,
  sourceLabel = "bloom_filter.rs on GitHub",
}: RustWasmRunnerProps) {
  const [output, setOutput] = useState("");
  const [isError, setIsError] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const wasmRef = useRef<WasmModule | null>(null);

  const runDemo = useCallback((mod: WasmModule) => {
    const demo = mod.run_reference_demo();
    setOutput(demo.trimEnd());
    setIsError(false);
  }, []);

  const loadWasm = useCallback(async (): Promise<WasmModule> => {
    const mod = (await import(/* @vite-ignore */ WASM_JS)) as WasmModule;
    await mod.default(WASM_BIN);
    wasmRef.current = mod;
    return mod;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await loadWasm();
        if (!cancelled) {
          runDemo(mod);
          setLoadState("ready");
          setErrorDetail(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("WASM load failed:", err);
          setErrorDetail(message);
          setLoadState("error");
          setIsError(true);
          setOutput(wasmLoadErrorMessage(message));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWasm, runDemo]);

  const handleRun = useCallback(async () => {
    setOutput("");
    setIsError(false);

    if (loadState === "error" || !wasmRef.current) {
      setLoadState("loading");
      setErrorDetail(null);
      try {
        const mod = await loadWasm();
        runDemo(mod);
        setLoadState("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("WASM load failed:", err);
        setErrorDetail(message);
        setLoadState("error");
        setIsError(true);
        setOutput(wasmLoadErrorMessage(message));
      }
      return;
    }

    setLoadState("running");
    try {
      runDemo(wasmRef.current);
      setLoadState("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setIsError(true);
      setOutput(message);
      setLoadState("ready");
    }
  }, [loadState, loadWasm, runDemo]);

  const busy = loadState === "loading" || loadState === "running";
  const runLabel =
    loadState === "loading"
      ? "Loading WASM…"
      : loadState === "running"
        ? "Running…"
        : loadState === "error"
          ? "Retry"
          : "Run WASM demo";

  const statusMessage =
    loadState === "error" && errorDetail
      ? errorDetail
      : loadState === "loading"
        ? "Loading Rust WASM…"
        : loadState === "ready"
          ? "WASM demo ready."
          : undefined;

  return (
    <CodeWorkbench
      header={
        <>
          <p>
            Reference source (read-only). Run executes the prebuilt WASM demo — clone the repo to
            compile Rust locally.
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
      terminal={<TerminalPane output={output} isError={isError} />}
      runBar={
        <RunBar
          onRun={() => void handleRun()}
          runLabel={runLabel}
          runDisabled={busy}
          statusMessage={statusMessage}
          statusIsError={loadState === "error"}
        />
      }
    />
  );
}
