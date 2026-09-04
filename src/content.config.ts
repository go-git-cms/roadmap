import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * The Astro-side mirror of go-git-cms.yml.
 *
 * Two schemas describing one set of files: the CMS validates what an editor may
 * save, Astro validates what the build may render, and neither can see the
 * other. Keep them in step — the build failing is how you find out they aren't.
 */

export const AREAS = ["Editor", "API", "Auth", "Media", "Sync"] as const;
export const STATUSES = ["Exploring", "Planned", "In progress", "Shipped"] as const;
export const MOCKUPS = ["diff", "form", "browser", "schedule"] as const;

/**
 * `z.date()` is the obvious choice and it is a trap: Astro's frontmatter parser
 * turns an unquoted `2026-09-01` into a Date and a quoted `"2026-09-01"` into a
 * string, and the CMS quotes date-shaped scalars when it re-serializes a
 * document. `z.coerce.date()` accepts both, so the site keeps building after
 * an editor's first save.
 */
const isoDate = z.coerce.date();

const roadmap = defineCollection({
  // content/roadmap at the project root rather than under src/: the path is
  // part of the product — cards, the ranked list and the footer all name it —
  // and a reader of the public repository should find the entries where the
  // site says they are.
  loader: glob({ pattern: "**/*.md", base: "./content/roadmap" }),
  schema: z.object({
    title: z.string(),
    area: z.enum(AREAS),
    status: z.enum(STATUSES),
    blurb: z.string(),
    // The CMS writes "" for a cleared select; treat it as absent.
    mockup: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.enum(MOCKUPS).optional()),
    updated: isoDate,
    shippedIn: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().optional()),
    order: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.number().optional()),
  }),
});

export const collections = { roadmap };
