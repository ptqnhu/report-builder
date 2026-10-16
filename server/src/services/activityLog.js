import { buildConfig, parseServer, isLocalHost } from "./db/connectionConfig.js";

// Who signs in and what they ask the AI assistant, written to a separate SQL Server database for later analysis.
// The tables are created on first use; the database itself must already exist.
const TABLES_SQL = `
IF OBJECT_ID('dbo.SignInLog', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SignInLog (
    Id            bigint IDENTITY PRIMARY KEY,
    LoggedAt      datetime2(3)   NOT NULL CONSTRAINT DF_SignInLog_LoggedAt DEFAULT SYSUTCDATETIME(),
    ConnectionId  uniqueidentifier NULL,
    ServerName    nvarchar(256)  NOT NULL,
    DatabaseName  nvarchar(128)  NOT NULL,
    AuthType      varchar(16)    NOT NULL,
    LoginName     nvarchar(256)  NULL,
    ClientIp      varchar(45)    NULL,
    ServerVersion nvarchar(64)   NULL,
    Succeeded     bit            NOT NULL,
    ErrorMessage  nvarchar(4000) NULL
  );
  CREATE INDEX IX_SignInLog_LoggedAt ON dbo.SignInLog (LoggedAt);
END;
IF OBJECT_ID('dbo.AiRequestLog', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.AiRequestLog (
    Id            bigint IDENTITY PRIMARY KEY,
    LoggedAt      datetime2(3)   NOT NULL CONSTRAINT DF_AiRequestLog_LoggedAt DEFAULT SYSUTCDATETIME(),
    ConnectionId  uniqueidentifier NULL,
    ServerName    nvarchar(256)  NULL,
    DatabaseName  nvarchar(128)  NULL,
    LoginName     nvarchar(256)  NULL,
    ClientIp      varchar(45)    NULL,
    Turn          int            NOT NULL,
    Request       nvarchar(max)  NOT NULL,
    EditorSql     nvarchar(max)  NULL,
    SchemaSource  varchar(16)    NULL,
    SchemaChars   int            NULL,
    Backend       varchar(16)    NULL,
    Model         nvarchar(64)   NULL,
    Effort        varchar(16)    NULL,
    ResultSql     nvarchar(max)  NULL,
    Explanation   nvarchar(max)  NULL,
    DurationMs    int            NOT NULL,
    Succeeded     bit            NOT NULL,
    ErrorStatus   int            NULL,
    ErrorMessage  nvarchar(4000) NULL
  );
  CREATE INDEX IX_AiRequestLog_LoggedAt ON dbo.AiRequestLog (LoggedAt);
END;`;

const COLUMNS = {
  SignInLog: ["ConnectionId", "ServerName", "DatabaseName", "AuthType", "LoginName", "ClientIp", "ServerVersion", "Succeeded", "ErrorMessage"],
  AiRequestLog: ["ConnectionId", "ServerName", "DatabaseName", "LoginName", "ClientIp", "Turn", "Request", "EditorSql", "SchemaSource",
    "SchemaChars", "Backend", "Model", "Effort", "ResultSql", "Explanation", "DurationMs", "Succeeded", "ErrorStatus", "ErrorMessage"],
};

/** Logging that does nothing, used when LOG_DATABASE isn't set. */
export const noActivityLog = { signIn() {}, aiRequest() {}, close: async () => {} };

/**
 * The mssql config for the log database from LOG_SERVER (default localhost), LOG_DATABASE, LOG_USER and LOG_PASSWORD.
 * Without LOG_USER it signs in as the Windows account running the app, which only works for a SQL Server on this computer.
 */
export function logConfig(env = process.env) {
  const server = env.LOG_SERVER || "localhost";
  const trust = env.LOG_TRUST_SERVER_CERTIFICATE ? env.LOG_TRUST_SERVER_CERTIFICATE === "true" : isLocalHost(parseServer(server).host);
  const input = { server, database: env.LOG_DATABASE, trustServerCertificate: trust };
  return buildConfig(env.LOG_USER ? { ...input, authType: "sql", user: env.LOG_USER, password: env.LOG_PASSWORD } : { ...input, authType: "local" },
    { fromThisComputer: true }).config;
}

/**
 * Writes sign-ins and AI requests to the log database. Writes happen in the background and never fail a request:
 * if the log database can't be reached, the error is printed and the app carries on.
 * @param {{connect: (config) => Promise<pool>, config: object}} deps
 */
export function createActivityLog({ connect, config }) {
  let ready = null;
  let warned = false;

  const pool = () => (ready ??= (async () => {
    const p = await connect(config);
    await p.request().query(TABLES_SQL);
    return p;
  })().catch((e) => { ready = null; throw e; }));

  async function insert(table, entry) {
    const cols = COLUMNS[table];
    const req = (await pool()).request();
    cols.forEach((c) => req.input(c, entry[c] ?? null));
    await req.query(`INSERT INTO dbo.${table} (${cols.join(", ")}) VALUES (${cols.map((c) => `@${c}`).join(", ")})`);
    warned = false;
  }

  const write = (table, entry) => insert(table, entry).catch((e) => {
    if (!warned) console.error(`Couldn't write to the activity log (${table}):`, e.message);
    warned = true;
  });

  return {
    signIn: (entry) => write("SignInLog", entry),
    aiRequest: (entry) => write("AiRequestLog", entry),
    async close() {
      if (!ready) return;
      try { await (await ready).close(); } catch { /* never opened */ }
    },
  };
}
