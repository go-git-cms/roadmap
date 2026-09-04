import { test } from "node:test";
import assert from "node:assert/strict";
import { relative } from "./time.ts";

test("relative time rounds down to the coarsest unit that fits", () => {
  const now = new Date("2026-09-04T12:00:00Z");
  const at = (iso: string) => relative(new Date(iso), now);
  assert.equal(at("2026-09-04T11:59:30Z"), "just now");
  assert.equal(at("2026-09-04T11:40:00Z"), "20m ago");
  assert.equal(at("2026-09-04T10:00:00Z"), "2h ago");
  assert.equal(at("2026-09-01T12:00:00Z"), "3d ago");
  assert.equal(at("2026-08-28T12:00:00Z"), "1w ago");
  assert.equal(at("2026-07-08T12:00:00Z"), "1mo ago");
  assert.equal(at("2024-07-08T12:00:00Z"), "2y ago");
  // The future is clamped rather than negative.
  assert.equal(at("2027-01-01T00:00:00Z"), "just now");
});
