import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, dedupe, mineOf, type Endorsement } from "./endorsements.ts";

const row = (o: Partial<Endorsement> & Pick<Endorsement, "id" | "featureId" | "submittedBy">): Endorsement => ({
  weight: "must",
  note: "",
  submittedAt: "2026-09-01T00:00:00Z",
  ...o,
});

test("the newest row per person and feature wins", () => {
  const rows = [
    row({ id: "1", featureId: "f", submittedBy: "a", weight: "must", submittedAt: "2026-09-01T00:00:00Z" }),
    row({ id: "2", featureId: "f", submittedBy: "a", weight: "nice", submittedAt: "2026-09-02T00:00:00Z" }),
    row({ id: "3", featureId: "f", submittedBy: "b", weight: "must" }),
    row({ id: "4", featureId: "g", submittedBy: "a", weight: "none", note: "meh" }),
  ];
  assert.deepEqual(dedupe(rows).map((r) => r.id).sort(), ["2", "3", "4"]);
});

test("aggregates count weights and notes, and endorsers exclude none-only voters", () => {
  const rows = [
    row({ id: "1", featureId: "f", submittedBy: "a", weight: "must", note: "please" }),
    row({ id: "2", featureId: "f", submittedBy: "b", weight: "nice" }),
    row({ id: "3", featureId: "f", submittedBy: "c", weight: "none", note: "no" }),
    row({ id: "4", featureId: "g", submittedBy: "a", weight: "nice" }),
  ];
  const { aggregates, endorsers } = aggregate(rows);
  assert.deepEqual(aggregates.f, { must: 1, nice: 1, none: 1, noteCount: 2 });
  assert.deepEqual(aggregates.g, { must: 0, nice: 1, none: 0, noteCount: 0 });
  assert.equal(endorsers, 2);
  // Notes never appear in the public shape.
  assert.equal(JSON.stringify(aggregates).includes("please"), false);
});

test("a person's own view carries their votes and notes only", () => {
  const rows = [
    row({ id: "1", featureId: "f", submittedBy: "a", weight: "must", note: "mine" }),
    row({ id: "2", featureId: "f", submittedBy: "b", weight: "nice", note: "theirs" }),
    row({ id: "3", featureId: "g", submittedBy: "a", weight: "none" }),
  ];
  assert.deepEqual(mineOf(rows, "a"), { votes: { f: "must", g: "none" }, notes: { f: "mine" } });
  assert.deepEqual(mineOf(rows, "nobody"), { votes: {}, notes: {} });
});
