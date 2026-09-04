import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { endorsementsEnabled } from "~/lib/config";
import { endorse, snapshot, withdraw } from "~/lib/endorsements";
import { FormApiError } from "~/lib/forms";
import { isWeight } from "~/lib/score";
import { handleFor } from "~/lib/session";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const NOTE_MAX = 1000;

/**
 * The only way a vote reaches the CMS.
 *
 *   POST   { featureId, weight, note }   record or change an endorsement
 *   DELETE { featureId }                 withdraw it, note included
 *
 * Both answer with the fresh public aggregates and the caller's own votes, so
 * the island reconciles its optimistic state from one round trip. Both require
 * the roadmap session: `submittedBy` is derived from it and never read from
 * the body, which is the whole reason the browser does not post to the form
 * API directly.
 */

async function validFeature(id: unknown): Promise<string | null> {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(id)) return null;
  const entries = await getCollection("roadmap");
  return entries.some((e) => e.id === id) ? id : null;
}

async function respond(sub: string) {
  const snap = await snapshot(sub);
  return json(200, { ok: true, ...snap });
}

function failed(err: unknown): Response {
  if (err instanceof FormApiError) {
    console.error(`[roadmap] form API ${err.status} ${err.code}: ${err.message}`);
    // The reason is the operator's, not the visitor's: an unconnected
    // repository, a revoked token. Say something true and short.
    return json(502, { ok: false, message: "The form API refused the write. Try again in a moment." });
  }
  console.error("[roadmap] endorsement write failed:", err);
  return json(502, { ok: false, message: "Could not reach the form API." });
}

export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session;
  if (!session) return json(401, { ok: false, code: "unauthenticated", message: "Sign in to endorse." });
  if (!endorsementsEnabled()) return json(503, { ok: false, message: "Endorsements are not configured on this deployment." });

  let body: { featureId?: unknown; weight?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, message: "Expected a JSON body." });
  }
  const featureId = await validFeature(body.featureId);
  if (!featureId) return json(400, { ok: false, message: "That feature is not on the roadmap." });
  if (!isWeight(body.weight)) return json(400, { ok: false, message: "Pick a weight." });
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > NOTE_MAX) return json(400, { ok: false, message: `Notes are limited to ${NOTE_MAX} characters.` });

  try {
    const result = await endorse({ sub: session.sub, handle: handleFor(session.email), featureId, weight: body.weight, note });
    if (!result.ok) return json(422, { ok: false, message: result.message });
    return await respond(session.sub);
  } catch (err) {
    return failed(err);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const session = locals.session;
  if (!session) return json(401, { ok: false, code: "unauthenticated", message: "Sign in to endorse." });
  if (!endorsementsEnabled()) return json(503, { ok: false, message: "Endorsements are not configured on this deployment." });

  let body: { featureId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, message: "Expected a JSON body." });
  }
  const featureId = await validFeature(body.featureId);
  if (!featureId) return json(400, { ok: false, message: "That feature is not on the roadmap." });

  try {
    await withdraw(session.sub, featureId);
    return await respond(session.sub);
  } catch (err) {
    return failed(err);
  }
};
