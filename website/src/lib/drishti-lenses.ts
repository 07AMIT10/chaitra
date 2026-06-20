import lensesJson from "../data/drishti-lenses.json";

export type DrishtiLens = {
  slug: string;
  folder: string;
  title: string;
  question: string;
  hook: string;
  glyph: string;
};

export const DRISHTI_LENSES = lensesJson as DrishtiLens[];

export const LENS_BY_SLUG = Object.fromEntries(
  DRISHTI_LENSES.map((l) => [l.slug, l])
) as Record<string, DrishtiLens>;

export const LENS_SLUGS = DRISHTI_LENSES.map((l) => l.slug);
