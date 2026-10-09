import { OPS, NO_VALUE_OPS, family, filterActive } from "@report-builder/shared";
import ReportDocument from "../components/ReportDocument.jsx";

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()));

export default function DetailsStep({ title, setTitle, desc, setDesc, filters, setFilters, effCols, colsByKey, tpl, matchCount, totalRows, previewProps }) {
  const patchFilter = (id, p) => setFilters((fs) => fs.map((f) => (f.id === id ? { ...f, ...p } : f)));
  function addFilter() {
    const c = effCols[0];
    if (c) setFilters((fs) => [...fs, { id: newId(), col: c.key, op: OPS[family(c.type)][0][0], value: "", value2: "" }]);
  }
  function changeColumn(id, key) {
    patchFilter(id, { col: key, op: OPS[family(colsByKey[key].type)][0][0], value: "", value2: "" });
  }

  return (
    <>
      <div className="panel">
        <label className="fld">
          <span className="fld-label">Report title</span>
          <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Orders by customer, Q3 2026" />
        </label>
        <label className="fld" style={{ marginTop: 14 }}>
          <span className="fld-label">Description (optional)</span>
          <textarea className="ta" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What the report covers and who it's for" />
        </label>
      </div>

      <div className="panel">
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="fld-label" style={{ margin: 0 }}>Filters</span>
          <button className="btn btn-sm" onClick={addFilter}>Add filter</button>
        </div>
        {filters.length === 0 ? (
          <p className="muted">No filters yet, so every row is included. Add one to narrow the report.</p>
        ) : (
          <div className="filters">
            {filters.map((f) => {
              const c = colsByKey[f.col];
              if (!c) return null;
              const fam = family(c.type);
              const inputType = fam === "Number" ? "number" : fam === "Date" ? "date" : "text";
              const unit = c.type === "Percentage" ? "%" : c.type === "Currency" ? tpl.currency : "";
              return (
                <div className="filter-row" key={f.id}>
                  <select className="sel" value={f.col} onChange={(e) => changeColumn(f.id, e.target.value)} aria-label="Column">
                    {effCols.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                  <select className="sel" value={f.op} onChange={(e) => patchFilter(f.id, { op: e.target.value })} aria-label="Condition">
                    {OPS[fam].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {!NO_VALUE_OPS.has(f.op) && (
                    <>
                      <input className="inp" type={inputType} value={f.value} onChange={(e) => patchFilter(f.id, { value: e.target.value })} aria-label="Value" />
                      {unit && <span className="unit">{unit}</span>}
                    </>
                  )}
                  {f.op === "between" && (
                    <>
                      <span className="unit">and</span>
                      <input className="inp" type={inputType} value={f.value2} onChange={(e) => patchFilter(f.id, { value2: e.target.value })} aria-label="Second value" />
                    </>
                  )}
                  {!filterActive(f, c) && <span className="pending">Add a value to apply</span>}
                  <button className="btn btn-quiet btn-sm" style={{ marginLeft: "auto" }} onClick={() => setFilters((fs) => fs.filter((x) => x.id !== f.id))}>Remove</button>
                </div>
              );
            })}
          </div>
        )}
        <p className="match"><strong>{matchCount}</strong> of {totalRows} rows match.</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <ReportDocument {...previewProps} limit={5} />
      </div>
    </>
  );
}
