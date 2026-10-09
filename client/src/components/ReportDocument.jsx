import { filterActive, describeFilter, fmtDate } from "@report-builder/shared";
import ReportTable from "./ReportTable.jsx";

/** The report as readers see it: header, table, footer. Used for previews and the final report. */
export default function ReportDocument({ cols, rows, totalRows, tpl, title, desc, filters = [], colsByKey, sort, onSort, limit, loading }) {
  const active = filters.filter((f) => filterActive(f, colsByKey[f.col]));
  return (
    <article className={`doc doc-${tpl.theme}`}>
      <header className="doc-head">
        {tpl.org && <p className="doc-org">{tpl.org}</p>}
        <h2 className={`doc-title ${title ? "" : "placeholder"}`}>{title || "Report title"}</h2>
        {desc && <p className="doc-desc">{desc}</p>}
        <p className="doc-meta">
          <span>Generated {fmtDate(new Date(), tpl.dateFormat)}</span>
          <span>{rows.length === totalRows ? `${totalRows} rows` : `${rows.length} of ${totalRows} rows`}</span>
          <span>{cols.length} {cols.length === 1 ? "column" : "columns"}</span>
          {loading && <span className="loading">Updating preview…</span>}
        </p>
        {active.length > 0 && (
          <ul className="chips" aria-label="Filters applied">
            {active.map((f) => <li key={f.id}>{describeFilter(f, colsByKey[f.col], tpl)}</li>)}
          </ul>
        )}
      </header>
      <ReportTable cols={cols} rows={rows} tpl={tpl} sort={sort} onSort={onSort} limit={limit} />
      {limit && rows.length > limit && <p className="doc-note">Showing the first {limit} rows here. The finished report shows all {rows.length}.</p>}
      {tpl.footer && <footer className="doc-foot">{tpl.footer}</footer>}
    </article>
  );
}
