import { config } from "./config.ts";

/**
 * The slice of the CMS REST API the roadmap consumes as a signed-in user:
 * exactly one call, to learn who the session belongs to. Server-side only —
 * the access token never reaches the browser.
 */

export type Me = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

export class CmsError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "CmsError";
    this.status = status;
  }
  get unauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

export async function me(token: string): Promise<Me> {
  const { cmsUrl } = config();
  if (!cmsUrl) throw new Error("ROADMAP_CMS_URL is not set");
  const res = await fetch(`${cmsUrl}/api/v1/me`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    // The CMS may be slow to wake on a cold container; don't hang a sign-in
    // on it indefinitely.
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new CmsError(res.status, `GET /me → ${res.status}`);
  return (await res.json()) as Me;
}

export function displayName(m: Me): string {
  return [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email;
}
