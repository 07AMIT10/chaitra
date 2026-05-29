import { visit } from "unist-util-visit";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Transform ```mermaid fences into <pre class="mermaid"> for client-side rendering (not Shiki). */
export function remarkMermaidClient() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (!parent || index == null || node.lang !== "mermaid") return;
      parent.children[index] = {
        type: "html",
        value: `<pre class="mermaid">${escapeHtml(node.value ?? "")}</pre>`,
      };
    });
  };
}
