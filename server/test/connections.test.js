import { test } from "node:test";
import assert from "node:assert/strict";
import { buildConfig, parseServer } from "../src/services/db/connectionConfig.js";
import { createConnectionManager } from "../src/services/db/connectionManager.js";
import { parseInstanceNames, serverNameFor } from "../src/services/db/localInstances.js";
import { fakePool } from "./helpers/fakeSqlServer.js";

test("parses server names with instances and ports", () => {
  assert.deepEqual(parseServer("SQLPROD01\\SALES"), { host: "SQLPROD01", port: undefined, instanceName: "SALES" });
  assert.deepEqual(parseServer("sql01.corp.local,14330"), { host: "sql01.corp.local", port: 14330, instanceName: undefined });
  assert.throws(() => parseServer("bad host;"), /aren't allowed/);
});

test("builds SQL login and Windows (NTLM) configs; the summary has no password", () => {
  const sqlLogin = buildConfig({ server: "sql01", database: "Shop", authType: "sql", user: "report_reader", password: "s3cret" });
  assert.equal(sqlLogin.config.user, "report_reader");
  assert.equal(sqlLogin.config.options.encrypt, true);
  assert.doesNotMatch(JSON.stringify(sqlLogin.summary), /s3cret/);

  const win = buildConfig({ server: "sql01\\SALES", database: "Shop", authType: "windows", user: "CORP\\ana", password: "pw" });
  assert.deepEqual(win.config.authentication, { type: "ntlm", options: { domain: "CORP", userName: "ana", password: "pw" } });
  assert.equal(win.config.options.instanceName, "SALES");
  assert.equal(win.summary.user, "CORP\\ana");

  assert.throws(() => buildConfig({ server: "sql01", database: "Shop", authType: "windows", user: "ana" }), /DOMAIN/);
  assert.throws(() => buildConfig({ server: "sql01", authType: "sql", user: "a" }), /database/);
});

test("'this computer' sign-in is local-only and keeps names out of the connection string's syntax", () => {
  const local = buildConfig({ server: "localhost\\SQL2025", database: "Odd;Name}", authType: "local", trustServerCertificate: true }, { fromThisComputer: true });
  assert.equal(local.config.driver, "msnodesqlv8");
  assert.match(local.config.connectionString, /Server=\{localhost\\SQL2025\};Database=\{Odd;Name\}\}\};Trusted_Connection=yes;/);
  assert.match(local.config.connectionString, /TrustServerCertificate=yes/);
  assert.equal(local.summary.authType, "local");

  assert.throws(() => buildConfig({ server: "sql01", database: "Shop", authType: "local" }, { fromThisComputer: true }), /on this computer/);
  assert.throws(() => buildConfig({ server: "localhost", database: "Shop", authType: "local" }), (e) => e.status === 403);
});

test("connection manager opens, looks up, expires and closes pools", async () => {
  let clock = 0;
  const pools = [];
  const mgr = createConnectionManager({ connect: async () => { const p = fakePool(); pools.push(p); return p; }, idleMs: 1000, now: () => clock });
  const { id, info } = await mgr.open({}, { server: "sql01", database: "Shop" });
  assert.equal(info.version, "16.0.1000.6");
  assert.ok(mgr.get(id).pool);

  clock = 500; mgr.get(id); // keeps it alive
  clock = 1200; await mgr.sweep();
  assert.equal(mgr.size(), 1);

  clock = 3000; await mgr.sweep();
  assert.equal(mgr.size(), 0);
  assert.equal(pools[0].log.closed, true);
  assert.throws(() => mgr.get(id), (e) => e.status === 410);
});

test("lists databases with a short-lived pool and closes it", async () => {
  const pool = fakePool({ describe: [{ name: "Sales" }, { name: "Shop" }] });
  const mgr = createConnectionManager({ connect: async () => pool });
  assert.deepEqual(await mgr.listDatabases({}), ["Sales", "Shop"]);
  assert.match(pool.log.queries[0], /HAS_DBACCESS/);
  assert.equal(pool.log.closed, true);
  assert.equal(mgr.size(), 0);
});

test("finds local instance names in reg query output", () => {
  const out = "\r\nHKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL\r\n" +
    "    MSSQLSERVER    REG_SZ    MSSQL16.MSSQLSERVER\r\n    SQLEXPRESS    REG_SZ    MSSQL16.SQLEXPRESS\r\n";
  assert.deepEqual(parseInstanceNames(out).map(serverNameFor), ["localhost", "localhost\\SQLEXPRESS"]);
});

test("connection failures become friendly messages", async () => {
  const mgr = createConnectionManager({ connect: async () => { throw new Error("Login failed for user 'x'."); } });
  await assert.rejects(mgr.open({}, {}), (e) => e.status === 422 && e.message === "Login failed. Check the user name and password.");
});
