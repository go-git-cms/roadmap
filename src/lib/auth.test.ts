import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeFor, safeNext, withParam } from "./auth.ts";

test("safeNext only returns same-site paths", () => {
  assert.equal(safeNext("/endorsements?area=API"), "/endorsements?area=API");
  assert.equal(safeNext("https://evil.example/"), "/");
  assert.equal(safeNext("//evil.example"), "/");
  assert.equal(safeNext(null), "/");
  assert.equal(safeNext(""), "/");
});

test("withParam appends to a path with or without a query", () => {
  assert.equal(withParam("/", "auth", "ok"), "/?auth=ok");
  assert.equal(withParam("/?feature=form-api", "auth", "ok"), "/?feature=form-api&auth=ok");
});

test("the S256 challenge is the base64url sha256 of the verifier", () => {
  // RFC 7636 appendix B.
  assert.equal(
    challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
});
