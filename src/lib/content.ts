// The roadmap collection, shared by every page.
//
// Two paths on purpose:
//
//   published: Astro's content collection (src/content.config.ts), whose zod
//     schema validated every entry at sync time. This is what every ordinary
//     request renders from.
//
//   preview: when the middleware put a draft on Astro.locals.preview, the same
//     files are read straight from disk per request and the draft's partial
//     fields are composed over them before anything renders. The content-layer
//     store can't see an unsaved draft, which is why this path bypasses it;
//     it exists only inside the editor's iframe. Same compose semantics as
//     examples/sample-site/src/lib/content.ts in go-git-cms/gogitcms.
import fs from "node:fs/promises";
import path from "node:path";
import { getCollection } from "astro:content";
import matter from "gray-matter";
import type { PreviewPayload, PreviewOverride } from "@gogitcms/preview-core";
import { AREAS, MOCKUPS, STATUSES } from "../content.config";
import { renderMarkdown } from "./markdown.ts";
import { relative } from "./time.ts";

export type Area = (typeof AREAS)[number];
export type Status = (typeof STATUSES)[number];
export type Mockup = (typeof MOCKUPS)[number];

/** One feature, as the island renders it. Serialisable: it crosses to the client. */
export type Feature = {
  id: string;
  title: string;
  area: Area;
  status: Status;
  blurb: string;
  mockup?: Mockup;
  /** "3d ago" on unshipped items, the release on shipped ones. */
  updatedLabel: string;
  /** ISO date, for the LAST SYNC fallback and stable sorting. */
  updated: string;
  order: number;
  /** The entry's path, relative to the project root, as the UI shows it. */
  path: string;
  /** The description, rendered to HTML. */
  bodyHtml: string;
};

const DIR = "content/roadmap";

// The project root (apps/roadmap in the monorepo). In dev and in a built
// container the process starts here; CONTENT_ROOT overrides for anything
// more exotic.
const CONTENT_ROOT = process.env.CONTENT_ROOT || process.cwd();

// ---- the preview path: files + draft compose --------------------------------

function overrideFor(preview: PreviewPayload | null | undefined, relPath: string): PreviewOverride | undefined {
  // Overrides address documents by repo-relative path. This project may sit at
  // the repository root or under apps/roadmap depending on where the repo was
  // connected, so match on the project-relative suffix rather than equality.
  return preview?.overrides.find((o) => o.path === relPath || o.path.endsWith(`/${relPath}`));
}

function compose(data: Record<string, unknown>, o: PreviewOverride | undefined): Record<string, unknown> {
  if (!o) return data;
  const merged: Record<string, unknown> = { ...data, ...o.fields };
  if (o.body != null) merged[o.bodyField ?? "body"] = o.body;
  return merged;
}

async function listMarkdown(preview: PreviewPayload): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(path.join(CONTENT_ROOT, DIR))).filter((f) => f.endsWith(".md"));
  } catch {
    // A missing directory is an empty collection, not an error.
  }
  const docs: Array<{ id: string; data: Record<string, unknown> }> = [];
  for (const f of files) {
    const relPath = `${DIR}/${f}`;
    const o = overrideFor(preview, relPath);
    if (o?.deleted) continue;
    let raw: string | null = null;
    try {
      raw = await fs.readFile(path.join(CONTENT_ROOT, relPath), "utf8");
    } catch {
      raw = null;
    }
    const { data, content } = raw != null ? matter(raw) : { data: {}, content: "" };
    docs.push({ id: f.replace(/\.md$/, ""), data: compose({ ...data, body: content }, o) });
  }
  // A draft may create an entry that has no file yet; it belongs on the board
  // too, which is what makes "add a feature, see it appear" work before save.
  for (const o of preview.overrides) {
    if (!o.created || o.deleted || !o.path.endsWith(".md") || !o.path.includes(`${DIR}/`)) continue;
    const file = o.path.slice(o.path.lastIndexOf("/") + 1);
    if (files.includes(file)) continue;
    docs.push({ id: file.replace(/\.md$/, ""), data: compose({ body: "" }, o) });
  }
  return docs;
}

// ---- shaping ---------------------------------------------------------------

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(String(v)) ? (v as T) : fallback;
}

function toDate(v: unknown): Date {
  const d = v instanceof Date ? v : new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function toFeature(id: string, d: Record<string, unknown>, now: Date): Feature {
  const status = pick(d.status, STATUSES, "Exploring");
  const updated = toDate(d.updated);
  const shippedIn = d.shippedIn ? String(d.shippedIn) : "";
  const mockup = (MOCKUPS as readonly string[]).includes(String(d.mockup)) ? (d.mockup as Mockup) : undefined;
  return {
    id,
    title: String(d.title ?? id),
    area: pick(d.area, AREAS, "Editor"),
    status,
    blurb: String(d.blurb ?? ""),
    mockup,
    updatedLabel: status === "Shipped" && shippedIn ? shippedIn : relative(updated, now),
    updated: updated.toISOString(),
    order: typeof d.order === "number" ? d.order : Number.MAX_SAFE_INTEGER,
    path: `${DIR}/${id}.md`,
    bodyHtml: renderMarkdown(String(d.body ?? "")),
  };
}

function byOrder(a: Feature, b: Feature): number {
  return a.order - b.order || a.title.localeCompare(b.title);
}

// ---- the public API ----------------------------------------------------------

export async function getFeatures(preview?: PreviewPayload | null, now: Date = new Date()): Promise<Feature[]> {
  if (preview) {
    return (await listMarkdown(preview)).map((d) => toFeature(d.id, d.data, now)).sort(byOrder);
  }
  const entries = await getCollection("roadmap");
  return entries.map((e) => toFeature(e.id, { ...e.data, body: e.body ?? "" }, now)).sort(byOrder);
}

/** The newest `updated` across the set: the LAST SYNC fallback when git is unavailable. */
export function newestUpdate(features: Feature[]): Date | null {
  let newest: Date | null = null;
  for (const f of features) {
    const d = new Date(f.updated);
    if (!newest || d > newest) newest = d;
  }
  return newest;
}
