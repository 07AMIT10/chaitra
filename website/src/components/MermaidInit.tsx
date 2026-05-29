import { useEffect } from "react";

/** Renders <pre class="mermaid"> blocks in topic narratives after mount. */
export default function MermaidInit() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(
      ".topic__narrative pre.mermaid:not([data-processed])"
    );
    if (!nodes.length) return;

    let cancelled = false;
    void (async () => {
      const { default: mermaid } = await import("mermaid");
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "loose",
      });
      try {
        await mermaid.run({ nodes: [...nodes] });
      } catch (err) {
        console.error("Mermaid render failed:", err);
        nodes.forEach((el) => {
          if (!el.querySelector("svg")) el.classList.add("mermaid--failed");
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
