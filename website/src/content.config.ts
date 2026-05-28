import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const topics = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/topics" }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { topics };
