import type { Feature } from "~/lib/content";
import type { Aggregates, Mine } from "~/lib/endorsements";
import type { Viewer } from "~/lib/session";

export type View = "board" | "ranked" | "me";

/**
 * Everything the island needs, assembled server-side once per request
 * (src/lib/page.ts) and serialised across to the client. Nothing here is a
 * secret: notes are the viewer's own, aggregates are counts.
 */
export type AppProps = {
  view: View;
  features: Feature[];
  /** Null when the form API could not be read: the UI says so. */
  aggregates: Aggregates | null;
  endorsers: number | null;
  /** Null when signed out. */
  mine: Mine | null;
  viewer: Viewer | null;
  /** Whether sign-in can complete on this deployment. */
  authEnabled: boolean;
  /** Whether the site holds a token to write endorsements with. */
  canEndorse: boolean;
  /** The CMS host the dialog and toast name. */
  cmsHost: string;
  initialArea: string;
  initialFeature: string | null;
  /** The `?auth=` reason the callback landed with, if any. */
  authNotice: string | null;
  stats: { entries: number; lastSync: string };
  footer: { sha: string | null; sourceUrl: string };
};
