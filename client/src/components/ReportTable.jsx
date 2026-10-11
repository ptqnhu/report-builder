import { useState } from "react";
import { alignOf, formatValue } from "@report-builder/shared";
import { WIDTHS, computeTotals } from "../utils/table.js";

/**
 * The report's table. With onMove(fromKey, toKey, after), the column headings can be dragged to reorder the
 * columns; Alt+Left / Alt+Right on a focused heading moves it one place too.
 */
export default function ReportTable({ cols, rows, tpl, sort, onSort, onMove, limit }) {
  const [drag, setDrag] = useState(null); // { from: key, over: key, after: bool } while a heading is dragged
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
            {cols.map((c, i) => {
              const active = sort && sort.key === c.key;
              const dropping = drag && drag.over === c.key && drag.from !== c.key;
              const cls = [drag?.from === c.key && "drag-src", dropping && (drag.after ? "drop-after" : "drop-before")].filter(Boolean).join(" ");
              const dragProps = onMove && {
                draggable: true,
                title: "Drag to move this column",
                onDragStart: (e) => { e.dataTransfer.setData("text/plain", c.key); e.dataTransfer.effectAllowed = "move"; setDrag({ from: c.key, over: null, after: false }); },
                onDragOver: (e) => {
                  if (!drag) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const r = e.currentTarget.getBoundingClientRect();
                  const after = e.clientX > r.left + r.width / 2;
                  if (drag.over !== c.key || drag.after !== after) setDrag({ ...drag, over: c.key, after });
                },
                onDrop: (e) => { e.preventDefault(); if (drag) onMove(drag.from, c.key, drag.after); setDrag(null); },
                onDragEnd: () => setDrag(null),
              };
              const onKeyDown = onMove && ((e) => {
                if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
                e.preventDefault();
                const next = cols[i + (e.key === "ArrowLeft" ? -1 : 1)];
                if (next) onMove(c.key, next.key, e.key === "ArrowRight");
              });
              return (
                <th key={c.key} style={{ textAlign: alignOf(c), minWidth: WIDTHS[c.width] }} className={cls || undefined} {...dragProps}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <button className="rt-sort" onClick={() => onSort && onSort(c.key)} onKeyDown={onKeyDown}
                    aria-keyshortcuts={onMove ? "Alt+ArrowLeft Alt+ArrowRight" : undefined}>
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
