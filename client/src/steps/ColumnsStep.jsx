export default function ColumnsStep({ columns, setColumns }) {
  const selectedCount = columns.filter((c) => c.selected).length;
  const setAll = (val) => setColumns((cs) => cs.map((c) => ({ ...c, selected: val })));
  const toggle = (key) => setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, selected: !c.selected } : c)));

  return (
    <div className="panel">
      <div className="row between" style={{ marginBottom: 10 }}>
        <p className="muted"><strong style={{ color: "var(--ink)" }}>{selectedCount}</strong> of {columns.length} columns selected</p>
        <div className="row">
          <button className="btn btn-sm" onClick={() => setAll(true)} disabled={selectedCount === columns.length}>Select all</button>
          <button className="btn btn-sm" onClick={() => setAll(false)} disabled={selectedCount === 0}>Clear all</button>
        </div>
      </div>
      <ul className="col-list">
        {columns.map((c) => (
          <li key={c.key} className="col-item">
            <label>
              <input type="checkbox" checked={c.selected} onChange={() => toggle(c.key)} />
              <span style={{ minWidth: 0 }}>
                <span className="col-name">{c.name}</span>
                <span className="col-expr" style={{ display: "block" }}>
                  {c.sqlType}{c.nullable ? ", can be empty" : ""}
                </span>
              </span>
            </label>
            {c.unnamed && <span className="changed">No name. Add an alias with AS in the query.</span>}
            {c.dup && <span className="changed">Duplicate name. Give it a different alias.</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
