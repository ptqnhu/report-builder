import { alignOf, formatValue } from "@report-builder/shared";
import { WIDTHS, computeTotals } from "../utils/table.js";

export default function ReportTable({ cols, rows, tpl, sort, onSort, limit }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const totals = tpl.totals ? computeTotals(cols, rows) : null;
  const firstText = cols.findIndex((c) => !totals || !totals[c.key]);
  const cls = ["rt", `rt-${tpl.theme}`, `rt-${tpl.density}`, tpl.zebra && "rt-zebra", tpl.layout === "expand" && tpl.stickyFirst && "rt-sticky"]
    .filter(Boolean).join(" ");

  if (!cols.length) return <div className="rt-wrap"><p className="empty">Select at least one column to see the report.</p></div>;

  return (
    <div className={`rt-wrap ${tpl.layout === "expand" ? "rt-expand" : "rt-fit"}`}>
      <table className={cls}>
        <thead>
          <tr>
            {tpl.rowNumbers && <th className="rt-rn">#</th>}
            {cols.map((c) => {
              const active = sort && sort.key === c.key;
              return (
                <th key={c.key} style={{ textAlign: alignOf(c), minWidth: WIDTHS[c.width] }}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button className="rt-sort" onClick={() => onSort && onSort(c.key)}>
                    {c.label}
                    <span className="arrow" aria-hidden="true">{active ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr><td colSpan={cols.length + (tpl.rowNumbers ? 1 : 0)} className="empty">No rows match the current filters.</td></tr>
          )}
          {shown.map((r, i) => (
            <tr key={i}>
              {tpl.rowNumbers && <td className="rt-rn">{i + 1}</td>}
              {cols.map((c) => {
                const v = r[c.key];
                return (
                  <td key={c.key} className={c.wrap ? "wrap" : undefined} style={{ textAlign: alignOf(c), minWidth: WIDTHS[c.width] }}>
                    {v === null || v === undefined ? <span className="rt-null">—</span> : formatValue(v, c, tpl)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {totals && shown.length > 0 && (
          <tfoot>
            <tr>
              {tpl.rowNumbers && <td className="rt-rn">{firstText < 0 ? "Total" : ""}</td>}
              {cols.map((c, i) => {
                const t = totals[c.key];
                return (
                  <td key={c.key} style={{ textAlign: alignOf(c) }}>
                    {t ? (
                      <>
                        {formatValue(t.value, c, tpl)}
                        {t.kind === "avg" && <span className="rt-total-label">avg</span>}
                      </>
                    ) : i === firstText ? "Total" : ""}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
