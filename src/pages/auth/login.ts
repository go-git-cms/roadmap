import type { APIRoute } from "astro";
import { authEnabled } from "~/lib/config";
import { beginAuthorize, safeNext, withParam } from "~/lib/auth";

export const prerender = false;

/**
 * Starts sign-in. `?next=` carries where to land afterwards, so a vote that
 * needed a session returns to the feature it was on, modal and all.
 *
 * The CMS is the issuer and owns the login screen; this endpoint only sets up
 * the PKCE attempt and bounces the browser there.
 */
export const GET: APIRoute = ({ cookies, url, redirect }) => {
  const next = safeNext(url.searchParams.get("next"));
  // Sign-in is off because the deployment is missing one of ROADMAP_CMS_URL,
  // ROADMAP_PUBLIC_URL or ROADMAP_SESSION_SECRET (config.authEnabled). A bare
  // bounce to / is indistinguishable from "you are signed out", which is
  // exactly how a misconfigured deployment reads as a broken login — so name
  // the reason and let the island say it out loud.
  if (!authEnabled()) return redirect(withParam(next, "auth", "unconfigured"), 302);
  return redirect(beginAuthorize(cookies, url, next), 302);
};
