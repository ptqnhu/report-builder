import { useEffect, useState } from "react";
import Segmented from "../components/Segmented.jsx";
import { api } from "../api.js";

const RECENT_KEY = "report-builder.recentServers";
const LAST_LOCAL_KEY = "report-builder.lastLocalDatabase";
const OTHER = "__other__";
let autoConnectTried = false; // once per page load, so Disconnect doesn't reconnect straight away

/** Local SQL Server installs use a self-signed certificate, so trust it by default for them. */
const isLocal = (server) => /^(localhost|127\.0\.0\.1|\.|\(local\))([\\,]|$)/i.test(server.trim());
const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
}
function saveRecent(server) {
  const list = [server, ...loadRecent().filter((s) => !sameName(s, server))].slice(0, 5);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}
/** The last database opened with "This computer" sign-in, reopened automatically next time. */
function loadLastLocal() {
  try { return JSON.parse(localStorage.getItem(LAST_LOCAL_KEY)) || null; } catch { return null; }
}
function saveLastLocal(server, database) {
  try { localStorage.setItem(LAST_LOCAL_KEY, JSON.stringify({ server, database })); } catch { /* storage unavailable */ }
}

const EMPTY = { server: "localhost", database: "", authType: "sql", user: "", password: "", encrypt: true, trustServerCertificate: true };

export default function ConnectStep({ connection, onConnected, onDisconnect }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent] = useState(loadRecent);
  const [local, setLocal] = useState(null); // [{ server, running }] once loaded
  const [typing, setTyping] = useState(false);
  const [dbTyping, setDbTyping] = useState(false);
  // Databases found for one server + login; any change to those makes the list stale.
  const [dbs, setDbs] = useState({ key: "", list: null, loading: false, message: "" });
  const dbKey = `${form.server}|${form.authType}|${form.user}`;
  const found = dbs.key === dbKey ? dbs : { list: null, loading: false, message: "" };

  const useLocal = form.authType === "local";
  // "This computer" sign-in is offered for running SQL Servers on this computer (the list is empty for remote browsers).
  const runningLocal = (server) => !!local?.some((i) => i.running && sameName(i.server, server.trim()));

  const set = (p) => { setForm((f) => ({ ...f, ...p })); setError(""); };
  const setServer = (server) => {
    setForm((f) => ({
      ...f, server, trustServerCertificate: isLocal(server),
      authType: runningLocal(server) ? "local" : f.authType === "local" ? "sql" : f.authType,
    }));
    setError("");
  };

  // Offer the SQL Server instances installed on this computer, starting on one that's running, signed in as this computer.
  useEffect(() => {
    api.localServers().then((list) => {
      setLocal(list);
      const first = list.find((i) => i.running);
      if (first) setForm((f) => (f.server === EMPTY.server ? { ...f, server: first.server, authType: "local" } : f));
    }).catch(() => setLocal([]));
  }, []);

  // No login needed on this computer, so list its databases straight away.
  useEffect(() => { if (useLocal) findDatabases(); }, [form.server, form.authType]);

  const localOptions = local?.length ? local : [{ server: "localhost", running: true }];
  const serverOptions = [
    ...localOptions.map((i) => ({ value: i.server, label: i.running ? i.server : `${i.server} (not running)`, disabled: !i.running })),
    ...recent.filter((s) => !localOptions.some((i) => sameName(i.server, s))).map((s) => ({ value: s, label: s })),
  ];

  function pickServer(value) {
    if (value === OTHER) { setTyping(true); setServer(""); }
    else { setTyping(false); setServer(value); }
  }

  async function findDatabases() {
    if (!form.server.trim() || (!useLocal && !form.user.trim()) || found.loading) return;
    const key = dbKey;
    setDbs({ key, list: null, loading: true, message: "" });
    try {
      const list = await api.listDatabases({ ...form, database: undefined });
      setDbs({ key, list, loading: false, message: list.length ? "" : "This login can't open any user databases on this server." });
      setDbTyping(false);
      const last = useLocal ? loadLastLocal() : null;
      const preferred = last && sameName(last.server, form.server) && list.includes(last.database) ? last.database : null;
      setForm((f) => ({ ...f, database: preferred || (list.includes(f.database) ? f.database : list.length === 1 ? list[0] : "") }));
      // Reopen the database used last time on this computer, without asking.
      if (useLocal && !autoConnectTried) {
        autoConnectTried = true;
        if (preferred) await openConnection({ ...form, database: preferred });
      }
    } catch (err) {
      setDbs({ key, list: null, loading: false, message: err.message });
    }
  }

  function connect(e) {
    e.preventDefault();
    openConnection(form);
  }

  async function openConnection(details) {
    setBusy(true);
    setError("");
    try {
      const conn = await api.connect(details);
      setForm((f) => ({ ...f, password: "" })); // don't keep the password in the browser
      saveRecent(details.server.trim());
      if (details.authType === "local") saveLastLocal(details.server.trim(), details.database);
      onConnected(conn);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (connection) {
    return (
      <div className="panel conn-card">
        <span className="conn-dot" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="conn-title">Connected to {connection.database}</p>
          <p className="muted">
            {connection.server}, signed in as {connection.user}
            {connection.version ? `, SQL Server ${connection.version}` : ""}
          </p>
        </div>
        <button className="btn" onClick={onDisconnect}>Disconnect</button>
      </div>
    );
  }

  const windows = form.authType === "windows";
  const showDbList = found.list?.length > 0 && !dbTyping;
  return (
    <form className="panel connect-form" onSubmit={connect}>
      <div className="connect-grid">
        <div className="fld">
          <label className="fld-label" htmlFor="conn-server">Server</label>
          <select id="conn-server" className="sel" value={typing ? OTHER : form.server} onChange={(e) => pickServer(e.target.value)}>
            {serverOptions.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
            <option value={OTHER}>Other server…</option>
          </select>
          {typing && (
            <input className="inp" style={{ marginTop: 8 }} value={form.server} onChange={(e) => setServer(e.target.value)} placeholder="SQLPROD01\SALES or sql01.corp.local,1433" autoComplete="off" required autoFocus aria-label="Server name" aria-describedby="conn-server-hint" />
          )}
          {typing && <span id="conn-server-hint" className="fld-hint" style={{ display: "block" }}>Add an instance with a backslash, or a port with a comma.</span>}
        </div>
      </div>

      <div className="fld" style={{ marginTop: 16 }}>
        <span className="fld-label">Sign in with</span>
        <Segmented label="Authentication" value={form.authType} onChange={(v) => set({ authType: v })}
          options={[...(runningLocal(form.server) ? [["local", "This computer"]] : []), ["sql", "SQL Server login"], ["windows", "Windows account"]]} />
        {useLocal && <span className="fld-hint" style={{ display: "block", marginTop: 6 }}>Signs in with your Windows account on this computer. No password needed.</span>}
      </div>

      {!useLocal && <div className="connect-grid" style={{ marginTop: 12 }}>
        <label className="fld">
          <span className="fld-label">{windows ? "Windows user" : "Login"}</span>
          <input className="inp" value={form.user} onChange={(e) => set({ user: e.target.value })} placeholder={windows ? "CORP\\your.name" : "report_reader"} autoComplete="username" required />
        </label>
        <label className="fld">
          <span className="fld-label">Password</span>
          <input className="inp" type="password" value={form.password} onChange={(e) => set({ password: e.target.value })}
            onBlur={() => { if (!found.list) findDatabases(); }} autoComplete="current-password" />
        </label>
      </div>}

      <div className="connect-grid" style={{ marginTop: 12 }}>
        <div className="fld">
          <label className="fld-label" htmlFor="conn-db">Database</label>
          {showDbList ? (
            <select id="conn-db" className="sel" value={form.database} required
              onChange={(e) => (e.target.value === OTHER ? (setDbTyping(true), set({ database: "" })) : set({ database: e.target.value }))}>
              <option value="" disabled>Choose a database</option>
              {found.list.map((d) => <option key={d} value={d}>{d}</option>)}
              <option value={OTHER}>Other database…</option>
            </select>
          ) : (
            <input id="conn-db" className="inp" value={form.database} onChange={(e) => set({ database: e.target.value })} placeholder="SalesDB" autoComplete="off" required autoFocus={dbTyping} />
          )}
          <span className="fld-hint" style={{ display: "block" }} role="status">
            {found.loading ? "Looking for databases…" : found.message || (showDbList ? `${found.list.length} databases this login can open.` : "")}
            {!found.loading && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={findDatabases} disabled={!form.server.trim() || (!useLocal && !form.user.trim())}>
                {found.list ? "Refresh list" : "Find databases"}
              </button>
            )}
          </span>
        </div>
      </div>

      <details className="opt">
        <summary>Connection options</summary>
        <label className="check"><input type="checkbox" checked={form.encrypt} onChange={(e) => set({ encrypt: e.target.checked })} />Encrypt the connection</label>
        <label className="check"><input type="checkbox" checked={form.trustServerCertificate} onChange={(e) => set({ trustServerCertificate: e.target.checked })} />Trust server certificate (for internal servers with a self-signed certificate)</label>
      </details>

      <div className="export-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Connecting…" : "Connect"}</button>
        {error && <span className="error" role="alert">{error}</span>}
      </div>
      <p className="fld-hint" style={{ marginTop: 10 }}>
        Your password is only used to open the connection on the app's server. It isn't stored and is never written into the report.
        For safety, use a login that can only read data, such as a member of db_datareader. The app also blocks anything other than SELECT queries.
      </p>
    </form>
  );
}
