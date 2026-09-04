/**
 * A plain-DOM DiffStat: "+4 -2" in the diff inks, mirroring the native
 * design-system primitive. Like NavRow, a candidate for the DS web entry.
 */
export function DiffStat({ added, removed }: { added?: number; removed?: number }) {
  return (
    <span className="rm-mono" style={{ display: "inline-flex", gap: 6, fontWeight: "var(--fw-medium)" }}>
      {added != null && added > 0 && <span style={{ color: "var(--diff-add-fg)" }}>+{added}</span>}
      {removed != null && removed > 0 && <span style={{ color: "var(--diff-del-fg)" }}>-{removed}</span>}
    </span>
  );
}
