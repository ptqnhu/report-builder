import { highlightSql } from "../utils/sqlHighlight.js";

/** SQL with SSMS-style colours, as spans. Put it inside a <pre> (or the SqlEditor's layer). Colours: .sql-* in styles.css. */
export default function SqlCode({ sql }) {
  return highlightSql(sql).map((t, i) => (t.kind ? <span key={i} className={`sql-${t.kind}`}>{t.text}</span> : t.text));
}
