import { TYPES, formatValue } from "@report-builder/shared";
import TypeBadge from "../components/TypeBadge.jsx";

export default function TypesStep({ columns, setColumns, rows, tpl }) {
  const setType = (key, type) => setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, type } : c)));
  return (
    <div className="panel" style={{ padding: 0 }}>
      <div className="types-head"><span>Column</span><span>Type</span><span>Why this type</span><span>Preview</span></div>
      {columns.filter((c) => c.selected).map((c) => (
        <div className="types-row" key={c.key}>
          <div style={{ minWidth: 0 }}>
            <div className="col-name">{c.name}</div>
            <TypeBadge type={c.type} />
          </div>
          <div>
            <select className="sel" value={c.type} onChange={(e) => setType(c.key, e.target.value)} aria-label={`Type for ${c.name}`}>
              {TYPES.map((t) => <option key={t} value={t}>{t}{t === c.suggested ? " (suggested)" : ""}</option>)}
            </select>
          </div>
          <div className="why">
            {c.type === c.suggested ? c.reason : (
              <>
                <span className="changed">Changed from {c.suggested}. </span>
                <button className="btn btn-quiet btn-sm" onClick={() => setType(c.key, c.suggested)}>Use suggestion</button>
              </>
            )}
          </div>
          <div className="samples">
            {rows.slice(0, 3).map((r, i) => (
              <span key={i}>{r[c.key] === null || r[c.key] === undefined ? <span className="rt-null">blank</span> : formatValue(r[c.key], c, tpl)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
