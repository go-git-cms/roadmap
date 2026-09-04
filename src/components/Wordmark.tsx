/**
 * The product ships no logo asset. The mark is type-only, "go / git / cms" in
 * mono with muted slashes, and this site appends "/ roadmap" in the secondary
 * ink so the path reads as where you are.
 */
export function Wordmark({ suffix, small }: { suffix?: string; small?: boolean }) {
  return (
    <span className={["rm-wordmark", small && "rm-wordmark--sm"].filter(Boolean).join(" ")}>
      <span>go</span>
      <span className="rm-wordmark__sep">/</span>
      <span>git</span>
      <span className="rm-wordmark__sep">/</span>
      <span>cms</span>
      {suffix && (
        <>
          <span className="rm-wordmark__sep">/</span>
          <span className="rm-wordmark__dim">{suffix}</span>
        </>
      )}
    </span>
  );
}
