/** The AI mark: a four-point sparkle, drawn in the pale mint AI accent (.ai-spark). Used only on AI features. */
export default function Sparkle({ size = 14 }) {
  return (
    <svg className="ai-spark" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M8 0c.4 3.9 2.1 5.6 6 6-3.9.4-5.6 2.1-6 6-.4-3.9-2.1-5.6-6-6 3.9-.4 5.6-2.1 6-6Z" transform="translate(0 2)" />
      <path fill="currentColor" d="M13.5 0c.15 1.35.65 1.85 2 2-1.35.15-1.85.65-2 2-.15-1.35-.65-1.85-2-2 1.35-.15 1.85-.65 2-2Z" opacity=".8" />
    </svg>
  );
}
