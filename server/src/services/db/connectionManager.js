import { randomUUID } from "node:crypto";
import { HttpError } from "../../lib/errors.js";
import { friendlyConnectError } from "./errors.js";

/**
 * Keeps one connection pool per signed-in browser session, identified by a random id.
 * Passwords stay inside the pool on the server; the browser only ever holds the id.
 * Pools that haven't been used for `idleMs` are closed by sweep().
 *
 * @param {{connect: (config) => Promise<pool>, idleMs?: number, max?: number, now?: () => number}} deps
 */
export function createConnectionManager({ connect, idleMs = 30 * 60_000, max = 50, now = Date.now } = {}) {
  const sessions = new Map();
  let timer = null;

  async function open(config, summary) {
    if (sessions.size >= max) throw new HttpError(503, "Too many open connections. Try again in a few minutes.");
    let pool;
    try { pool = await connect(config); }
    catch (e) { throw new HttpError(422, friendlyConnectError(e)); }

    let version = "", login = "";
    try {
      const r = await pool.request().query("SELECT CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(64)) AS version, SUSER_SNAME() AS login");
      version = r.recordset?.[0]?.version || "";
      login = r.recordset?.[0]?.login || "";
    } catch { /* informational only */ }

    const id = randomUUID();
    const info = { ...summary, user: summary.user || login, version, connectedAt: new Date(now()).toISOString() };
    sessions.set(id, { pool, info, lastUsed: now() });
    return { id, info };
  }

  /** Signs in just long enough to list the databases this login can open. */
  async function listDatabases(config) {
    let pool;
    try { pool = await connect(config); }
    catch (e) { throw new HttpError(422, friendlyConnectError(e)); }
    try {
      const r = await pool.request().query(
        "SELECT name FROM sys.databases WHERE database_id > 4 AND state_desc = 'ONLINE' AND HAS_DBACCESS(name) = 1 ORDER BY name");
      return r.recordset.map((row) => row.name);
    } finally {
      try { await pool.close(); } catch { /* already closed */ }
    }
  }

  function get(id) {
    const s = typeof id === "string" ? sessions.get(id) : undefined;
    if (!s) throw new HttpError(410, "The database connection has expired. Connect again to continue.");
    s.lastUsed = now();
    return s;
  }

  async function close(id) {
    const s = sessions.get(id);
    if (!s) return false;
    sessions.delete(id);
    try { await s.pool.close(); } catch { /* already closed */ }
    return true;
  }

  async function sweep() {
    const cutoff = now() - idleMs;
    for (const [id, s] of sessions) if (s.lastUsed < cutoff) await close(id);
  }

  const closeAll = () => Promise.all([...sessions.keys()].map(close));

  function startSweeping(intervalMs = 60_000) {
    timer = setInterval(() => sweep().catch(() => {}), intervalMs);
    timer.unref?.();
  }
  const stop = () => clearInterval(timer);

  return { open, listDatabases, get, close, sweep, closeAll, startSweeping, stop, size: () => sessions.size };
}
