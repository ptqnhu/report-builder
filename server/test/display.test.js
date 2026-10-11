import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TPL, formatValue, displayOf, DISPLAY_OPTIONS } from "@report-builder/shared";
import { netFormat } from "../src/rdl/styles.js";
import { excelFormat } from "../src/export/xlsx.js";

const tpl = { ...DEFAULT_TPL, currency: "$", decimals: 2, dateFormat: "D MMM YYYY" };
const col = (type, display, name = "amount") => ({ type, display, name });

test("number display options: preview text and the matching .NET format", () => {
  const cases = [
    // [type, display, value, preview, .NET format]
    ["Currency", "auto", -1234.5, "-$1,234.50", "'$'#,0.00;-'$'#,0.00"],
    ["Currency", "n0", 1234.5, "$1,235", "'$'#,0;-'$'#,0"],
    ["Currency", "paren", -1234.5, "($1,234.50)", "'$'#,0.00;('$'#,0.00)"],
    ["Currency", "k", 41275751.21, "$41,275.8K", "'$'#,0,.0\"K\";-'$'#,0,.0\"K\""],
    ["Currency", "m", -41275751.21, "-$41.3M", "'$'#,0,,.0\"M\";-'$'#,0,,.0\"M\""],
    ["Decimal", "n3", 1234.5678, "1,234.568", "#,0.000"],
    ["Integer", "auto", 12345, "12,345", "#,0"],
    ["Integer", "plain", 12345, "12345", "0"],
    ["Percentage", "auto", 0.12345, "12.35%", "0.00%"],
    ["Percentage", "p0", 0.12345, "12%", "0%"],
    ["Percentage", "ratio", 0.12345, "0.1235", "0.0000"],
  ];
  for (const [type, display, v, text, net] of cases) {
    assert.equal(formatValue(v, col(type, display), tpl), text, `${type}/${display}`);
    assert.equal(netFormat(col(type, display), tpl), net, `${type}/${display} format`);
  }
  assert.equal(formatValue(12345, col("Integer", "auto", "order_id"), tpl), "12345"); // IDs keep no separators
  assert.equal(formatValue(-0.001, col("Currency", "n0"), tpl), "$0"); // no "-$0"
});

test("dates, yes/no and text", () => {
  const d = new Date(2026, 2, 14, 15, 30);
  assert.equal(formatValue(d, col("Date", "auto"), tpl), "14 Mar 2026");
  assert.equal(formatValue(d, col("Date", "YYYY-MM-DD"), tpl), "2026-03-14");
  assert.equal(formatValue(d, col("Date", "MMM YYYY"), tpl), "Mar 2026");
  assert.equal(netFormat(col("Date", "MMM YYYY"), tpl), "MMM yyyy");
  assert.equal(formatValue(d, col("DateTime", "auto"), tpl), "14 Mar 2026 15:30");
  assert.equal(formatValue(d, col("DateTime", "date"), tpl), "14 Mar 2026");
  assert.equal(formatValue(d, col("DateTime", "time"), tpl), "15:30");
  assert.equal(netFormat(col("DateTime", "time"), tpl), "HH:mm");
  // with seconds: the preview, the .rdl and Excel all agree
  const ds = new Date(2026, 2, 14, 15, 30, 45);
  assert.equal(formatValue(ds, col("DateTime", "auto"), tpl), "14 Mar 2026 15:30");
  assert.equal(formatValue(ds, col("DateTime", "seconds"), tpl), "14 Mar 2026 15:30:45");
  assert.equal(formatValue(ds, col("DateTime", "timesec"), tpl), "15:30:45");
  assert.equal(netFormat(col("DateTime", "seconds"), tpl), "d MMM yyyy HH:mm:ss");
  assert.equal(netFormat(col("DateTime", "timesec"), tpl), "HH:mm:ss");
  assert.equal(excelFormat(col("DateTime", "seconds"), tpl), "d mmm yyyy hh:mm:ss");
  assert.equal(excelFormat(col("DateTime", "timesec"), tpl), "hh:mm:ss");
  assert.equal(formatValue(false, col("Boolean", "tf"), tpl), "False");
  assert.equal(formatValue(false, col("Boolean", "check"), tpl), "");
  assert.equal(formatValue("West Coast", col("Text", "upper"), tpl), "WEST COAST");
  // an option the type doesn't have (e.g. after a type change) falls back to the default
  assert.equal(displayOf(col("Percentage", "k")), "auto");
  assert.ok(Object.values(DISPLAY_OPTIONS).every((opts) => opts[0][0] === "auto"));
});
