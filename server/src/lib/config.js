// All runtime settings in one place. Every value can be overridden with an environment variable.
const num = (v, fallback) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback);

export const settings = {
  port: num(process.env.PORT, 4000),
  /** Close database connections nobody has used for this long. */
  idleMs: num(process.env.CONNECTION_IDLE_MINUTES, 30) * 60_000,
  maxConnections: num(process.env.MAX_CONNECTIONS, 50),
  /** Rows returned for the on-screen preview. The exported report still returns every row. */
  previewRowLimit: num(process.env.PREVIEW_ROW_LIMIT, 200),
  queryTimeoutMs: num(process.env.QUERY_TIMEOUT_SECONDS, 60) * 1000,
  /** Optional allow-list of SQL Server host names, e.g. "sqlprod01,sqlrep02". Empty = any. */
  /** ODBC driver used for "This computer" (Windows) sign-in to a local SQL Server. */
  odbcDriver: process.env.ODBC_DRIVER || "ODBC Driver 18 for SQL Server",
  allowedServers: (process.env.ALLOWED_SERVERS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
};
