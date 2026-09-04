import { useEffect, useRef, useState } from "react";
import { Badge, Button, Divider, IconButton, SectionLabel, Textarea } from "@gogitcms/design-system/web";
import type { Viewer } from "~/lib/session";
import { score, type Weight } from "~/lib/score";
import { Mockup } from "./mockups";
import { ScoreBar } from "./ScoreBar";
import type { Row } from "./model";

const OPTIONS: Array<{ key: Weight; label: string; weight: string }> = [
  { key: "must", label: "Must have", weight: "×3" },
  { key: "nice", label: "Nice to have", weight: "×1" },
  { key: "none", label: "Don't care", weight: "×0" },
];

/**
 * The feature modal: description and live mockup on the left, the vote panel
 * on the right. Weight clicks write immediately (optimistic, upserted); the
 * note saves on the button. Escape, the x and the scrim all close it.
 */
export function FeatureDetail({
  row,
  maxScore,
  viewer,
  canEndorse,
  savedNote,
  pending,
  onClose,
  onWeight,
  onSave,
  onWithdraw,
  onSignIn,
}: {
  row: Row;
  maxScore: number;
  viewer: Viewer | null;
  canEndorse: boolean;
  savedNote: string;
  pending: boolean;
  onClose: () => void;
  onWeight: (w: Weight) => void;
  onSave: (note: string) => void;
  onWithdraw: () => void;
  onSignIn: () => void;
}) {
  const f = row.feature;
  const [draft, setDraft] = useState(savedNote);
  const panel = useRef<HTMLDivElement>(null);

  // Seed the draft from the saved note whenever a different feature opens.
  useEffect(() => setDraft(savedNote), [f.id, savedNote]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const hasVote = !!row.mine && row.mine !== "none";
  const counts = row.counts;

  return (
    <div className="rm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className="rm-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rm-detail-title"
        tabIndex={-1}
      >
        <div className="rm-detail__head">
          <div>
            <div className="rm-detail__crumbs">
              <Badge>{f.status}</Badge>
              <span className="ds-meta">{f.path}</span>
            </div>
            <h2 id="rm-detail-title">{f.title}</h2>
          </div>
          <IconButton name="x" label="Close" bare className="rm-detail__close" onClick={onClose} />
        </div>

        <div className="rm-detail__body">
          <div className="rm-detail__main">
            <div className="rm-detail__desc" dangerouslySetInnerHTML={{ __html: f.bodyHtml }} />
            {f.mockup && (
              <>
                <SectionLabel className="rm-label">Mockup</SectionLabel>
                <div className="rm-mockup">
                  <Mockup kind={f.mockup} />
                </div>
                <div className="rm-mockup__caption rm-mono">Rendered live from the design system · not an image</div>
              </>
            )}
          </div>

          <div className="rm-detail__aside">
            <div>
              <SectionLabel className="rm-label">How much do you need this</SectionLabel>
              <div className="rm-votes">
                {OPTIONS.map((o) => {
                  const on = row.mine === o.key;
                  const cls = ["rm-vote", on && "rm-vote--on", !viewer && !on && "rm-vote--muted"]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <button
                      key={o.key}
                      type="button"
                      className={cls}
                      aria-pressed={on}
                      disabled={pending}
                      onClick={() => (viewer ? onWeight(o.key) : onSignIn())}
                    >
                      <span className="rm-vote__mark">{on ? "✓" : ""}</span>
                      <span className="rm-vote__label">{o.label}</span>
                      <span className="rm-vote__weight rm-mono">{o.weight}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {viewer ? (
              <div className="rm-note">
                <SectionLabel className="rm-label">Why (optional, private)</SectionLabel>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="What would this unblock for you?"
                  maxLength={1000}
                  disabled={!canEndorse}
                />
                <div className="rm-note__help">
                  Only maintainers can read this. It never appears on the public page, and you'll see your own note
                  under Your endorsements.
                </div>
                <div className="rm-note__actions">
                  <Button variant="primary" size="sm" disabled={pending || !canEndorse} onClick={() => onSave(draft)}>
                    {savedNote ? "Update note" : "Save endorsement"}
                  </Button>
                  {hasVote && (
                    <Button variant="danger" size="sm" disabled={pending} onClick={onWithdraw}>
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rm-signin-box">
                <p>Endorsing needs a CMS session so each person counts once.</p>
                <Button variant="primary" size="sm" fullWidth onClick={onSignIn}>
                  Sign in to endorse
                </Button>
              </div>
            )}

            <Divider />

            <div className="rm-tally">
              <SectionLabel className="rm-label">Endorsements</SectionLabel>
              <div className="rm-tally__score">
                <strong>{counts ? score(counts) : "—"}</strong>
                <span className="rm-mono">score</span>
              </div>
              <ScoreBar counts={counts} maxScore={maxScore} large />
              <div className="rm-tally__rows rm-mono">
                <div className="rm-tally__row">
                  <span>must-have</span>
                  <span>{counts ? counts.must : "—"}</span>
                </div>
                <div className="rm-tally__row">
                  <span>nice-to-have</span>
                  <span>{counts ? counts.nice : "—"}</span>
                </div>
                <div className="rm-tally__row">
                  <span>notes to maintainers</span>
                  <span>{counts ? counts.noteCount : "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
