import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? "https://chaitra.pages.dev",
  integrations: [mdx(), react()],
  output: "static",
});
