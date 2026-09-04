import { Badge, ButtonLink } from "@gogitcms/design-system/web";
import type { Viewer } from "~/lib/session";
import { mineBadge, type Row } from "./model";

/** The account view: one card per endorsement, with the private note under it. */
export function MyEndorsements({
  viewer,
  rows,
  notes,
  onOpen,
}: {
  viewer: Viewer;
  rows: Row[];
  notes: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  const mine = rows.filter((r) => r.mine && r.mine !== "none");
  return (
    <div className="rm-me">
      <div className="rm-me__head">
        <h2>Your endorsements</h2>
        <span className="ds-meta">{viewer.handle} · stored in the form API, not the repo</span>
      </div>
      {mine.map((r) => {
        const badge = mineBadge(r.mine)!;
        const note = notes[r.feature.id];
        return (
          <div key={r.feature.id} className="rm-me__card">
            <div className="rm-me__row">
              <span className="rm-me__title">{r.feature.title}</span>
              <Badge tone={badge.tone}>you: {badge.label}</Badge>
              <div className="rm-spacer" />
              <span className="ds-meta">{r.feature.status}</span>
              <button type="button" className="rm-me__change" onClick={() => onOpen(r.feature.id)}>
                Change
              </button>
            </div>
            {note && (
              <div className="rm-me__note">
                {note}
                <span className="rm-mono">private · visible to maintainers and you</span>
              </div>
            )}
          </div>
        );
      })}
      {mine.length === 0 && (
        <div className="rm-me__empty">
          <p>You haven't endorsed anything yet. Open a feature and weight it.</p>
          <ButtonLink href="/" size="sm">
            Back to the board
          </ButtonLink>
        </div>
      )}
    </div>
  );
}
