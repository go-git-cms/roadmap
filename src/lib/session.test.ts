import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeSession, encodeSession, handleFor, initials, toViewer, type Session } from "./session.ts";
import { resetConfigForTests } from "./config.ts";

function withSecret(secret: string | undefined) {
  if (secret == null) delete process.env.ROADMAP_SESSION_SECRET;
  else process.env.ROADMAP_SESSION_SECRET = secret;
  resetConfigForTests();
}

const session: Session = {
  sub: "u-1",
  email: "Dana.Reyes+cms@example.com",
  name: "Dana Reyes",
  accessToken: "tok",
  expiresAt: Math.floor(Date.now() / 1000) + 600,
};

test("a session round-trips through its cookie value", () => {
  withSecret("s3cret");
  assert.deepEqual(decodeSession(encodeSession(session)), session);
});

test("a tampered payload is rejected", () => {
  withSecret("s3cret");
  const raw = encodeSession(session);
  const [payload, mac] = raw.split(".");
  const forged = Buffer.from(JSON.stringify({ ...session, sub: "someone-else" })).toString("base64url");
  assert.equal(decodeSession(`${forged}.${mac}`), null);
  assert.equal(decodeSession(`${payload}.${mac.slice(1)}x`), null);
  assert.equal(decodeSession("garbage"), null);
});

test("a signature from another secret is rejected", () => {
  withSecret("one");
  const raw = encodeSession(session);
  withSecret("two");
  assert.equal(decodeSession(raw), null);
});

test("an expired session reads as absent", () => {
  withSecret("s3cret");
  assert.equal(decodeSession(encodeSession({ ...session, expiresAt: 1 })), null);
});

test("handle and initials derive from the account", () => {
  assert.equal(handleFor("Dana.Reyes+cms@example.com"), "dana.reyes");
  assert.equal(initials("Dana Reyes", "d@example.com"), "DR");
  assert.equal(initials("", "dreyes@example.com"), "DR");
  withSecret("s3cret");
  assert.deepEqual(toViewer(session), { sub: "u-1", handle: "dana.reyes", name: "Dana Reyes", initials: "DR" });
  assert.equal(toViewer(null), null);
});
