import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TPL, DEFAULT_EXPORT, effectiveColumns, keyBy, applyFilters, prettify } from "@report-builder/shared";
import { api } from "./api.js";
import { STEPS } from "./steps/steps.js";
import StepRail from "./components/StepRail.jsx";
import Orbs from "./components/Orbs.jsx";
import ConnectStep from "./steps/ConnectStep.jsx";
import QueryStep from "./steps/QueryStep.jsx";
import ColumnsStep from "./steps/ColumnsStep.jsx";
import TypesStep from "./steps/TypesStep.jsx";
import TemplateStep from "./steps/TemplateStep.jsx";
import DetailsStep from "./steps/DetailsStep.jsx";
import ReportStep from "./steps/ReportStep.jsx";
import { usePreviewRows } from "./hooks/usePreviewRows.js";
import { useRdlExport } from "./hooks/useRdlExport.js";
import { sortRows } from "./utils/table.js";

// Step numbers, so the flow reads clearly below.
const CONNECT = 0, QUERY = 1, COLUMNS = 2, TYPES = 3, TEMPLATE = 4, DETAILS = 5, REPORT = 6;
const EMPTY_ANALYSIS = { columns: [], table: null, key: null };

export default function App() {
  // Navigation
  const [step, setStep] = useState(CONNECT);
  const [reached, setReached] = useState(CONNECT);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Connection and report definition
  const [connection, setConnection] = useState(null);
  const [sql, setSql] = useState("");
  const [analysis, setAnalysis] = useState(EMPTY_ANALYSIS);
  const [tpl, setTpl] = useState(DEFAULT_TPL);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [filters, setFilters] = useState([]);
  const [sort, setSort] = useState(null);
  const [exp, setExp] = useState(DEFAULT_EXPORT);

  const columns = analysis.columns;
  const setColumns = (fn) => setAnalysis((a) => ({ ...a, columns: typeof fn === "function" ? fn(a.columns) : fn }));

  const go = (n) => { setError(""); setStep(n); setReached((r) => Math.max(r, n)); };

  /** The server forgot the connection (idle timeout or restart): send the user back to reconnect. */
  function handleExpired(e) {
    setConnection(null);
    setAnalysis(EMPTY_ANALYSIS);
    setStep(CONNECT);
    setReached(CONNECT);
    setError(e.message);
  }

  function onConnected(conn) {
    setConnection(conn);
    setAnalysis(EMPTY_ANALYSIS); // a new database means the query must be read again
    setReached(CONNECT);
    setExp((e) => ({ ...e, server: conn.server, database: conn.database, dsAuth: conn.authType === "sql" ? "sql" : "windows" }));
    setError("");
  }

  async function onDisconnect() {
    if (connection) api.disconnect(connection.connectionId).catch(() => {});
    setConnection(null);
    setAnalysis(EMPTY_ANALYSIS);
    setReached(CONNECT);
  }

  // Close the server-side connection when the tab is closed.
  useEffect(() => {
    if (!connection) return;
    const close = () => api.disconnect(connection.connectionId, { keepalive: true }).catch(() => {});
    window.addEventListener("pagehide", close);
    return () => window.removeEventListener("pagehide", close);
  }, [connection]);

  // Live data for the previews
  const preview = usePreviewRows({
    connectionId: connection?.connectionId, sql, analysisKey: analysis.key, columns, onExpired: handleExpired,
  });
  const rows = preview.rows;
  const effCols = useMemo(() => effectiveColumns(columns, tpl), [columns, tpl]);
  const colsByKey = useMemo(() => keyBy(effCols), [effCols]);
  const sortedAll = useMemo(() => sortRows(rows, sort, colsByKey), [rows, sort, colsByKey]);
  const filteredRows = useMemo(() => sortRows(applyFilters(rows, filters, colsByKey), sort, colsByKey), [rows, filters, colsByKey, sort]);

  const rdlResult = useRdlExport(
    {
      sql, tpl, title, desc, filters, sort, exp,
      columns: columns.map(({ key, name, type, selected, unnamed, dup }) => ({ key, name, type, selected, unnamed, dup })),
    },
    step === REPORT
  );

  const toggleSort = (key) =>
    setSort((s) => (s && s.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));

  async function next() {
    setError("");
    if (step === CONNECT) {
      if (!connection) return setError("Connect to a database to continue.");
      return go(QUERY);
    }
    if (step === QUERY) {
      const key = `${connection.connectionId}\u0000${sql}`;
      if (key !== analysis.key) {
        setBusy(true);
        try {
          const res = await api.analyze(connection.connectionId, sql);
          setAnalysis({ columns: res.columns, table: res.table, key });
          setFilters([]);
          setSort(null);
          if (!title && res.table) setTitle(`${prettify(res.table)} report`);
          setReached(QUERY);
        } catch (e) {
          if (e.status === 410) return handleExpired(e);
          return setError(e.message);
        } finally {
          setBusy(false);
        }
      }
      return go(COLUMNS);
    }
    if (step === COLUMNS && !columns.some((c) => c.selected)) return setError("Select at least one column.");
    if (step === DETAILS && !title.trim()) return setError("Add a report title to continue.");
    go(step + 1);
  }

  const previewProps = {
    cols: effCols, totalRows: rows.length, tpl, title, desc, colsByKey, sort, onSort: toggleSort, loading: preview.loading,
  };
  const S = STEPS[step];
  const showPreviewBar = step >= TYPES && analysis.key;

  return (
    <div className="rb">
      <Orbs />
      <div className="rb-shell">
        <StepRail step={step} reached={reached} onGo={go} sql={sql} connection={connection} />

        <main className="rb-main">
          <div className="page-head">
            <p className="stepno">Step {step + 1} of {STEPS.length}</p>
            <h1>{S.heading}</h1>
            <p className="help">{S.help}</p>
          </div>

          {showPreviewBar && (
            <div className="preview-bar no-print">
              {preview.loading ? <span className="loading">Loading rows from {connection?.database}…</span>
                : preview.error ? <span className="error">{preview.error}</span>
                : <span>{preview.truncated ? `Previewing the first ${preview.limit} rows. The SSRS report returns every row.` : `Previewing all ${rows.length} rows.`}</span>}
              <button className="btn btn-quiet btn-sm" onClick={preview.refresh} disabled={preview.loading}>Reload rows</button>
            </div>
          )}

          {step === CONNECT && <ConnectStep connection={connection} onConnected={onConnected} onDisconnect={onDisconnect} />}

          {step === QUERY && <QueryStep sql={sql} setSql={setSql} connection={connection} />}

          {step === COLUMNS && <ColumnsStep columns={columns} setColumns={setColumns} />}

          {step === TYPES && <TypesStep columns={columns} setColumns={setColumns} rows={rows} tpl={tpl} />}

          {step === TEMPLATE && (
            <TemplateStep tpl={tpl} setTpl={setTpl} effCols={effCols} previewProps={{ ...previewProps, rows: sortedAll }} />
          )}

          {step === DETAILS && (
            <DetailsStep
              title={title} setTitle={setTitle} desc={desc} setDesc={setDesc}
              filters={filters} setFilters={setFilters} effCols={effCols} colsByKey={colsByKey} tpl={tpl}
              matchCount={filteredRows.length} totalRows={rows.length}
              previewProps={{ ...previewProps, rows: filteredRows, filters }}
            />
          )}

          {step === REPORT && (
            <ReportStep
              exp={exp} setExp={setExp} rdlResult={rdlResult}
              previewProps={{ ...previewProps, rows: filteredRows, filters }}
              onEditTemplate={() => go(TEMPLATE)} onEditFilters={() => go(DETAILS)}
            />
          )}

          <nav className="rb-nav" aria-label="Steps">
            <div>{step > CONNECT && <button className="btn" onClick={() => go(step - 1)}>Back</button>}</div>
            <div className="row">
              {error && <span className="error" role="alert">{error}</span>}
              {S.next ? (
                <button className="btn btn-primary" onClick={next} disabled={busy || (step === CONNECT && !connection)}>
                  {busy ? "Asking SQL Server…" : S.next}
                </button>
              ) : (
                <button className="btn" onClick={() => go(QUERY)}>Start a new query</button>
              )}
            </div>
          </nav>
        </main>
      </div>
    </div>
  );
}
