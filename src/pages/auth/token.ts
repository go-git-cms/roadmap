import type { APIRoute } from "astro";
import { authEnabled, config } from "~/lib/config";
import { SESSION_TTL_SECONDS } from "~/lib/auth";
import { setSession } from "~/lib/session";
import { CmsError, displayName, me } from "~/lib/cms";

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/**
 * The token path of the sign-in dialog: a CMS access token pasted by someone
 * whose browser has no CMS session to redirect through (a native client, an
 * automation, a second profile). It is validated against the same endpoint
 * the PKCE path uses, /api/v1/me, so a session made this way carries exactly
 * the identity a redirect would have produced.
 *
 * A content token (cmsct_...) is refused with a reason: it names a role, not
 * a person, and the roadmap counts people.
 */
export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (!authEnabled()) return json(503, { ok: false, message: "Sign-in is not configured on this deployment." });

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token.trim() : "";
  } catch {
    return json(400, { ok: false, message: "Expected a JSON body with a token." });
  }
  if (!token) return json(400, { ok: false, message: "Paste a token first." });
  if (token.startsWith("cmsct_")) {
    return json(400, {
      ok: false,
      message: "That is a content token. It names a role, not a person; the roadmap needs a session token.",
    });
  }

  try {
    const profile = await me(token);
    setSession(cookies, url, {
      sub: profile.id,
      email: profile.email,
      name: displayName(profile),
      accessToken: token,
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    });
    return json(200, { ok: true });
  } catch (err) {
    if (err instanceof CmsError && err.unauthorized) {
      return json(401, { ok: false, message: `${new URL(config().cmsUrl!).host} did not accept that token.` });
    }
    console.error("[roadmap] token sign-in failed:", err);
    return json(502, { ok: false, message: "The CMS could not be reached to check the token." });
  }
};
