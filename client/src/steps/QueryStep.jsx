import { EXAMPLE_SQL } from "./steps.js";
import AiAssistant from "../components/AiAssistant.jsx";
import SqlEditor from "../components/SqlEditor.jsx";

export default function QueryStep({ sql, setSql, connection, aiChat, setAiChat, onExpired }) {
  return (
    <>
      <AiAssistant connection={connection} sql={sql} setSql={setSql} chat={aiChat} setChat={setAiChat} onExpired={onExpired} />
      <div className="panel">
        <p className="muted" style={{ marginBottom: 10 }}>
          Runs against <strong style={{ color: "var(--ink)" }}>{connection.database}</strong> on {connection.server}.
        </p>
        <label className="fld">
          <span className="fld-label">SQL query</span>
          <SqlEditor value={sql} onChange={(e) => setSql(e.target.value)}
            placeholder={"SELECT customer_name, order_date, total\nFROM dbo.Orders\nWHERE order_date >= '2026-01-01'"} />
        </label>
        <div className="panel-foot">
          <span className="muted">Only SELECT statements (including WITH … SELECT) are allowed.</span>
          <button className="btn btn-quiet btn-sm" onClick={() => setSql(EXAMPLE_SQL)}>Load an example query</button>
        </div>
      </div>
    </>
  );
}
