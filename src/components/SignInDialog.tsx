import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink, Input } from "@gogitcms/design-system/web";
import { Wordmark } from "./Wordmark";

/**
 * "Use your CMS session". The primary path is a top-level redirect through
 * the CMS's PKCE authorize endpoint, returning to `next` with the modal still
 * open if one was. The token path is for a browser with no CMS session to
 * redirect through: it posts a session token to /auth/token, which validates
 * it against the same endpoint the redirect would have used.
 */
export function SignInDialog({ next, cmsHost, onClose }: { next: string; cmsHost: string; onClose: () => void }) {
  const [tokenMode, setTokenMode] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const loginHref = `/auth/login?next=${encodeURIComponent(next)}`;

  // Structural rather than React's FormEvent, which @types/react 19 deprecates.
  async function submitToken(e: { preventDefault(): void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/auth/token", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !body.ok) {
        setError(body.message ?? "That token was not accepted.");
        return;
      }
      // A full navigation, so the server renders the signed-in page with the
      // viewer's own votes and notes.
      const sep = next.includes("?") ? "&" : "?";
      window.location.assign(`${next}${sep}auth=ok`);
    } catch {
      setError("Could not reach the roadmap server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rm-overlay rm-overlay--center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className="rm-dialog" role="dialog" aria-modal="true" aria-labelledby="rm-signin-title" tabIndex={-1}>
        <Wordmark small />
        <h2 id="rm-signin-title">Use your CMS session</h2>
        <p>The roadmap reads the session you already have in the CMS. We take your handle and avatar, nothing else.</p>
        {tokenMode ? (
          <form className="rm-dialog__token" onSubmit={submitToken}>
            <Input
              mono
              size="sm"
              type="password"
              autoComplete="off"
              placeholder="Paste a CMS session token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
            />
            {error && <div className="rm-dialog__error">{error}</div>}
            <Button variant="primary" fullWidth type="submit" disabled={busy || !token.trim()}>
              Continue with token
            </Button>
            <Button fullWidth type="button" onClick={() => setTokenMode(false)}>
              Back
            </Button>
          </form>
        ) : (
          <div className="rm-dialog__actions">
            <ButtonLink variant="primary" fullWidth href={loginHref}>
              Continue with your CMS session
            </ButtonLink>
            <Button fullWidth onClick={() => setTokenMode(true)}>
              Use a session token
            </Button>
          </div>
        )}
        <div className="rm-dialog__foot rm-mono">session · {cmsHost} · read-only</div>
      </div>
    </div>
  );
}
