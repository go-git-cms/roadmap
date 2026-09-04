import { test } from "node:test";
import assert from "node:assert/strict";
import { barWidths, compareRanked, maxScoreOf, score, withOwnVote, type Counts } from "./score.ts";

const c = (must: number, nice: number, none = 0): Counts => ({ must, nice, none, noteCount: 0 });

test("score weights must x3 and nice x1, none x0", () => {
  assert.equal(score(c(2, 3, 99)), 9);
  assert.equal(score(c(0, 0, 5)), 0);
});

test("bars are normalised against the whole set's maximum", () => {
  const max = maxScoreOf([c(10, 0), c(1, 1)]);
  assert.equal(max, 30);
  assert.deepEqual(barWidths(c(1, 1), max), { must: 3 / 30, nice: 1 / 30 });
  // An empty set must not divide by zero.
  assert.deepEqual(barWidths(c(0, 0), 0), { must: 0, nice: 0 });
});

test("ranking breaks ties on must, then title", () => {
  const rows = [
    { title: "b", counts: c(0, 6) },
    { title: "a", counts: c(2, 0) },
    { title: "c", counts: c(1, 3) },
    { title: "d", counts: c(3, 0) },
  ];
  assert.deepEqual(
    rows.sort(compareRanked).map((r) => r.title),
    // d=9, then a/b/c all 6: a (must 2) > c (must 1) > b (must 0).
    ["d", "a", "c", "b"],
  );
});

test("applying the viewer's own vote moves one unit between buckets", () => {
  const base = c(5, 5, 1);
  assert.deepEqual(withOwnVote(base, undefined, "must"), c(6, 5, 1));
  assert.deepEqual(withOwnVote(base, "must", "nice"), c(4, 6, 1));
  assert.deepEqual(withOwnVote(base, "nice", undefined), c(5, 4, 1));
  assert.deepEqual(withOwnVote(base, "must", "must"), base);
  // A stale aggregate can't go negative.
  assert.deepEqual(withOwnVote(c(0, 0), "must", undefined), c(0, 0));
});
