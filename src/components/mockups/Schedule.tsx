import { Badge, Icon } from "@gogitcms/design-system/web";

const rows = [
  { path: "content/blog/form-api.md", when: "Sep 4, 09:00", state: "queued", tone: "neutral" as const },
  { path: "content/blog/v1-5-notes.md", when: "Sep 8, 14:30", state: "queued", tone: "neutral" as const },
  { path: "content/blog/2026-git.md", when: "Sep 1, 08:00", state: "published", tone: "add" as const },
];

/** Three queued commits: a history icon, the path, the time, a state badge. */
export function ScheduleMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div
          key={r.path}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Icon name="history" size={15} />
          <span className="rm-mono" style={{ flex: 1, color: "var(--text-secondary)" }}>
            {r.path}
          </span>
          <span className="rm-mono" style={{ color: "var(--text-tertiary)" }}>
            {r.when}
          </span>
          <Badge tone={r.tone}>{r.state}</Badge>
        </div>
      ))}
    </div>
  );
}
