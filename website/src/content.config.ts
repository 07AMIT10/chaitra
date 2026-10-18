import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const topics = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/topics" }),
  schema: z.object({
    title: z.string(),
  }),
});

const drishtiLenses = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/drishti/lenses" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    question: z.string(),
    tldr: z.array(z.string()),
    relatedTopics: z.array(z.string()).optional(),
    deep: z.boolean().optional(),
  }),
});

const drishtiStudies = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/drishti/studies" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    tagline: z.string(),
    phenomenon: z.string().optional(),
    tldr: z.array(z.string()),
    relatedTopics: z.array(z.string()),
    atAGlance: z.object({
      flows: z.string(),
      optimizes: z.string(),
      persists: z.string(),
      likelyFuture: z.string(),
    }),
  }),
});

const drishtiFramework = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/drishti/framework" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    tldr: z.array(z.string()),
  }),
});

const algorithms = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./src/content/algorithms" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    field: z.string(),
    fieldLabel: z.string(),
    reframe: z.string(),
    oneLine: z.string(),
    tldr: z.array(z.string()).min(1),
    mathBranches: z.array(z.string()),
    primitives: z.array(z.string()),
    attributions: z.array(z.string()),
    relatedTopics: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
  }),
});

export const collections = {
  topics,
  drishtiLenses,
  drishtiStudies,
  drishtiFramework,
  algorithms,
};
