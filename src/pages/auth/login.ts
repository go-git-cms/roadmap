import type { APIRoute } from "astro";
import { authEnabled } from "~/lib/config";
import { beginAuthorize, safeNext } from "~/lib/auth";

export const prerender = false;

/**
 * Starts sign-in. `?next=` carries where to land afterwards, so a vote that
 * needed a session returns to the feature it was on, modal and all.
 *
 * The CMS is the issuer and owns the login screen; this endpoint only sets up
 * the PKCE attempt and bounces the browser there.
 */
export const GET: APIRoute = ({ cookies, url, redirect }) => {
  if (!authEnabled()) return redirect("/", 302);
  const next = safeNext(url.searchParams.get("next"));
  return redirect(beginAuthorize(cookies, url, next), 302);
};
