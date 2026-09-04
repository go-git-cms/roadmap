export type ToastState = { text: string; error?: boolean } | null;

/** One slot, bottom-centre, inverted surface. Replaced by the next message. */
export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className={["rm-toast", "rm-mono", toast.error && "rm-toast--error"].filter(Boolean).join(" ")} role="status">
      <span>{toast.text}</span>
    </div>
  );
}
