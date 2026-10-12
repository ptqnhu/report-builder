const fmt = (n) => n.toLocaleString("en-US");

/**
 * "*Preview 10 of 48,213 rows": a footnote below a preview that shows the first `limit` of `rows`.
 * totalRows: rows loaded before filters; moreRows: the query returns more than were loaded;
 * rowTotal: every row the query returns, counted on the server (null until known); counting: that count is running.
 * When filters narrow rows that were cut short, the full number isn't known, so it reads "57+".
 */
export default function PreviewNote({ rows, limit, totalRows, moreRows, rowTotal, counting }) {
  const filtered = rows.length !== totalRows;
  const total = !moreRows ? fmt(rows.length)
    : filtered ? `${fmt(rows.length)}+`
    : rowTotal != null ? fmt(rowTotal)
    : counting ? "…"
    : `${fmt(totalRows)}+`;
  return (
    <p className="preview-note no-print">
      *Preview {fmt(Math.min(limit, rows.length))} of {total} {total === "1" ? "row" : "rows"}
    </p>
  );
}
