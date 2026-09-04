import type { APIRoute } from "astro";
import { authEnabled } from "~/lib/config";
import { SESSION_TTL_SECONDS, consumePending, exchangeCode, withParam } from "~/lib/auth";
import { setSession } from "~/lib/session";
import { displayName, me } from "~/lib/cms";

export const prerender = false;

/**
 * Where the CMS returns after /auth/authorize, with either `code` or `error`.
 *
 * Every failure path lands the visitor back on a real page with `?auth=<reason>`
 * rather than on an error screen: the roadmap is public, so a failed sign-in
 * degrades to browsing signed out, not to a dead end. The island turns the
 * reason into a toast.
 */
export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  if (!authEnabled()) return redirect("/", 302);

  const params = url.searchParams;
  const pending = consumePending(cookies, url, params.get("state"));

  // A missing or mismatched pending attempt means the state check failed:
  // treat it as hostile and never redeem the code.
  if (!pending) return redirect("/?auth=expired", 302);

  const error = params.get("error");
  if (error) {
    // login_required is the ordinary "not signed in at the CMS" answer, and
    // the CMS owns that screen; the rest are genuine faults worth naming.
    const reason = error === "login_required" ? "signin" : error;
    return redirect(withParam(pending.next, "auth", reason), 302);
  }

  const code = params.get("code");
  if (!code) return redirect(withParam(pending.next, "auth", "failed"), 302);

  try {
    const accessToken = await exchangeCode(code, pending.verifier);
    const profile = await me(accessToken);
    setSession(cookies, url, {
      sub: profile.id,
      email: profile.email,
      name: displayName(profile),
      accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    });
    return redirect(withParam(pending.next, "auth", "ok"), 302);
  } catch (err) {
    console.error("[roadmap] sign-in failed:", err);
    return redirect(withParam(pending.next, "auth", "failed"), 302);
  }
};
