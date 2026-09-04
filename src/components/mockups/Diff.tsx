import { DiffStat } from "../ds/DiffStat";

const line = (bg?: string, fg?: string): React.CSSProperties => ({
  padding: "4px 10px",
  background: bg,
  color: fg ?? "var(--text-secondary)",
});

/** A file path with its stat, then a front-matter hunk in the diff inks. */
export function DiffMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="rm-mono" style={{ color: "var(--text-secondary)" }}>
          content/blog/2026-git.md
        </span>
        <DiffStat added={4} removed={2} />
      </div>
      <div
        className="rm-mono"
        style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}
      >
        <div
          style={{
            padding: "5px 10px",
            background: "var(--surface-sunken)",
            color: "var(--text-tertiary)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          @@ front-matter @@
        </div>
        <div style={line()}>title: Editing files like an app</div>
        <div style={line("var(--diff-del-bg)", "var(--diff-del-fg)")}>- status: draft</div>
        <div style={line("var(--diff-add-bg)", "var(--diff-add-fg)")}>+ status: published</div>
        <div style={line("var(--diff-add-bg)", "var(--diff-add-fg)")}>+ publishedAt: 2026-09-02</div>
      </div>
    </div>
  );
}
