// The only file that touches the mssql package, so everything else can be tested without a database.

/**
 * Opens a connection pool. Resolves once SQL Server has accepted the login.
 * Windows sign-in on this computer needs the ODBC-based driver; everything else uses tedious.
 */
export async function connectMssql(config) {
  const { default: mssql } = await (config.driver === "msnodesqlv8" ? import("mssql/msnodesqlv8.js") : import("mssql"));
  const pool = new mssql.ConnectionPool(config);
  pool.on("error", (e) => console.error("SQL Server pool error:", e.message));
  await pool.connect();
  return pool;
}
