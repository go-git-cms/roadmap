import { isWeight, ZERO, type Counts, type Weight } from "./score.ts";
import { listSubmissions, remove, submit, type Submission } from "./forms.ts";
import { endorsementsEnabled } from "./config.ts";

/**
 * Endorsements: the form's rows turned into one vote per person per feature.
 *
 * The CMS stores every submission as its own row and knows nothing about
 * people. This module is where the roadmap's rules live:
 *
 *   - one vote per (submittedBy, featureId): the newest row wins, older rows
 *     are stale duplicates that a change left behind or a failed delete missed;
 *   - the public aggregate carries counts and a note COUNT, never a note;
 *   - a person reads back only their own rows.
 */

export type Endorsement = {
  id: string;
  featureId: string;
  weight: Weight;
  note: string;
  submittedBy: string;
  submittedAt: string;
};

export type Aggregates = Record<string, Counts>;

export type Mine = { votes: Record<string, Weight>; notes: Record<string, string> };

function toEndorsement(s: Submission): Endorsement | null {
  const f = s.fields ?? {};
  const featureId = typeof f.featureId === "string" ? f.featureId : "";
  const submittedBy = typeof f.submittedBy === "string" ? f.submittedBy : "";
  if (!featureId || !submittedBy || !isWeight(f.weight)) return null;
  return {
    id: s.id,
    featureId,
    weight: f.weight,
    note: typeof f.note === "string" ? f.note.trim() : "",
    submittedBy,
    submittedAt: s.submittedAt,
  };
}

/** Newest row per (person, feature). Pure, so the tests drive it directly. */
export function dedupe(rows: Endorsement[]): Endorsement[] {
  const latest = new Map<string, Endorsement>();
  for (const e of rows) {
    const k = `${e.submittedBy} ${e.featureId}`;
    const have = latest.get(k);
    if (!have || e.submittedAt > have.submittedAt) latest.set(k, e);
  }
  return [...latest.values()];
}

/** Public shape: counts per feature and the number of distinct endorsers. */
export function aggregate(rows: Endorsement[]): { aggregates: Aggregates; endorsers: number } {
  const aggregates: Aggregates = {};
  const people = new Set<string>();
  for (const e of dedupe(rows)) {
    const c = (aggregates[e.featureId] ??= { ...ZERO });
    c[e.weight] += 1;
    if (e.note) c.noteCount += 1;
    if (e.weight !== "none") people.add(e.submittedBy);
  }
  return { aggregates, endorsers: people.size };
}

/** One person's rows, as the client wants them. */
export function mineOf(rows: Endorsement[], sub: string): Mine {
  const mine: Mine = { votes: {}, notes: {} };
  for (const e of dedupe(rows.filter((r) => r.submittedBy === sub))) {
    mine.votes[e.featureId] = e.weight;
    if (e.note) mine.notes[e.featureId] = e.note;
  }
  return mine;
}

// ---- the store: a short cache over the form API ----------------------------

/**
 * Every page render needs the whole set, and the form API pages it out of a
 * database; a few seconds of staleness on the public counts is invisible,
 * while a fetch per request is not. Writes invalidate, so the person who just
 * voted always reads their own vote back.
 */
const TTL_MS = 15_000;
let cache: { at: number; rows: Endorsement[] } | null = null;
let inflight: Promise<Endorsement[]> | null = null;

export async function allEndorsements(): Promise<Endorsement[]> {
  if (!endorsementsEnabled()) throw new Error("endorsements are not configured");
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  if (!inflight) {
    inflight = listSubmissions()
      .then((subs) => {
        const rows = subs.map(toEndorsement).filter((e): e is Endorsement => e != null);
        cache = { at: Date.now(), rows };
        return rows;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function invalidate(): void {
  cache = null;
}

export type Snapshot = {
  aggregates: Aggregates | null;
  endorsers: number | null;
  mine: Mine | null;
};

/**
 * What a page needs, degraded rather than thrown: an unreachable form API
 * renders the board with counts unavailable. A snapshot for a signed-in
 * viewer includes their own votes and notes; nobody else's notes ever leave
 * this function.
 */
export async function snapshot(sub: string | null): Promise<Snapshot> {
  const empty: Mine = { votes: {}, notes: {} };
  if (!endorsementsEnabled()) return { aggregates: null, endorsers: null, mine: sub ? empty : null };
  try {
    const rows = await allEndorsements();
    const { aggregates, endorsers } = aggregate(rows);
    return { aggregates, endorsers, mine: sub ? mineOf(rows, sub) : null };
  } catch (err) {
    console.error("[roadmap] endorsement read failed:", err);
    return { aggregates: null, endorsers: null, mine: sub ? empty : null };
  }
}

/**
 * Records one person's weight and note on a feature. Posts the new row first
 * and only then deletes the old ones, so a failure between the two leaves a
 * duplicate that dedupe() resolves rather than a lost vote.
 */
export async function endorse(input: {
  sub: string;
  handle: string;
  featureId: string;
  weight: Weight;
  note: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const rows = await allEndorsements();
  const previous = rows.filter((r) => r.submittedBy === input.sub && r.featureId === input.featureId);
  const result = await submit({
    featureId: input.featureId,
    weight: input.weight,
    note: input.note || undefined,
    submittedBy: input.sub,
    handle: input.handle,
  });
  invalidate();
  if (!result.ok) {
    const message = result.errors.map((e) => e.message).join(" ") || "The form API rejected the endorsement.";
    return { ok: false, message };
  }
  await Promise.all(previous.map((p) => remove(p.id)));
  invalidate();
  return { ok: true };
}

/** Removes every row this person has on the feature: the vote and its note. */
export async function withdraw(sub: string, featureId: string): Promise<void> {
  const rows = await allEndorsements();
  const mine = rows.filter((r) => r.submittedBy === sub && r.featureId === featureId);
  await Promise.all(mine.map((p) => remove(p.id)));
  invalidate();
}
