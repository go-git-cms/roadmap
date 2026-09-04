import { Button, Input, SectionLabel } from "@gogitcms/design-system/web";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <SectionLabel>{label}</SectionLabel>
      <Input mono size="sm" value={value} readOnly tabIndex={-1} />
    </label>
  );
}

/** Two inputs, a primary button, and the mono caption that names the point. */
export function FormMockup() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Endpoint" value="https://api.gogitcms.dev/forms/roadmap" />
      <Field label="Field" value="endorsement" />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button variant="primary" size="sm" tabIndex={-1}>
          Save schema
        </Button>
        <span className="rm-mono" style={{ color: "var(--text-tertiary)" }}>
          writes to the API · no commit
        </span>
      </div>
    </div>
  );
}
