import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TPL, DEFAULT_EXPORT, effectiveColumns, keyBy } from "@report-builder/shared";
import { fakePool, describeRow } from "./helpers/fakeSqlServer.js";
import { describeQuery } from "../src/services/db/describe.js";
import { buildRdl, validateExport, exportWarnings } from "../src/rdl/buildRdl.js";

const SQL = "SELECT order_id, status, order_date, is_paid, revenue, discount_rate FROM dbo.Orders";
const columns = await describeQuery(fakePool({ describe: [
  describeRow(1, "order_id", "int"), describeRow(2, "status", "nvarchar(20)"), describeRow(3, "order_date", "date"),
  describeRow(4, "is_paid", "bit"), describeRow(5, "revenue", "decimal(12,2)"), describeRow(6, "discount_rate", "decimal(5,4)"),
] }), SQL);

function build(over = {}) {
  const tpl = { ...DEFAULT_TPL, rowNumbers: true, org: "Acme & Co", footer: "=not an expression" };
  const effCols = effectiveColumns(columns, tpl);
  const k = (n) => effCols.find((c) => c.name === n).key;
  const filters = [
    { id: "1", col: k("status"), op: "contains", value: 'Ship"d', value2: "" },
    { id: "2", col: k("revenue"), op: "between", value: "10", value2: "500" },
    { id: "3", col: k("order_date"), op: "after", value: "2026-02-01", value2: "" },
    { id: "4", col: k("is_paid"), op: "true", value: "", value2: "" },
  ];
  const exp = { ...DEFAULT_EXPORT, server: "sql01", database: "Shop", ...over };
  return buildRdl({ sql: SQL, columns, effCols, tpl, title: "Orders", desc: "", filters, colsByKey: keyBy(effCols), sort: { key: k("revenue"), dir: "desc" }, exp });
}

const balanced = (xml) => {
  const stack = [];
  for (const m of xml.replace(/<\?xml[^>]*\?>/, "").matchAll(/<(\/?)([\w:]+)[^>]*?(\/?)>/g)) {
    if (m[3]) continue;
    if (m[1]) { if (stack.pop() !== m[2]) return false; } else stack.push(m[2]);
  }
  return stack.length === 0;
};

test("builds balanced XML for both schemas and filter modes", () => {
  for (const schema of ["2016", "2010"]) for (const filterMode of ["fixed", "params"]) {
    const xml = build({ schema, filterMode });
    assert.ok(balanced(xml), `${schema}/${filterMode} is not well-formed`);
    assert.doesNotMatch(xml, /undefined|NaN/);
  }
});

test("data source: Windows uses integrated security; SQL login leaves credentials to the server", () => {
  assert.match(build({ dsAuth: "windows" }), /<IntegratedSecurity>true<\/IntegratedSecurity>.*<rd:SecurityType>Integrated/s);
  const sqlAuth = build({ dsAuth: "sql" });
  assert.doesNotMatch(sqlAuth, /IntegratedSecurity/);
  assert.match(sqlAuth, /<rd:SecurityType>DataBase<\/rd:SecurityType>/);
  assert.match(build({ dsMode: "shared", dsRef: "/Data Sources/Shop" }), /<DataSourceReference>\/Data Sources\/Shop<\/DataSourceReference>/);
});

test("fixed filters are embedded; parameter mode creates report parameters", () => {
  assert.match(build({ filterMode: "fixed" }), /<Operator>Between<\/Operator>/);
  const p = build({ filterMode: "params" });
  assert.match(p, /<ReportParameter Name="P_revenue_From">/);
  assert.match(p, /<ReportParametersLayout>/);
  assert.doesNotMatch(build({ filterMode: "params", schema: "2010" }), /ReportParametersLayout/);
});

test("sort, formats and escaping", () => {
  const xml = build();
  assert.match(xml, /<Direction>Descending<\/Direction>/);
  assert.match(xml, /<Format>'\$'#,0\.00;-'\$'#,0\.00<\/Format>/);
  assert.match(xml, /<Format>0\.00%<\/Format>/);
  assert.match(xml, /Acme &amp; Co/);
  assert.match(xml, /=&quot;=not an expression&quot;/);
});

test("export settings and warnings", () => {
  assert.ok(validateExport({ ...DEFAULT_EXPORT }));
  assert.equal(validateExport({ ...DEFAULT_EXPORT, server: "s", database: "d" }), "");
  assert.equal(exportWarnings([{ name: "Column3", unnamed: true }])[0].startsWith("Column 3 has no name"), true);
});
