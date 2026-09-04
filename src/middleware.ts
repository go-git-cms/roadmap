import type { MiddlewareHandler } from "astro";
import { previewMiddleware } from "@gogitcms/preview-astro";
import { readSession, toViewer } from "./lib/session";
import { authEnabled } from "./lib/config";

/**
 * Two things every request needs before a page renders.
 *
 * The CMS draft (preview mode): verifies the signed preview payload from the
 * editor, puts it on Astro.locals.preview, parks it in the __cms_preview
 * cookie so in-site navigation keeps the draft, and sets the cache headers
 * that keep a preview response out of every cache. CMS_PREVIEW_SECRET must
 * match the value the CMS signs payloads with; unset (local dev) unsigned
 * payloads are accepted, with a console warning.
 *
 * The viewer: the session is resolved once and put on Astro.locals so no
 * template has to know how it is stored. Pages read `locals.viewer` (safe to
 * render); server routes read `locals.session` when they need the identity.
 * A lapsed or tampered cookie yields a null viewer rather than an error: the
 * roadmap is public and must render either way.
 */
const preview = previewMiddleware({
  secret: import.meta.env.CMS_PREVIEW_SECRET,
});

export const onRequest: MiddlewareHandler = (context, next) => {
  const session = readSession(context.cookies);
  context.locals.session = session;
  context.locals.viewer = toViewer(session);
  context.locals.authEnabled = authEnabled();

  return preview(
    {
      request: context.request,
      url: originalUrl(context.request, context.url),
      locals: context.locals as unknown as Record<string, unknown>,
    },
    next,
  );
};

/**
 * Recover the original query string. Some adapters replace it with their own
 * routing parameter before the middleware runs, so a payload carried on the
 * page URL would be invisible here; the original path+query survives in the
 * x-forwarded-uri header.
 */
function originalUrl(request: Request, url: URL): URL {
  if (url.searchParams.has("__cms_preview")) return url;
  const forwarded = request.headers.get("x-forwarded-uri");
  const q = forwarded?.indexOf("?") ?? -1;
  if (forwarded && q !== -1 && forwarded.includes("__cms_preview")) {
    return new URL(url.pathname + forwarded.slice(q), url.origin);
  }
  return url;
}
