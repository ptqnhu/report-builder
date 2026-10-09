/** Pulls SQL Server's own message out of an mssql error. */
export function sqlErrorMessage(e) {
  const m = e?.originalError?.info?.message || e?.precedingErrors?.[0]?.message || e?.message || String(e);
  return `SQL Server says: ${m}`;
}

/** Turns connection failures into advice the user can act on. Never includes credentials. */
export function friendlyConnectError(e) {
  const msg = String(e?.message || e);
  if (/login failed/i.test(msg)) return "Login failed. Check the user name and password.";
  if (/cannot open database/i.test(msg)) return "The login worked, but that database can't be opened. Check the database name and that the user has access to it.";
  if (/self[- ]signed|certificate/i.test(msg)) return "The server's certificate isn't trusted. For an internal server, turn on “Trust server certificate” under Connection options.";
  if (/ETIMEOUT|timeout|ESOCKET|ENOTFOUND|ECONNREFUSED|getaddrinfo|instance/i.test(msg))
    return "Couldn't reach the server. Check the server name, instance or port, and that the server accepts remote connections.";
  return `Couldn't connect. ${msg}`;
}
