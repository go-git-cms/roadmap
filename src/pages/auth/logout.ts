import type { APIRoute } from "astro";
import { clearSession } from "~/lib/session";
import { safeNext } from "~/lib/auth";

export const prerender = false;

/**
 * Drops the roadmap session. POST only: a GET would let any page on the
 * internet sign a visitor out with an <img> tag.
 *
 * This clears the roadmap cookie alone; the CMS session it was derived from is
 * untouched, so signing out here doesn't sign anyone out of the editor they
 * have open in the next tab.
 */
export const POST: APIRoute = ({ cookies, url, redirect }) => {
  clearSession(cookies, url);
  return redirect(safeNext(url.searchParams.get("next")), 303);
};
