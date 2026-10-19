import { useId } from "react";

/** App mark: two emerald data dots feeding two ink green report lines. Shared by every page's top bar.
 * The colours come from --logo-* in styles.css. */
export default function Logo({ size = 28 }) {
  // Unique per logo, since several pages (some hidden) can be on the page at once. Colons break url(#...).
  const g = `rb-logo${useId().replace(/:/g, "")}`;
  return (
    <svg className="rb-logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--logo-dot-a, #3F8564)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-dot-b, #0F5131)" }} />
        </linearGradient>
      </defs>
      <circle cx="9" cy="10" r="5" fill={`url(#${g})`} />
      <circle cx="9" cy="22" r="5" fill={`url(#${g})`} opacity=".7" />
      <rect x="16" y="7" width="13" height="6" rx="3" style={{ fill: "var(--logo-bar-a, #0A2A1C)" }} />
      <rect x="16" y="19" width="9" height="6" rx="3" style={{ fill: "var(--logo-bar-b, #0F5131)" }} />
    </svg>
  );
}
