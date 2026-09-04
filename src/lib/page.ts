import type { AstroGlobal } from "astro";
import type { AppProps, View } from "~/components/types";
import { AREAS } from "~/content.config";
import { authEnabled, cmsHost, config, endorsementsEnabled } from "./config.ts";
import { getFeatures, newestUpdate } from "./content.ts";
import { snapshot } from "./endorsements.ts";
import { provenance } from "./git.ts";
import { relative } from "./time.ts";

/**
 * One request's worth of island props, shared by the three pages so they
 * cannot disagree about what a signed-in viewer sees.
 */
export async function pageProps(Astro: Pick<AstroGlobal, "locals" | "url">, view: View): Promise<AppProps> {
  const { locals, url } = Astro;
  const now = new Date();
  const [features, snap] = await Promise.all([
    getFeatures(locals.preview, now),
    snapshot(locals.session?.sub ?? null),
  ]);

  const area = url.searchParams.get("area");
  const feature = url.searchParams.get("feature");
  const auth = url.searchParams.get("auth");

  const prov = provenance();
  const synced = prov.committedAt ?? newestUpdate(features);

  return {
    view,
    features,
    aggregates: snap.aggregates,
    endorsers: snap.endorsers,
    mine: snap.mine,
    viewer: locals.viewer,
    authEnabled: authEnabled(),
    canEndorse: endorsementsEnabled(),
    cmsHost: cmsHost(),
    initialArea: area && (AREAS as readonly string[]).includes(area) ? area : "All",
    initialFeature: feature && features.some((f) => f.id === feature) ? feature : null,
    authNotice: auth,
    stats: {
      entries: features.length,
      lastSync: synced ? relative(synced, now) : "never",
    },
    footer: { sha: prov.sha, sourceUrl: config().sourceUrl },
  };
}
