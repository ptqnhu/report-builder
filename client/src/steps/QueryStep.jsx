import { EXAMPLE_SQL } from "./steps.js";

export default function QueryStep({ sql, setSql, connection }) {
  return (
    <div className="panel">
      <p className="muted" style={{ marginBottom: 10 }}>
        Runs against <strong style={{ color: "var(--ink)" }}>{connection.database}</strong> on {connection.server}.
      </p>
      <label className="fld">
        <span className="fld-label">SQL query</span>
        <textarea className="ta code" rows={14} spellCheck={false} value={sql} onChange={(e) => setSql(e.target.value)}
          placeholder={"SELECT customer_name, order_date, total\nFROM dbo.Orders\nWHERE order_date >= '2026-01-01'"} />
      </label>
      <div className="row between" style={{ marginTop: 8 }}>
        <button className="btn btn-quiet btn-sm" onClick={() => setSql(EXAMPLE_SQL)}>Load an example query</button>
        <span className="muted">Only SELECT statements (including WITH … SELECT) are allowed.</span>
      </div>
    </div>
  );
}
