import type { APIRoute } from "astro";
import { snapshot } from "~/lib/endorsements";

export const prerender = false;

/**
 * The caller's own endorsements: `{ votes, notes }` keyed by feature id. This
 * is the only place a note ever leaves the server, and it is scoped to the
 * session that wrote it. The public counts come alongside so one call refreshes
 * both halves of the island's state.
 */
export const GET: APIRoute = async ({ locals }) => {
  const session = locals.session;
  if (!session) {
    return new Response(JSON.stringify({ ok: false, code: "unauthenticated" }), {
      status: 401,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  const snap = await snapshot(session.sub);
  return new Response(JSON.stringify({ ok: true, ...snap }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
