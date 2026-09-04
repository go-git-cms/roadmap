// CMS build configuration for the roadmap's self-hosted editor (/admin).
//
// This site is Astro in *server* mode (astro.config.mjs), so preview is the
// SSR middleware case: the editor's Preview pane iframes the running site with
// a signed draft payload, src/middleware.ts puts the draft on Astro.locals,
// and src/lib/content.ts composes it over the content files before the page
// renders. The plugin below only needs to know where the site answers and
// which URL each document lives at.
//
// Locally nothing is exported and the editor asks: it talks to a CMS on
// localhost and stops on the workspace and repository pickers. On CI (the
// /admin build inside the Dockerfile) the same defaults would be silently
// wrong, so `required` fails the build naming the variable instead.

const CI = Boolean(process.env.CI);

function required(name, { because }) {
  const value = process.env[name];
  if (CI && !value) {
    throw new Error(
      `apps/roadmap/cms.config.mjs: ${name} must be set when CI is set — ${because}. ` +
        `Off CI it is optional; see the header of this file for what happens without it.`,
    );
  }
  return value || undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default {
  API_URL:
    required("GITCMS_API_URL", {
      because: "a built bundle calls this URL from the browser and cannot be repointed later",
    }) ?? "http://localhost:8080",

  WORKSPACE_ID: required("GITCMS_WORKSPACE_ID", {
    because: "a shipped editor must open its own workspace rather than offer a picker",
  }),
  REPOSITORY_ID: required("GITCMS_REPOSITORY_ID", {
    because: "a shipped editor must open its own repository rather than offer a picker",
  }),

  // Pin the editor to the `roadmap` project from the repository manifest. A
  // NAME, not an id: the editor resolves the lock with `p.name === locked`, so
  // a uuid matches nothing and every page load lands on the ConfigError
  // screen. A copy of this site in its own repository is single-project; set
  // GITCMS_PROJECT to its name from that repository's go-git-cms.yml.
  PROJECT: (() => {
    const name = process.env.GITCMS_PROJECT || "roadmap";
    if (UUID.test(name)) {
      throw new Error(
        `apps/roadmap/cms.config.mjs: GITCMS_PROJECT is "${name}", which is a uuid. ` +
          `The project lock matches on the manifest name — pass "roadmap", not the project's id.`,
      );
    }
    return name;
  })(),

  // Mounted under Astro's public/ at /admin/, matching the Caddyfile's handle.
  BASE_PATH: "/admin/",

  plugins: [
    [
      "@gogitcms/preview",
      {
        // Where the running site answers. Locally `astro dev` on :4350; a
        // deployed editor sets CMS_PREVIEW_SERVER to the site's own public
        // origin, which the Dockerfile echoes into the /admin CSP.
        baseUrl: process.env.CMS_PREVIEW_SERVER || "http://localhost:4350",

        // Every roadmap entry previews on the board with its modal open: the
        // filename (without extension) is the feature id, and `?feature=` is
        // the deep link.
        collections: {
          roadmap: "/?feature={{basename path}}",
        },

        label: "Preview",
      },
    ],
  ],
};
