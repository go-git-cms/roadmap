import { config } from "./config.ts";

/**
 * The form API, as the site's server talks to it.
 *
 * Every call carries the site's content token. The browser never reaches the
 * CMS: it talks to this site's /api routes, which verify the session, decide
 * what the caller may do, and only then come here. That is what keeps
 * `submittedBy` honest and the notes private.
 */

export type Submission = {
  id: string;
  submittedAt: string;
  status: string;
  fields: Record<string, unknown>;
};

type Page = { items: Submission[]; total: number; limit: number; offset: number };

export const FORM = "roadmap-endorsement";
const PAGE = 500;

function endpoint(path: string): string {
  const { cmsUrl, cmsRepo, cmsProject, cmsRef } = config();
  if (!cmsUrl) throw new Error("ROADMAP_CMS_URL is not set");
  const url = new URL(`/api/content/v1/${cmsRepo}/forms/${FORM}${path}`, cmsUrl);
  if (cmsProject) url.searchParams.set("project", cmsProject);
  if (cmsRef) url.searchParams.set("ref", cmsRef);
  return url.toString();
}

function headers(): Record<string, string> {
  const { cmsToken } = config();
  if (!cmsToken) throw new Error("ROADMAP_CMS_TOKEN is not set");
  return { authorization: `Bearer ${cmsToken}`, accept: "application/json" };
}

// Explicit fields rather than constructor parameter properties: Node's
// type-stripping test runner refuses the latter.
export class FormApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FormApiError";
    this.status = status;
    this.code = code;
  }
}

async function fail(res: Response, what: string): Promise<never> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const code = body?.code ?? body?.errors?.[0]?.extensions?.code ?? "";
  const message = body?.message ?? body?.errors?.[0]?.message ?? `${what} -> ${res.status}`;
  throw new FormApiError(res.status, String(code), String(message));
}

/** Every received submission on the form, paged through to the end. */
export async function listSubmissions(): Promise<Submission[]> {
  const all: Submission[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const url = new URL(endpoint("/submissions"));
    url.searchParams.set("limit", String(PAGE));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("status", "received");
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(10000) });
    if (!res.ok) await fail(res, "list submissions");
    const page = (await res.json()) as Page;
    all.push(...page.items);
    if (all.length >= page.total || page.items.length === 0) break;
  }
  return all;
}

export type FieldError = { path: string; message: string };

/** Submits one row. A validation failure is returned, not thrown. */
export async function submit(
  fields: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; errors: FieldError[] }> {
  const res = await fetch(endpoint(""), {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify(fields),
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 422) {
    const body = (await res.json()) as { errors?: FieldError[] };
    return { ok: false, errors: body.errors ?? [] };
  }
  if (!res.ok) await fail(res, "submit");
  const body = (await res.json()) as { ok?: boolean; id?: string; errors?: FieldError[] };
  if (body.ok !== true || !body.id) return { ok: false, errors: body.errors ?? [] };
  return { ok: true, id: body.id };
}

export async function remove(id: string): Promise<void> {
  const res = await fetch(endpoint(`/submissions/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: headers(),
    signal: AbortSignal.timeout(10000),
  });
  // Already gone is the outcome we wanted.
  if (res.status === 404) return;
  if (!res.ok) await fail(res, "delete submission");
}
