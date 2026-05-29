import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { remarkMermaidClient } from "./src/plugins/remark-mermaid-client.mjs";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://chaitra.pages.dev",
  integrations: [
    mdx({
      components: {
        Callout: "./src/components/mdx/Callout.astro",
        Details: "./src/components/mdx/Details.astro",
      },
    }),
    react(),
  ],
  output: "static",
  markdown: {
    remarkPlugins: [remarkMath, remarkMermaidClient],
    rehypePlugins: [[rehypeKatex, { output: "html", strict: "ignore" }]],
  },
});
