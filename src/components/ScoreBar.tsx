import { barWidths, type Counts } from "~/lib/score";

/**
 * The two-segment score bar: must-have in near-black, nice-to-have in
 * mid-gray, on an ink-100 track. Widths are fractions of the highest score
 * in the whole set, so a filtered board never rescales. With no counts the
 * empty track still renders, which is the loading and the unavailable state.
 */
export function ScoreBar({ counts, maxScore, large }: { counts: Counts | null; maxScore: number; large?: boolean }) {
  const w = counts ? barWidths(counts, maxScore) : { must: 0, nice: 0 };
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return (
    <div className={["rm-bar", large && "rm-bar--lg"].filter(Boolean).join(" ")} aria-hidden="true">
      <div className="rm-bar__must" style={{ width: pct(w.must) }} />
      <div className="rm-bar__nice" style={{ width: pct(w.nice) }} />
    </div>
  );
}
