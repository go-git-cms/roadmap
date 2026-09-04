import { Badge, SectionLabel } from "@gogitcms/design-system/web";
import { LANES, mineBadge, type Row } from "./model";
import { ScoreBar } from "./ScoreBar";

function FeatureCard({ row, maxScore, onOpen }: { row: Row; maxScore: number; onOpen: (id: string) => void }) {
  const f = row.feature;
  const badge = mineBadge(row.mine);
  return (
    <button type="button" className="rm-card" onClick={() => onOpen(f.id)} aria-haspopup="dialog">
      <div className="rm-card__row">
        <div className="rm-card__title">{f.title}</div>
        <span className="rm-card__score rm-mono">{row.score ?? "—"}</span>
      </div>
      <div className="rm-card__blurb">{f.blurb}</div>
      <ScoreBar counts={row.counts} maxScore={maxScore} />
      <div className="rm-card__meta rm-mono">
        <span>{f.area}</span>
        <span className="rm-card__dot">·</span>
        <span>{f.updatedLabel}</span>
        <div className="rm-spacer" />
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>
    </button>
  );
}

/** Kanban lanes by delivery status, one column each, in delivery order. */
export function Board({ rows, maxScore, onOpen }: { rows: Row[]; maxScore: number; onOpen: (id: string) => void }) {
  return (
    <div className="rm-board">
      {LANES.map((lane) => {
        const items = rows.filter((r) => r.feature.status === lane);
        return (
          <section key={lane} className="rm-lane" aria-label={lane}>
            <div className="rm-lane__head">
              <SectionLabel className="rm-label">{lane}</SectionLabel>
              <Badge>{items.length}</Badge>
            </div>
            {items.map((r) => (
              <FeatureCard key={r.feature.id} row={r} maxScore={maxScore} onOpen={onOpen} />
            ))}
            {items.length === 0 && <div className="rm-lane__empty">Nothing in this lane.</div>}
          </section>
        );
      })}
    </div>
  );
}
