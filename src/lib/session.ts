import crypto from "node:crypto";
import type { AstroCookies } from "astro";
import { config } from "./config.ts";

/**
 * The roadmap's own session.
 *
 * It deliberately does not reuse the CMS refresh cookie: that cookie is
 * path-scoped to /auth on the CMS origin and the roadmap is a separate
 * deployment on its own domain. Instead the site runs a PKCE round-trip
 * against the CMS (auth.ts), then keeps the resulting access token in its own
 * signed, HttpOnly cookie — the same shape as the docs site's session.
 *
 * The cookie is signed, not encrypted: it is HttpOnly and only ever read
 * server-side, and the signature is what stops a visitor from minting a
 * session for someone else's account — which, on a site that counts one vote
 * per person, is the attack that matters.
 */

const COOKIE = "gogitcms_roadmap_session";

export type Session = {
  /** CMS user id — the `submittedBy` every endorsement carries. */
  sub: string;
  email: string;
  name: string;
  /** CMS access token. Never reaches the browser. */
  accessToken: string;
  /** Unix seconds. Past this the session is treated as absent. */
  expiresAt: number;
};

/** The session reduced to what a template may render. Never carries the token. */
export type Viewer = {
  sub: string;
  handle: string;
  name: string;
  initials: string;
};

function key(): Buffer {
  const secret = config().sessionSecret;
  if (!secret) throw new Error("ROADMAP_SESSION_SECRET is not set");
  return Buffer.from(secret, "utf8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", key()).update(payload).digest("base64url");
}

export function encodeSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(payload);
  // Constant-time, and length-guarded because timingSafeEqual throws on a
  // length mismatch — which would itself leak the signature length.
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!s.sub || !s.accessToken) return null;
    if (typeof s.expiresAt !== "number" || s.expiresAt * 1000 <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/** True when the deployment is served over TLS, so cookies can be Secure. */
function secure(url: URL): boolean {
  return url.protocol === "https:";
}

export function setSession(cookies: AstroCookies, url: URL, s: Session): void {
  cookies.set(COOKIE, encodeSession(s), {
    httpOnly: true,
    // Lax, not Strict: the sign-in flow lands here as a top-level redirect from
    // the CMS origin, and Strict would withhold the cookie on that first hop.
    sameSite: "lax",
    secure: secure(url),
    path: "/",
    expires: new Date(s.expiresAt * 1000),
  });
}

export function clearSession(cookies: AstroCookies, url: URL): void {
  cookies.delete(COOKIE, { path: "/", secure: secure(url), sameSite: "lax", httpOnly: true });
}

export function readSession(cookies: AstroCookies): Session | null {
  if (!config().sessionSecret) return null;
  return decodeSession(cookies.get(COOKIE)?.value);
}

/**
 * The handle shown next to the avatar: the local part of the email, which is
 * what a CMS account has that looks like a username. Lowercased and stripped
 * of plus-tags so two forms of one address read as one person.
 */
export function handleFor(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local.split("+")[0].toLowerCase() || "you";
}

/** Two letters for the avatar tile: initials from the name, else the email. */
export function initials(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  const source = words[0] ?? email;
  return source.slice(0, 2).toUpperCase();
}

export function toViewer(s: Session | null): Viewer | null {
  if (!s) return null;
  return { sub: s.sub, handle: handleFor(s.email), name: s.name, initials: initials(s.name, s.email) };
}
