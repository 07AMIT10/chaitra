import { useEffect } from "react";

const MERMAID_SELECTOR = ".prose pre.mermaid:not([data-processed])";

let mermaidReady: Promise<typeof import("mermaid")["default"]> | null = null;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
      });
      return mermaid;
    });
  }
  return mermaidReady;
}

async function renderMermaidBlocks(root: ParentNode = document) {
  const nodes = root.querySelectorAll<HTMLElement>(MERMAID_SELECTOR);
  if (!nodes.length) return;

  const mermaid = await loadMermaid();
  try {
    await mermaid.run({ nodes: [...nodes] });
  } catch (err) {
    console.error("Mermaid render failed:", err);
    nodes.forEach((el) => {
      if (!el.querySelector("svg")) el.classList.add("mermaid--failed");
    });
  }
}

/** Renders <pre class="mermaid"> blocks in prose content after mount. */
export default function MermaidInit() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await renderMermaidBlocks();
      if (cancelled) return;
    })();

    const onToggle = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLDetailsElement) || !target.open) return;
      void renderMermaidBlocks(target);
    };

    document.addEventListener("toggle", onToggle, true);

    return () => {
      cancelled = true;
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  return null;
}
