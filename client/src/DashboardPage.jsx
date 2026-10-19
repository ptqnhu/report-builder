import { useEffect, useState } from "react";
import { fmtDate } from "@report-builder/shared";
import Logo from "./components/Logo.jsx";
import ConnectStep from "./steps/ConnectStep.jsx";
import { ChartCard, StatTiles } from "./components/Charts.jsx";
import { DEPARTMENTS, departmentOf } from "./dashboards/departments.js";
import { useDashboard } from "./hooks/useDashboard.js";
import { DEFAULT_SLICE, PRESETS, isoDate } from "./dashboards/period.js";
import { api } from "./api.js";

/**
 * The dashboards: the business overview (the home page) and one per department (#/dashboards/<id>), picked from a
 * drop-down, each with headline numbers and charts for the dates picked in the slicer above them. The top bar leads
 * to the report tools. The page has its own database connection; the queries for each dashboard are in
 * src/dashboards/. The slicer keeps its choice when you switch dashboards.
 */
export default function DashboardPage({ departmentId }) {
  const department = departmentOf(departmentId);
  const [connection, setConnection] = useState(null);
  const [notice, setNotice] = useState("");
  const [slice, setSlice] = useState(DEFAULT_SLICE);

  /** The server forgot the connection (idle timeout or restart): ask to connect again. */
  const onExpired = (e) => { setConnection(null); setNotice(e.message); };
  const { results, period, range, loading, refresh } = useDashboard({ connectionId: connection?.connectionId, department, slice, onExpired });

  function disconnect() {
    if (connection) api.disconnect(connection.connectionId).catch(() => {});
    setConnection(null);
  }

  // Close the server-side connection when the tab is closed.
  useEffect(() => {
    if (!connection) return;
    const close = () => api.disconnect(connection.connectionId, { keepalive: true }).catch(() => {});
    window.addEventListener("pagehide", close);
    return () => window.removeEventListener("pagehide", close);
  }, [connection]);

  const ids = ["headline", ...department.charts.map((c) => c.id)];
  const failed = ids.every((id) => results[id]?.error);

  return (
    <div className="rb">
      <div className="rb-shell">
        <header className="rb-rail">
          <p className="rb-brand"><a href="#" title="Back to the home page"><Logo size={24} />LoanMart Insights</a></p>
          <div className="rail-end">
            <nav className="rail-links" aria-label="Report tools">
              {TOOLS.map(([href, label]) => <a key={href} className="btn btn-quiet btn-sm" href={href}>{label}</a>)}
            </nav>
            {connection && (
              <p className="rail-conn" title={`${connection.database} on ${connection.server}`}>
                <span className="conn-dot" aria-hidden="true" />
                <strong>{connection.database}</strong>
                <span>{connection.server}</span>
              </p>
            )}
          </div>
        </header>

        <main className="rb-main">
          <div className="page-head dash-head">
            <div>
              <p className="stepno">Dashboards</p>
              <h1>{department.heading || `${department.name} overview`}</h1>
              <p className="help">{department.summary}</p>
            </div>
            <div className="dash-pick">
              <label className="fld-label" htmlFor="dash-dept">Dashboard</label>
              <select id="dash-dept" className="sel" value={department.id}
                onChange={(e) => { location.hash = `#/dashboards/${e.target.value}`; }}>
                {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {!connection ? (
            <>
              {notice && <p className="error" role="alert" style={{ marginBottom: 12 }}>{notice}</p>}
              <p className="help" style={{ marginBottom: 12 }}>Connect to the database to see the dashboard.</p>
              <ConnectStep connection={null} onConnected={(c) => { setNotice(""); setConnection(c); }} onDisconnect={disconnect} />
            </>
          ) : (
            <>
              <DateSlicer slice={slice} setSlice={setSlice} period={period} range={range} department={department} />

              <div className="preview-bar no-print">
                <span role="status">{loading ? `Loading from ${connection.database}…` : `Live data from ${connection.database}.`}</span>
                <button className="btn btn-quiet btn-sm" onClick={refresh} disabled={loading}>Refresh</button>
                <button className="btn btn-quiet btn-sm" onClick={disconnect}>Change database</button>
              </div>

              {failed ? (
                <div className="panel">
                  <p className="conn-title">This database doesn't have the {department.name} data</p>
                  <p className="muted" style={{ marginTop: 6 }}>
                    The {department.name} dashboard reads {department.tables}. SQL Server said: {results.headline.error}
                  </p>
                </div>
              ) : (
                <section className={`ch-results${loading ? " dash-stale" : ""}`} aria-busy={loading} aria-label={`${department.name} dashboard`}>
                  <Headline result={results.headline} />
                  <div className="ch-grid dash-grid">
                    {department.charts.map((c) => <Panel key={c.id} def={c} result={results[c.id]} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/** The rest of the app, from the top bar: [link, label]. */
const TOOLS = [
  ["#/build/ssrs", "SSRS report"],
  ["#/build/adhoc", "Export data"],
  ["#/build/charts", "Charts"],
  ["#/templates", "Templates"],
  ["#/options", "All tools"],
];

/**
 * The date slicer: one row above everything it scopes. Presets first, then a custom range (From and To appear when
 * it's picked, starting on the dates on show). A dashboard without dates (a snapshot) shows it switched off.
 */
function DateSlicer({ slice, setSlice, period, range, department }) {
  const dated = !!department.dates;
  const lastDay = period && isoDate(new Date(period.to.getFullYear(), period.to.getMonth(), period.to.getDate() - 1));
  function pick(preset) {
    if (preset !== "custom" || !period) return setSlice({ ...slice, preset });
    setSlice({ preset, from: slice.from || isoDate(period.from), to: slice.to || lastDay });
  }
  const bounds = range ? { min: isoDate(range.first), max: isoDate(range.last) } : {};
  return (
    <div className="dash-slicer no-print" role="group" aria-label="Dates">
      <div>
        <label className="fld-label" htmlFor="dash-dates">Dates</label>
        <select id="dash-dates" className="sel" value={slice.preset} disabled={!dated} onChange={(e) => pick(e.target.value)}>
          {PRESETS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      {dated && slice.preset === "custom" && (
        <>
          <div>
            <label className="fld-label" htmlFor="dash-from">From</label>
            <input id="dash-from" className="inp" type="date" {...bounds} value={slice.from} onChange={(e) => setSlice({ ...slice, from: e.target.value })} />
          </div>
          <div>
            <label className="fld-label" htmlFor="dash-to">To</label>
            <input id="dash-to" className="inp" type="date" {...bounds} value={slice.to} onChange={(e) => setSlice({ ...slice, to: e.target.value })} />
          </div>
        </>
      )}
      <p className="dash-slicer-note">
        {!dated ? `${department.name} is a snapshot of today, so the dates don't change it.`
          : period ? (
            <>
              <strong>{period.label}</strong>
              {period.compare && <>, compared with {period.prevLabel}</>}
              <span className="muted"> · by {department.dates.what}{range && `; the data runs to ${fmtDate(range.last, "")}`}</span>
            </>
          ) : "Finding the dates in the data…"}
      </p>
    </div>
  );
}

/** The headline tiles, or a placeholder row while they load. */
function Headline({ result }) {
  if (result?.data) return <StatTiles tiles={result.data.tiles} />;
  return (
    <div className="ch-card dash-wait dash-wait-tiles">
      <p className={result?.error ? "error" : "muted"}>{result?.error || (result?.data === null ? "No data to show yet." : "Loading the headline numbers…")}</p>
    </div>
  );
}

/** One chart: the chart once its query is back, or its title with what's happening. */
function Panel({ def, result }) {
  if (result?.data) return <ChartCard chart={{ id: def.id, kind: def.kind, title: def.title, why: def.why, ...result.data }} />;
  const [tone, text] = result?.error ? ["error", result.error] : result?.data === null ? ["muted", "Nothing to show for this period."] : ["muted", "Loading…"];
  return (
    <figure className={`ch-card dash-wait${def.kind === "line" ? " wide" : ""}`}>
      <figcaption className="ch-head">
        <div>
          <h3>{def.title}</h3>
          <p className="muted">{def.why}</p>
        </div>
      </figcaption>
      <p className={tone} role={tone === "error" ? "alert" : undefined}>{text}</p>
    </figure>
  );
}
