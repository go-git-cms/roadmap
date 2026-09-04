import type { Feature } from "~/lib/content";
import type { Counts, Weight } from "~/lib/score";

/** One feature as the views render it: content plus the viewer-adjusted counts. */
export type Row = {
  feature: Feature;
  /** Null while counts are unavailable. */
  counts: Counts | null;
  score: number | null;
  /** The viewer's own weight on it, if any. */
  mine: Weight | undefined;
};

export const WEIGHT_LABEL: Record<Weight, string> = { must: "must-have", nice: "nice-to-have", none: "don't care" };

/** The badge a viewer's own vote earns on a card or row: none for "don't care". */
export function mineBadge(w: Weight | undefined): { label: string; tone: "strong" | "neutral" } | null {
  if (!w || w === "none") return null;
  return { label: WEIGHT_LABEL[w], tone: w === "must" ? "strong" : "neutral" };
}

export const LANES = ["Exploring", "Planned", "In progress", "Shipped"] as const;
export const AREA_FILTERS = ["All", "Editor", "API", "Auth", "Media", "Sync"] as const;
