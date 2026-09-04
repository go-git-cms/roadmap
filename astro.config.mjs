// @ts-check
// Loads apps/roadmap/.env into process.env for `astro dev` and `astro build`,
// which run in this same process. Production doesn't reach this file at all:
// the container starts dist/server/entry.mjs directly and reads the
// environment the platform injects, which is the point of using process.env
// over import.meta.env (src/lib/config.ts).
import "dotenv/config";
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  // Server-rendered, not static: endorsement counts come from the form API and
  // must be current without a rebuild, the session decides what the top bar
  // and the vote panel render, and the preview middleware (src/middleware.ts)
  // composes an unsaved CMS draft over the content files per request.
  output: "server",
  adapter: node({ mode: "standalone" }),

  // Build-time only. Anything that needs the public origin at runtime reads
  // ROADMAP_PUBLIC_URL through src/lib/config.ts instead — the production image
  // is built without it, so `Astro.site` says localhost there.
  site: process.env.ROADMAP_PUBLIC_URL || "http://localhost:4350",

  integrations: [react()],

  vite: {
    ssr: {
      // The design system ships TypeScript source rather than a build, and the
      // preview packages ship ESM with extensionless relative imports. Neither
      // can be externalised into the Node runtime — bundle them so Vite
      // resolves the imports instead.
      noExternal: ["@gogitcms/design-system", /^@gogitcms\/preview-/],
    },
  },

  server: { port: 4350 },
  devToolbar: { enabled: false },
});
