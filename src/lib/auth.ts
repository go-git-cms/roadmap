import crypto from "node:crypto";
import type { AstroCookies } from "astro";
import { config } from "./config.ts";

/**
 * PKCE against the CMS authorization endpoint.
 *
 * The roadmap is a public client on its own origin, so it uses the same
 * authorization-code + S256 flow the cross-site editor and the docs site use:
 * a top-level redirect to /api/v1/auth/authorize, where the CMS reads its own
 * first-party session cookie and hands back a code, then a back-channel POST
 * to /api/v1/auth/token exchanging the code plus verifier for an access token.
 * "Sign in with CMS session" is exactly that — the roadmap never sees a
 * password and never owns an account.
 *
 * The CMS only mints codes for redirect targets on its allowlist, so the
 * roadmap's origin has to be registered there: CMS_DOCS_URL on the CMS
 * deployment, a comma-separated list of trusted first-party origins.
 */

const PKCE_COOKIE = "gogitcms_roadmap_pkce";
/** The round-trip is two redirects; anything longer is an abandoned attempt. */
const PKCE_TTL_SECONDS = 600;
const PKCE_COOKIE_PATH = "/auth";

type Pending = { verifier: string; state: string; next: string };

function key(): Buffer {
  const secret = config().sessionSecret;
  if (!secret) throw new Error("ROADMAP_SESSION_SECRET is not set");
  return Buffer.from(secret, "utf8");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", key()).update(payload).digest("base64url");
}

export function challengeFor(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function redirectUri(): string {
  return `${config().publicUrl}/auth/callback`;
}

/**
 * Only same-site paths may be returned to after sign-in. An absolute URL here
 * would turn the callback into an open redirect, and "//evil.example" parses as
 * a protocol-relative URL in the browser even though it looks like a path.
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

/** Appends a query parameter to a path that may already carry some. */
export function withParam(path: string, name: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

/** Starts the flow: returns the CMS URL to send the browser to. */
export function beginAuthorize(cookies: AstroCookies, url: URL, next: string): string {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const state = crypto.randomBytes(16).toString("base64url");
  const pending: Pending = { verifier, state, next: safeNext(next) };

  const payload = Buffer.from(JSON.stringify(pending), "utf8").toString("base64url");
  cookies.set(PKCE_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    // Lax so the cookie survives the top-level redirect back from the CMS.
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: PKCE_COOKIE_PATH,
    maxAge: PKCE_TTL_SECONDS,
  });

  const authorize = new URL(`${config().cmsUrl}/api/v1/auth/authorize`);
  authorize.searchParams.set("redirect_uri", redirectUri());
  authorize.searchParams.set("code_challenge", challengeFor(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("state", state);
  return authorize.toString();
}

/**
 * Reads back and consumes the pending attempt. Returns null when the cookie is
 * missing, tampered with, or its state doesn't match the one the CMS echoed —
 * the CSRF check that stops an attacker replaying their own code into this
 * browser's session.
 */
export function consumePending(cookies: AstroCookies, url: URL, state: string | null): Pending | null {
  const raw = cookies.get(PKCE_COOKIE)?.value;
  cookies.delete(PKCE_COOKIE, { path: PKCE_COOKIE_PATH, secure: url.protocol === "https:" });
  if (!raw || !state) return null;

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(payload);
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;

  let pending: Pending;
  try {
    pending = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Pending;
  } catch {
    return null;
  }
  if (pending.state.length !== state.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(pending.state), Buffer.from(state))) return null;
  return pending;
}

/** Redeems a code for an access token. Throws on any non-2xx from the CMS. */
export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const res = await fetch(`${config().cmsUrl}/api/v1/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ code, codeVerifier: verifier }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const body = (await res.json()) as { accessToken?: string };
  if (!body.accessToken) throw new Error("token exchange returned no accessToken");
  return body.accessToken;
}

/**
 * How long to trust the access token for. The CMS doesn't report an expiry on
 * this endpoint, so the session is deliberately shorter than the token's real
 * lifetime: expiring early costs one sign-in click, expiring late would
 * surface as a 401 mid-vote.
 */
export const SESSION_TTL_SECONDS = 30 * 60;
