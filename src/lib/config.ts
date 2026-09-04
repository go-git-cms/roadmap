/**
 * Runtime configuration.
 *
 * Everything is read from `process.env` at request time rather than baked in
 * with `import.meta.env`, so one image runs in staging and production against
 * different backends. Every capability degrades to "off" when its variables
 * are missing: a roadmap with nothing configured still renders the board, with
 * counts unavailable and sign-in absent, rather than erroring.
 */

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function trimSlash(u: string): string {
  return u.replace(/\/+$/, "");
}

export type Config = {
  /** This site's public origin. Required to build the PKCE redirect_uri. */
  publicUrl?: string;
  /** The CMS origin serving /api/v1 (auth) and /api/content/v1 (forms). */
  cmsUrl?: string;
  /** HMAC key for the roadmap's session cookie. */
  sessionSecret?: string;
  /** `owner/repo` whose go-git-cms.yml declares the endorsement form. */
  cmsRepo: string;
  /** The project on that repository, when it holds several. */
  cmsProject?: string;
  /** The branch whose form to use; empty is the repository's default. */
  cmsRef?: string;
  /** The content token the site submits, reads and deletes with. */
  cmsToken?: string;
  /** Short commit sha for the footer, when the environment knows it. */
  commit?: string;
  /** Where "Read the source" points. */
  sourceUrl: string;
};

let cached: Config | null = null;

export function config(): Config {
  if (cached) return cached;
  const cmsUrl = env("ROADMAP_CMS_URL");
  cached = {
    publicUrl: env("ROADMAP_PUBLIC_URL") ? trimSlash(env("ROADMAP_PUBLIC_URL")!) : undefined,
    cmsUrl: cmsUrl ? trimSlash(cmsUrl) : undefined,
    sessionSecret: env("ROADMAP_SESSION_SECRET"),
    cmsRepo: env("ROADMAP_CMS_REPO") ?? "go-git-cms/gogitcms",
    cmsProject: env("ROADMAP_CMS_PROJECT"),
    cmsRef: env("ROADMAP_CMS_REF"),
    cmsToken: env("ROADMAP_CMS_TOKEN"),
    commit: (env("ROADMAP_COMMIT_SHA") ?? env("RAILWAY_GIT_COMMIT_SHA"))?.slice(0, 7),
    sourceUrl: env("ROADMAP_SOURCE_URL") ?? "https://github.com/go-git-cms/roadmap",
  };
  return cached;
}

/** Sign-in is only offered when the whole PKCE round-trip can complete. */
export function authEnabled(): boolean {
  const c = config();
  return Boolean(c.cmsUrl && c.publicUrl && c.sessionSecret);
}

/** Endorsements can be read and written only with a token to do it with. */
export function endorsementsEnabled(): boolean {
  const c = config();
  return Boolean(c.cmsUrl && c.cmsToken);
}

/** The host the sign-in dialog and the toast name: "cms.gogitcms.dev". */
export function cmsHost(): string {
  const { cmsUrl } = config();
  if (!cmsUrl) return "the CMS";
  try {
    return new URL(cmsUrl).host;
  } catch {
    return cmsUrl;
  }
}

/** Only in tests, which mutate process.env between cases. */
export function resetConfigForTests(): void {
  cached = null;
}
