/**
 * Scoring. Pure, so the server-rendered board, the client's optimistic
 * updates and the tests all agree on one arithmetic.
 *
 *   score = must × 3 + nice × 1
 *
 * `none` contributes nothing: it is stored because "I don't need this" is
 * signal to a maintainer, not because it moves the number.
 */

export type Weight = "must" | "nice" | "none";

export const WEIGHTS: Weight[] = ["must", "nice", "none"];

export function isWeight(v: unknown): v is Weight {
  return v === "must" || v === "nice" || v === "none";
}

/** Public counts for one feature. Never carries the notes themselves. */
export type Counts = { must: number; nice: number; none: number; noteCount: number };

export const ZERO: Counts = { must: 0, nice: 0, none: 0, noteCount: 0 };

export function score(c: Counts): number {
  return c.must * 3 + c.nice;
}

/**
 * Bar widths as fractions of the highest score IN THE WHOLE SET, so filtering
 * the board never rescales the bars. Two segments of one bar: must first
 * (near-black), nice after it (mid-gray).
 */
export function barWidths(c: Counts, maxScore: number): { must: number; nice: number } {
  const denom = Math.max(maxScore, 1);
  return { must: (c.must * 3) / denom, nice: c.nice / denom };
}

export function maxScoreOf(all: Iterable<Counts>): number {
  let max = 0;
  for (const c of all) max = Math.max(max, score(c));
  return max;
}

/** Ranked order: score desc, then must desc, then title. */
export function compareRanked<T extends { title: string; counts: Counts }>(a: T, b: T): number {
  const d = score(b.counts) - score(a.counts);
  if (d !== 0) return d;
  const m = b.counts.must - a.counts.must;
  if (m !== 0) return m;
  return a.title.localeCompare(b.title);
}

/**
 * The counts a viewer sees after their own (possibly optimistic, possibly
 * unsaved) vote is applied over the server's aggregate. `recorded` is the
 * vote the server already counted for this viewer when the aggregate was
 * taken; `current` is what they have selected now. Moving from one to the
 * other adjusts exactly the two buckets involved.
 */
export function withOwnVote(
  base: Counts,
  recorded: Weight | undefined,
  current: Weight | undefined,
): Counts {
  if (recorded === current) return base;
  const c = { ...base };
  if (recorded) c[recorded] = Math.max(0, c[recorded] - 1);
  if (current) c[current] += 1;
  return c;
}
