import { Icon, Input } from "@gogitcms/design-system/web";
import { NavRow } from "../ds/NavRow";

const files: Array<[string, string]> = [
  ["2026-git.md", "2h ago"],
  ["form-api.md", "1d ago"],
  ["roadmap.md", "3d ago"],
];

/** A sidebar of collections on the sunken surface, and a searchable file list. */
export function BrowserMockup() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        minHeight: 168,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: 8,
          background: "var(--surface-sunken)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <NavRow icon="folder" label="content" active />
        <NavRow icon="fileText" label="blog" />
        <NavRow icon="image" label="media" />
        <NavRow icon="braces" label="data" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              color: "var(--text-tertiary)",
            }}
          >
            <Icon name="search" size={14} />
          </span>
          <Input size="sm" placeholder="Search entries" readOnly tabIndex={-1} style={{ paddingLeft: 30 }} />
        </div>
        {files.map(([name, when]) => (
          <div
            key={name}
            className="rm-mono"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "7px 8px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
            }}
          >
            <span>{name}</span>
            <span>{when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
