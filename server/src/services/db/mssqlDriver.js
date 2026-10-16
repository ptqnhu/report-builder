// The only file that touches the mssql package, so everything else can be tested without a database.
import { createRequire } from "node:module";

/**
 * msnodesqlv8 reports a failed sign-in as a plain object, not an Error, and mssql then turns it into
 * "[object Object]" and drops it. Wrapping open() hands mssql a real Error carrying every message SQL Server sent.
 */
export function asError(err) {
  if (!err || err instanceof Error) return err;
  const messages = [...new Set([err.message, ...(err.details || []).map((d) => d?.message)].filter(Boolean))];
  const e = new Error(messages.join(" ") || String(err));
  e.code = err.code;
  e.sqlState = err.sqlState;
  return e;
}

let patched = false;
function patchOdbcErrors() {
  if (patched) return;
  const native = createRequire(import.meta.url)("msnodesqlv8");
  const open = native.open;
  native.open = (config, callback) => open(config, (err, conn) => callback(asError(err), conn));
  patched = true;
}

/**
 * Opens a connection pool. Resolves once SQL Server has accepted the login.
 * Windows sign-in on this computer needs the ODBC-based driver; everything else uses tedious.
 */
export async function connectMssql(config) {
  const odbc = config.driver === "msnodesqlv8";
  if (odbc) patchOdbcErrors();
  const { default: mssql } = await (odbc ? import("mssql/msnodesqlv8.js") : import("mssql"));
  const pool = new mssql.ConnectionPool(config);
  pool.on("error", (e) => console.error("SQL Server pool error:", e.message));
  await pool.connect();
  return pool;
}
