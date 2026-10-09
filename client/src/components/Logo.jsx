import { useId } from "react";

/** App mark: two data dots feeding two report lines, in a cyan gradient. Shared by the landing page and the builder sidebar. */
export default function Logo({ size = 28 }) {
  // Unique per logo, since the landing page and the (hidden) builder can both be on the page. Colons break url(#...).
  const g = `rb-logo${useId().replace(/:/g, "")}`;
  return (
    <svg className="rb-logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A2E1F0" />
          <stop offset="1" stopColor="#3FA9C9" />
        </linearGradient>
      </defs>
      <circle cx="9" cy="10" r="5" fill={`url(#${g})`} />
      <circle cx="9" cy="22" r="5" fill={`url(#${g})`} opacity=".7" />
      <rect x="16" y="7" width="13" height="6" rx="3" fill={`url(#${g})`} />
      <rect x="16" y="19" width="9" height="6" rx="3" fill={`url(#${g})`} opacity=".7" />
    </svg>
  );
}
