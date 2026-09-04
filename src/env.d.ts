/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** The CMS draft the preview middleware verified, when inside the editor's iframe. */
    preview?: import("@gogitcms/preview-core").PreviewPayload | null;
    /** Carries the CMS access token. Server-side only, never rendered. */
    session: import("./lib/session").Session | null;
    /** The renderable projection of the session. */
    viewer: import("./lib/session").Viewer | null;
    authEnabled: boolean;
  }
}
