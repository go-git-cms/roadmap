import { Avatar, Button, Icon, IconButton } from "@gogitcms/design-system/web";
import type { Viewer } from "~/lib/session";
import type { View } from "./types";
import { Wordmark } from "./Wordmark";

/**
 * Dark chrome, matching the editor's top bar. Board and Endorsements are
 * routes, so the tabs are links that carry the active area filter across.
 * The bar is the one place that knows the session globally.
 */
export function TopBar({
  view,
  area,
  viewer,
  authEnabled,
  mineCount,
  onSignIn,
}: {
  view: View;
  area: string;
  viewer: Viewer | null;
  authEnabled: boolean;
  mineCount: number;
  onSignIn: () => void;
}) {
  const q = area !== "All" ? `?area=${encodeURIComponent(area)}` : "";
  // Signing out lands on the same view, filter kept. /me is session-gated, so
  // it goes home. Derived from props rather than window so server and client
  // render the same markup.
  const logoutNext = view === "ranked" ? `/endorsements${q}` : `/${q}`;
  return (
    <header className="rm-topbar" data-theme="dark">
      <a href="/" style={{ display: "flex" }} aria-label="Roadmap home">
        <Wordmark suffix="roadmap" />
      </a>
      <div className="rm-branch rm-mono">
        <Icon name="gitBranch" size={14} />
        <span>main</span>
      </div>
      <div className="rm-spacer" />
      <nav className="rm-tabs" aria-label="View">
        <a className={["rm-tab", view === "board" && "rm-tab--active"].filter(Boolean).join(" ")} href={`/${q}`}>
          <Icon name="grid" size={14} />
          <span>Board</span>
        </a>
        <a
          className={["rm-tab", view === "ranked" && "rm-tab--active"].filter(Boolean).join(" ")}
          href={`/endorsements${q}`}
        >
          <Icon name="rows" size={14} />
          <span>Endorsements</span>
        </a>
      </nav>
      {viewer ? (
        <div className="rm-session">
          <a className="rm-mine-btn" href="/me">
            <Icon name="check" size={14} />
            <span>Your endorsements</span>
            <span className="rm-mine-btn__count rm-mono">{mineCount}</span>
          </a>
          <div className="rm-account">
            <Avatar initials={viewer.initials} size={24} />
            <span className="rm-handle rm-mono">{viewer.handle}</span>
            <form method="post" action={`/auth/logout?next=${encodeURIComponent(logoutNext)}`} style={{ display: "flex" }}>
              <IconButton name="logOut" label="Sign out" bare type="submit" className="rm-account__out" />
            </form>
          </div>
        </div>
      ) : (
        authEnabled && (
          <Button variant="primary" size="sm" onClick={onSignIn}>
            <span className="rm-full">Sign in with CMS session</span>
            <span className="rm-short">Sign in</span>
          </Button>
        )
      )}
    </header>
  );
}
