import { HttpError } from "../../lib/errors.js";
import { settings } from "../../lib/config.js";

/** "SQLPROD01\SALES" -> instance; "sql01.corp.local,1433" -> port. */
export function parseServer(raw) {
  let s = String(raw ?? "").trim().replace(/^tcp:/i, "");
  if (!s) throw new HttpError(400, "Enter the SQL Server name.");
  let port, instanceName;
  const withPort = s.match(/^(.*),(\d{1,5})$/);
  if (withPort) { s = withPort[1]; port = Number(withPort[2]); }
  const slash = s.indexOf("\\");
  if (slash >= 0) { instanceName = s.slice(slash + 1); s = s.slice(0, slash); }
  if (!/^[\w.\-]+$/.test(s)) throw new HttpError(400, "The server name contains characters that aren't allowed.");
  if (instanceName !== undefined && !/^[\w$\-]+$/.test(instanceName)) throw new HttpError(400, "The instance name contains characters that aren't allowed.");
  return { host: s, port, instanceName };
}

export const isLocalHost = (host) => /^(localhost|127\.0\.0\.1|::1|\.|\(local\))$/i.test(host);

/** ODBC connection string value, braced so ; and } in names can't inject extra settings. */
const odbcValue = (v) => `{${String(v).replace(/}/g, "}}")}}`;

/**
 * Validates what the user typed and builds the mssql connection config.
 * authType "local" signs in as the Windows account running this app, so it is only allowed for a
 * SQL Server on this computer and only when the request itself comes from this computer (`fromThisComputer`).
 * Returns { config, summary }. The summary is safe to send back to the browser (no password).
 */
export function buildConfig(input = {}, { fromThisComputer = false } = {}) {
  const { host, port, instanceName } = parseServer(input.server);
  if (settings.allowedServers.length && !settings.allowedServers.includes(host.toLowerCase()))
    throw new HttpError(403, `This app isn't allowed to connect to ${host}. Ask your administrator to add it to ALLOWED_SERVERS.`);

  const database = String(input.database ?? "").trim();
  if (!database) throw new HttpError(400, "Enter the database name.");
  if (database.length > 128) throw new HttpError(400, "The database name is too long.");

  if (input.authType === "local") {
    if (!isLocalHost(host)) throw new HttpError(400, "Signing in as this computer only works for a SQL Server on this computer.");
    if (!fromThisComputer) throw new HttpError(403, "Signing in as this computer is only allowed from the computer running the app.");
    const target = `${host}${instanceName ? `\\${instanceName}` : ""}${port ? `,${port}` : ""}`;
    const connectionString = [
      `Driver=${odbcValue(settings.odbcDriver)}`, `Server=${odbcValue(target)}`, `Database=${odbcValue(database)}`,
      "Trusted_Connection=yes", `Encrypt=${input.encrypt === false ? "no" : "yes"}`,
      `TrustServerCertificate=${input.trustServerCertificate ? "yes" : "no"}`, "APP=Report builder",
    ].join(";") + ";";
    return {
      config: { driver: "msnodesqlv8", connectionString, pool: { max: 4, min: 0, idleTimeoutMillis: 30_000 }, connectionTimeout: 15_000, requestTimeout: settings.queryTimeoutMs },
      summary: { server: String(input.server).trim(), database, authType: "local", user: "" }, // user filled in after sign-in
    };
  }

  const authType = input.authType === "windows" ? "windows" : "sql";
  let user = String(input.user ?? "").trim();
  const password = String(input.password ?? "");
  if (!user) throw new HttpError(400, "Enter the user name.");

  const config = {
    server: host,
    database,
    options: {
      encrypt: input.encrypt !== false,
      trustServerCertificate: !!input.trustServerCertificate,
      appName: "Report builder",
      ...(instanceName ? { instanceName } : {}),
    },
    pool: { max: 4, min: 0, idleTimeoutMillis: 30_000 },
    connectionTimeout: 15_000,
    requestTimeout: settings.queryTimeoutMs,
  };
  if (port) config.port = port;

  let displayUser = user;
  if (authType === "windows") {
    let domain = String(input.domain ?? "").trim();
    const backslash = user.match(/^([^\\]+)\\(.+)$/);
    const upn = user.match(/^([^@]+)@(.+)$/);
    if (backslash) { domain = backslash[1]; user = backslash[2]; }
    else if (upn) { user = upn[1]; domain = upn[2]; }
    if (!domain) throw new HttpError(400, "Enter the Windows user as DOMAIN\\name or name@domain.");
    config.authentication = { type: "ntlm", options: { domain, userName: user, password } };
    displayUser = `${domain}\\${user}`;
  } else {
    config.user = user;
    config.password = password;
  }

  return { config, summary: { server: String(input.server).trim(), database, authType, user: displayUser } };
}
