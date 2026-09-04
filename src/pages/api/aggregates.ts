import type { APIRoute } from "astro";
import { snapshot } from "~/lib/endorsements";

export const prerender = false;

/**
 * The public counts, for anything that wants to refresh them without a page
 * load. Counts and a note count per feature, plus the number of distinct
 * endorsers; never a note, never who voted. `aggregates` is null when the form
 * API is unreachable, which the island renders as "unavailable".
 */
export const GET: APIRoute = async () => {
  const { aggregates, endorsers } = await snapshot(null);
  return new Response(JSON.stringify({ aggregates, endorsers }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "public, max-age=15" },
  });
};
