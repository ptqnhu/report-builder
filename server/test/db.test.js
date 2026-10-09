import { test } from "node:test";
import assert from "node:assert/strict";
import { fakePool, describeRow } from "./helpers/fakeSqlServer.js";
import { describeQuery } from "../src/services/db/describe.js";
import { previewQuery } from "../src/services/db/preview.js";
import { analyzeQuery } from "../src/services/analyze.js";
import { serializeValue } from "../src/services/db/serialize.js";

test("describe maps SQL Server metadata to columns", async () => {
  const pool = fakePool({ describe: [
    describeRow(2, "revenue", "decimal(12,2)"),
    describeRow(1, "order_id", "int"),
    describeRow(3, null, "int"),
    describeRow(4, "order_id", "int"),
    describeRow(5, "hidden", "int", { is_hidden: true }),
  ] });
  const cols = await describeQuery(pool, "SELECT ...");
  assert.deepEqual(cols.map((c) => [c.name, c.type, c.index]), [["order_id", "Integer", 0], ["revenue", "Currency", 1], ["Column3", "Integer", 2], ["order_id_2", "Integer", 3]]);
  assert.equal(cols[2].unnamed, true);
  assert.equal(cols[3].dup, true);
  assert.deepEqual(pool.log.inputs[0], ["tsql", "SELECT ..."]);
});

test("describe turns SQL errors into readable 422s", async () => {
  const err = Object.assign(new Error("x"), { originalError: { info: { message: "Invalid object name 'nope'." } } });
  await assert.rejects(describeQuery(fakePool({ describe: err }), "SELECT * FROM nope"), (e) => e.status === 422 && /Invalid object name/.test(e.message));
});

test("analyze refuses non-SELECT queries before touching the database", async () => {
  const pool = fakePool();
  await assert.rejects(analyzeQuery(pool, "UPDATE t SET a = 1"), (e) => e.status === 422);
  assert.equal(pool.log.queries.length, 0);
});

test("preview stops at the row limit, cancels and always rolls back", async () => {
  const rows = Array.from({ length: 50 }, (_, i) => [i, `name ${i}`]);
  const pool = fakePool({ stream: { columns: ["id", "name"], rows } });
  const r = await previewQuery(pool, "SELECT id, name FROM t", { limit: 10 });
  assert.equal(r.rows.length, 10);
  assert.equal(r.truncated, true);
  assert.equal(pool.log.begun, 1);
  assert.equal(pool.log.rolledBack, 1);
});

test("preview returns everything when under the limit", async () => {
  const pool = fakePool({ stream: { columns: ["id"], rows: [[1], [2]] } });
  const r = await previewQuery(pool, "SELECT id FROM t", { limit: 10 });
  assert.deepEqual(r.rows, [[1], [2]]);
  assert.equal(r.truncated, false);
});

test("preview reports SQL errors and timeouts, and still rolls back", async () => {
  const failing = fakePool({ stream: { error: new Error("Divide by zero error encountered.") } });
  await assert.rejects(previewQuery(failing, "SELECT 1/0 AS x"), (e) => e.status === 422 && /Divide by zero/.test(e.message));
  assert.equal(failing.log.rolledBack, 1);

  const slow = fakePool({ stream: { hang: true } });
  await assert.rejects(previewQuery(slow, "SELECT * FROM huge", { timeoutMs: 30 }), (e) => e.status === 504);
  assert.equal(slow.log.rolledBack, 1);
});

test("dates keep the value stored in the database", () => {
  assert.equal(serializeValue(new Date(Date.UTC(2026, 2, 14, 9, 5, 0))), "2026-03-14T09:05:00");
  assert.equal(serializeValue(Buffer.from("x")), "(binary data)");
  assert.equal(serializeValue(null), null);
});
