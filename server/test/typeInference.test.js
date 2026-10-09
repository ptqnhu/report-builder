import { test } from "node:test";
import assert from "node:assert/strict";
import { fromSqlServerType } from "../src/services/typeInference.js";

test("SQL Server types decide the family", () => {
  const t = (sqlType, name = "x") => fromSqlServerType(sqlType, name)[0];
  assert.equal(t("bit"), "Boolean");
  assert.equal(t("bigint"), "Integer");
  assert.equal(t("money"), "Currency");
  assert.equal(t("date"), "Date");
  assert.equal(t("datetime2(7)"), "DateTime");
  assert.equal(t("nvarchar(100)"), "Text");
  assert.equal(t("uniqueidentifier"), "Text");
  assert.equal(t("decimal(10,2)"), "Decimal");
});

test("names refine decimals into currency or percentages, but never override the SQL type family", () => {
  assert.equal(fromSqlServerType("decimal(10,2)", "unit_price")[0], "Currency");
  assert.equal(fromSqlServerType("decimal(5,4)", "discount_rate")[0], "Percentage");
  assert.equal(fromSqlServerType("nvarchar(20)", "total_amount")[0], "Text");
  assert.match(fromSqlServerType("decimal(10,2)", "revenue")[1], /decimal\(10,2\).*money/);
});
