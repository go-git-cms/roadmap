import { execFileSync } from "node:child_process";
import { config } from "./config.ts";

/**
 * Build provenance for the footer and the LAST SYNC stat.
 *
 * Locally the working copy is a git checkout and git answers directly. In the
 * container there is no .git (the image excludes it), so the sha comes from
 * the environment, ROADMAP_COMMIT_SHA or Railway's RAILWAY_GIT_COMMIT_SHA,
 * and the sync time falls back to the newest entry's `updated` date.
 * Resolved once per process: HEAD does not move under a running server.
 */

export type Provenance = { sha: string | null; committedAt: Date | null };

let cached: Provenance | null = null;

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2000 }).trim();
  } catch {
    return null;
  }
}

export function provenance(): Provenance {
  if (cached) return cached;
  const fromEnv = config().commit ?? null;
  const sha = fromEnv ?? git(["rev-parse", "--short=7", "HEAD"]);
  // The newest commit touching the roadmap entries, not HEAD: a commit that
  // only changed the site's code is not a content sync.
  const ts = git(["log", "-1", "--format=%ct", "--", "content/roadmap"]);
  const committedAt = ts && /^\d+$/.test(ts) ? new Date(Number(ts) * 1000) : null;
  cached = { sha, committedAt };
  return cached;
}
