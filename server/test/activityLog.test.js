import { test } from "node:test";
import assert from "node:assert/strict";
import { createActivityLog, logConfig } from "../src/services/activityLog.js";

/** A pool that records each query with its parameters. */
function logPool() {
  const queries = [];
  const pool = {
    queries,
    closed: false,
    request() {
      const inputs = {};
      return { input(name, value) { inputs[name] = value; }, async query(q) { queries.push({ q, inputs }); return {}; } };
    },
    async close() { pool.closed = true; },
  };
  return pool;
}

test("the activity log creates its tables once, then inserts sign-ins and AI requests with parameters", async () => {
  const pool = logPool();
  let connects = 0;
  const log = createActivityLog({ connect: async () => { connects++; return pool; }, config: {} });
  await log.signIn({ ServerName: "localhost", DatabaseName: "AdventureWorks2022", AuthType: "local", Succeeded: true });
  await log.aiRequest({ Request: "top products'; DROP TABLE x --", Turn: 1, DurationMs: 5, Succeeded: true });

  assert.equal(connects, 1);
  assert.match(pool.queries[0].q, /CREATE TABLE dbo\.SignInLog[\s\S]*CREATE TABLE dbo\.AiRequestLog/);
  assert.match(pool.queries[1].q, /^INSERT INTO dbo\.SignInLog \(/);
  assert.equal(pool.queries[1].inputs.DatabaseName, "AdventureWorks2022");
  assert.equal(pool.queries[1].inputs.ErrorMessage, null);
  assert.match(pool.queries[2].q, /^INSERT INTO dbo\.AiRequestLog \(/);
  assert.doesNotMatch(pool.queries[2].q, /DROP/);
  assert.equal(pool.queries[2].inputs.Request, "top products'; DROP TABLE x --");

  await log.close();
  assert.ok(pool.closed);
});

test("the activity log never throws when the log database is down, and retries the connection", async (t) => {
  t.mock.method(console, "error", () => {});
  let connects = 0;
  const log = createActivityLog({ connect: async () => { connects++; throw new Error("down"); }, config: {} });
  await log.signIn({ Succeeded: false });
  await log.signIn({ Succeeded: false });
  assert.equal(connects, 2);
  assert.equal(console.error.mock.callCount(), 1);
});

test("the log database signs in as this computer unless LOG_USER is set", () => {
  assert.equal(logConfig({ LOG_DATABASE: "ReportBuilderLog" }).driver, "msnodesqlv8");
  const sql = logConfig({ LOG_SERVER: "sqllog01", LOG_DATABASE: "ReportBuilderLog", LOG_USER: "rb", LOG_PASSWORD: "pw" });
  assert.equal(sql.user, "rb");
  assert.equal(sql.options.trustServerCertificate, false);
});
