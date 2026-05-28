import { useEffect, useState } from "react";
import "./WasmBloomRunner.css";

const WASM_JS = "/wasm/bloom_filter/bloom_filter_wasm.js";
const RUST_SOURCE =
  "https://github.com/07AMIT10/chaitra/blob/main/BLOOM_FILTERS/bloom_filter.rs";

type WasmModule = {
  BloomFilter: new (items_count: number, fp_prob: number) => {
    size: number;
    hash_count: number;
    add: (item: string) => void;
    check: (item: string) => boolean;
  };
  run_reference_demo: () => string;
};

export type WasmBloomRunnerProps = {
  sourceUrl?: string;
  sourceLabel?: string;
};

export default function WasmBloomRunner({
  sourceUrl = RUST_SOURCE,
  sourceLabel = "bloom_filter.rs on GitHub",
}: WasmBloomRunnerProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [output, setOutput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import(/* @vite-ignore */ WASM_JS)) as WasmModule;
        const demo = mod.run_reference_demo();
        if (!cancelled) {
          setOutput(demo.trimEnd());
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "error") {
    return (
      <div className="wasm-bloom-runner wasm-bloom-runner--error">
        <p role="alert">
          Rust WASM failed to load. Rebuild with <code>npm run build:wasm</code>, or open the
          reference implementation on GitHub.
        </p>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {sourceLabel}
        </a>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="wasm-bloom-runner">
        <p className="wasm-bloom-runner__status" role="status" aria-live="polite">
          Loading Rust WASM…
        </p>
      </div>
    );
  }

  return (
    <div className="wasm-bloom-runner">
      <div className="wasm-bloom-runner__header">
        <p>
          Output from the same demo as <code>bloom_filter.rs</code> (20 items, 5% target FP) —
          compiled to WebAssembly.
        </p>
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {sourceLabel}
        </a>
      </div>
      <pre className="wasm-bloom-runner__output" aria-label="Rust WASM demo output">
        {output}
      </pre>
    </div>
  );
}
