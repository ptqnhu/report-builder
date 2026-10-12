import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSchema } from "../src/services/ai/schema.js";
import { writeQuery } from "../src/services/ai/queryWriter.js";

/** A pool whose first query returns the columns and second the foreign keys. */
function schemaPool(cols, keys = []) {
  const queries = [];
  return {
    queries,
    request: () => ({ async query(q) { queries.push(q); return { recordset: queries.length === 1 ? cols : keys }; } }),
  };
}

/** A stand-in for the Anthropic client that records the request and returns a canned answer. */
function fakeClient(answer, { stop_reason = "end_turn" } = {}) {
  const calls = [];
  return {
    calls,
    beta: { messages: { async create(req) { calls.push(req); return { stop_reason, content: [{ type: "text", text: JSON.stringify(answer) }] }; } } },
  };
}

test("schema lists tables, views, columns and foreign keys, and is read once per pool", async () => {
  const pool = schemaPool([
    { sch: "dbo", obj: "Customers", kind: "U ", col: "Id", type: "int" },
    { sch: "dbo", obj: "Customers", kind: "U ", col: "Name", type: "nvarchar" },
    { sch: "dbo", obj: "Loans", kind: "U ", col: "CustomerId", type: "int" },
    { sch: "rpt", obj: "ActiveLoans", kind: "V ", col: "LoanId", type: "int" },
  ], [{ fromTable: "dbo.Loans", fromCol: "CustomerId", toTable: "dbo.Customers", toCol: "Id" }]);
  const text = await loadSchema(pool, { maxChars: 10_000 });
  assert.equal(text, [
    "dbo.Customers (table): Id int, Name nvarchar",
    "dbo.Loans (table): CustomerId int",
    "rpt.ActiveLoans (view): LoanId int",
    "",
    "Foreign keys:",
    "dbo.Loans.CustomerId -> dbo.Customers.Id",
  ].join("\n"));
  await loadSchema(pool, { maxChars: 10_000 });
  assert.equal(pool.queries.length, 2);
});

test("schema refuses databases too large to send, and empty ones", async () => {
  const cols = [{ sch: "dbo", obj: "T", kind: "U", col: "A", type: "int" }];
  await assert.rejects(loadSchema(schemaPool(cols), { maxChars: 5 }), (e) => e.status === 413);
  await assert.rejects(loadSchema(schemaPool([]), { maxChars: 5 }), (e) => e.status === 422);
});

test("writeQuery caches the schema prompt, asks for JSON and returns the query", async () => {
  const client = fakeClient({ sql: " SELECT 1 AS One ", explanation: "Returns one." });
  const out = await writeQuery({ schema: "dbo.T (table): A int", database: "Sales", messages: [{ role: "user", content: "one" }] },
    { model: "claude-opus-5-5", effort: "high", client });
  assert.deepEqual(out, { sql: "SELECT 1 AS One", explanation: "Returns one." });
  const req = client.calls[0];
  assert.equal(req.model, "claude-opus-5-5");
  assert.equal(req.output_config.format.type, "json_schema");
  assert.deepEqual(req.system.at(-1).cache_control, { type: "ephemeral" });
  assert.match(req.system.at(-1).text, /Database: Sales[\s\S]*dbo\.T \(table\)/);
});

test("writeQuery reports refusals and cut-off answers", async () => {
  const input = { schema: "x", database: "d", messages: [{ role: "user", content: "q" }] };
  await assert.rejects(writeQuery(input, { client: fakeClient({}, { stop_reason: "refusal" }) }), (e) => e.status === 422);
  await assert.rejects(writeQuery(input, { client: fakeClient({}, { stop_reason: "max_tokens" }) }), (e) => e.status === 502);
});
