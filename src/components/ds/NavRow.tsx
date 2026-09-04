import { Icon, type IconName } from "@gogitcms/design-system/web";

/**
 * A plain-DOM NavRow, mirroring the native design-system component's
 * compact size: icon, label, optional mono count, active surface. The DS web
 * entry has no NavRow yet; this is the candidate for it, kept inert because
 * the mockups are illustrations.
 */
export function NavRow({
  icon,
  label,
  count,
  active,
}: {
  icon?: IconName;
  label: string;
  count?: number | string;
  active?: boolean;
}) {
  return (
    <div
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        height: "var(--control-lg)",
        padding: "0 var(--space-3)",
        borderRadius: "var(--radius-md)",
        background: active ? "var(--surface-active)" : "transparent",
        fontSize: "var(--fs-body)",
        fontWeight: active ? "var(--fw-medium)" : "var(--fw-regular)",
        color: "var(--text-primary)",
      }}
    >
      {icon && <Icon name={icon} size={16} color={active ? "var(--text-primary)" : "var(--text-secondary)"} />}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {count != null && <span className="ds-meta">{String(count)}</span>}
    </div>
  );
}
