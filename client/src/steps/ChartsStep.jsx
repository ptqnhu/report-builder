import { useMemo, useState } from "react";
import AiAssistant from "../components/AiAssistant.jsx";
import SqlEditor from "../components/SqlEditor.jsx";
import { ChartCard, StatTiles } from "../components/Charts.jsx";
import { suggestCharts } from "../utils/chartSuggest.js";

/**
 * "See data in charts": describe what to see, the AI writes a summarised query, the app runs it and suggests charts
 * for the rows that come back. `onRun(sql)` reads the query's columns (throws with SQL Server's message);
 * the rows then arrive through `preview`.
 */
export default function ChartsStep({ connection, sql, setSql, chat, setChat, onExpired, onRun, ran, cols, rows, preview }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [showSql, setShowSql] = useState(false);
  const { tiles, charts } = useMemo(() => suggestCharts(cols, rows), [cols, rows]);

  async function run(q) {
    if (!q.trim()) return;
    setRunning(true);
    setError("");
    try {
      await onRun(q);
    } catch (e) {
      if (e.status === 410) return onExpired(e);
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  const loading = running || preview.loading;
  const problem = error || preview.error;
  // One line under the query: what went wrong, what's happening, or what the charts are built from
  const [tone, status] = problem ? ["error", problem]
    : loading ? ["loading", `Running the query on ${connection.database}…`]
    : !ran ? ["muted", "Ask AI above, and the charts that suit the result appear here."]
    : !rows.length ? ["muted", "The query returned no rows. Ask for something broader."]
    : preview.truncated ? ["muted", `The query returns more than ${preview.limit.toLocaleString()} rows, so the charts use the first ${preview.limit.toLocaleString()}. Ask AI to summarise (for example “by month”) to chart them all.`]
    : ["muted", `Built from all ${rows.length.toLocaleString()} rows the query returned.`];

  return (
    <>
      <AiAssistant connection={connection} sql={sql} setSql={setSql} chat={chat} setChat={setChat} onExpired={onExpired}
        purpose="charts" onUse={run} />

      <div className="panel">
        <div className="ai-head">
          <span className="fld-label">Query</span>
          <button className="btn btn-quiet btn-sm" aria-expanded={showSql} onClick={() => setShowSql((s) => !s)}>
            {showSql ? "Hide the SQL" : sql.trim() ? "See or edit the SQL" : "Write the SQL yourself"}
          </button>
        </div>
        {showSql && (
          <>
            <SqlEditor value={sql} onChange={(e) => setSql(e.target.value)}
              placeholder={"SELECT Branch, SUM(Amount) AS TotalFunded\nFROM dbo.Loans\nGROUP BY Branch"} />
            <div className="panel-foot">
              <span className="muted">Only SELECT statements are allowed. A grouped query (one label column and a few totals) charts best.</span>
              <button className="btn btn-primary btn-sm" onClick={() => run(sql)} disabled={loading || !sql.trim()}>Run and chart</button>
            </div>
          </>
        )}
        <p className={tone} style={{ marginTop: showSql ? 10 : 0 }} role="status">{status}</p>
      </div>

      {ran && !loading && !problem && rows.length > 0 && (
        <section className="ch-results" aria-label="Suggested charts">
          {tiles.length > 0 && <StatTiles tiles={tiles} />}
          {charts.length ? (
            <>
              <h2 className="ch-results-title">Suggested charts</h2>
              <div className="ch-grid">
                {charts.map((c) => <ChartCard key={c.id} chart={c} />)}
              </div>
            </>
          ) : (
            <div className="panel muted">
              No chart suits these columns yet. Charts need a number to measure and a label or date to group it by. Try
              asking for a total “by month” or “by branch”.
            </div>
          )}
        </section>
      )}
    </>
  );
}
