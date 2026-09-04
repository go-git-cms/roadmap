import { Badge, SectionLabel } from "@gogitcms/design-system/web";
import { mineBadge, type Row } from "./model";
import { ScoreBar } from "./ScoreBar";

/** Every feature by weighted score. The rows are buttons so keyboards reach them. */
export function RankedTable({ rows, maxScore, onOpen }: { rows: Row[]; maxScore: number; onOpen: (id: string) => void }) {
  return (
    <div className="rm-ranked">
      <div className="rm-ranked__head">
        <SectionLabel className="rm-label">#</SectionLabel>
        <SectionLabel className="rm-label">Feature</SectionLabel>
        <SectionLabel className="rm-label">Status</SectionLabel>
        <SectionLabel className="rm-label">Endorsements</SectionLabel>
        <SectionLabel className="rm-label rm-right">Score</SectionLabel>
      </div>
      {rows.map((r, i) => {
        const f = r.feature;
        const badge = mineBadge(r.mine);
        return (
          <button
            type="button"
            key={f.id}
            className="rm-ranked__row"
            onClick={() => onOpen(f.id)}
            aria-haspopup="dialog"
            data-cms-path={f.path}
          >
            <span className="rm-ranked__rank">{String(i + 1).padStart(2, "0")}</span>
            <div className="rm-ranked__feature">
              <div className="rm-ranked__title">
                <span data-cms-field="title">{f.title}</span>
                {badge && <Badge tone={badge.tone}>you: {badge.label}</Badge>}
              </div>
              <span className="ds-meta">{f.path}</span>
            </div>
            <span className="rm-ranked__status rm-mono" data-cms-field="status">
              {f.status}
            </span>
            <div className="rm-ranked__votes">
              <ScoreBar counts={r.counts} maxScore={maxScore} large />
              <span className="ds-meta">{r.counts ? `${r.counts.must} must · ${r.counts.nice} nice` : "counts unavailable"}</span>
            </div>
            <span className="rm-ranked__score">{r.score ?? "—"}</span>
          </button>
        );
      })}
    </div>
  );
}
