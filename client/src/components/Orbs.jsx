/** Gradient circles behind the page, so the glass boxes have colour to blur. Styled by .rb-orb in styles.css. */
export default function Orbs() {
  return (
    <div className="rb-orbs" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <span key={i} className="rb-orb" />)}
    </div>
  );
}
