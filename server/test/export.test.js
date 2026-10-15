import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { DEFAULT_TPL, effectiveColumns, coerce } from "@report-builder/shared";
import { toCsv } from "../src/export/csv.js";
import { toXlsx, excelFormat, colLetter } from "../src/export/xlsx.js";
import { toPdf } from "../src/export/pdf.js";
import { createApp } from "../src/app.js";
import { fakePool } from "./helpers/fakeSqlServer.js";

/** Files in a zip, read from the central directory: { name: text }. */
function unzip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(end + 16);
  const out = {};
  for (let n = buf.readUInt16LE(end + 10); n > 0; n--) {
    const size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    out[name] = inflateRawSync(buf.subarray(start, start + size)).toString("utf8");
    p += 46 + nameLen;
  }
  return out;
}

const columns = [
  { key: "a", name: "order_id", type: "Integer", selected: true },
  { key: "b", name: "customer", type: "Text", selected: true },
  { key: "c", name: "order_date", type: "Date", selected: true },
  { key: "d", name: "revenue", type: "Currency", selected: true },
  { key: "e", name: "is_paid", type: "Boolean", selected: true },
  { key: "f", name: "secret", type: "Text", selected: false },
];
const raw = [
  [2, 'Smith, "Jo" & <Co>', "2026-03-14T00:00:00", -1234.5, true, "x"],
  [1, "Ana", null, 99, false, "y"],
];
const rowsOf = (cols) => raw.map((arr) => Object.fromEntries(columns.map((c, i) => [c.key, coerce(arr[i], c.type)])));

test("Excel number and date formats follow the display choices", () => {
  const tpl = { ...DEFAULT_TPL, currency: "$", dateFormat: "YYYY-MM-DD" };
  const f = (type, display, name = "amount") => excelFormat({ type, display, name }, tpl);
  assert.equal(f("Currency", "auto"), '"$"#,##0.00;-"$"#,##0.00');
  assert.equal(f("Currency", "paren"), '"$"#,##0.00;("$"#,##0.00)');
  assert.equal(f("Integer", "auto", "order_id"), "0");
  assert.equal(f("Decimal", "k"), '#,##0.0,"K"');
  assert.equal(f("Percentage", "p1"), "0.0%");
  assert.equal(f("Date", "auto"), "yyyy-mm-dd");
  assert.equal(f("DateTime", "auto"), "yyyy-mm-dd hh:mm");
  assert.equal(f("Text", "auto"), "");
  assert.deepEqual([0, 25, 26, 701, 702].map(colLetter), ["A", "Z", "AA", "ZZ", "AAA"]);
});

test("CSV has a BOM, the labels, quoted values and only the selected columns", () => {
  const cols = effectiveColumns(columns, DEFAULT_TPL);
  const csv = toCsv(cols, rowsOf(cols), DEFAULT_TPL);
  assert.ok(csv.startsWith("﻿Order ID,Customer,Order Date,Revenue,Is Paid\r\n"));
  assert.match(csv, /^2,"Smith, ""Jo"" & <Co>",03\/14\/2026,"-\$1,234\.50",Yes\r$/m);
  assert.match(csv, /^1,Ana,,\$99\.00,No\r$/m);
  assert.doesNotMatch(csv, /secret|Secret/);
});

test("xlsx is a valid package with typed cells and a frozen, filterable header", async () => {
  const cols = effectiveColumns(columns, DEFAULT_TPL);
  const files = unzip(await toXlsx(cols, rowsOf(cols), DEFAULT_TPL, "Orders: Q1/Q2"));
  assert.deepEqual(Object.keys(files).sort(), ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]);
  assert.match(files["xl/workbook.xml"], /<sheet name="Orders  Q1 Q2"/);
  const sheet = files["xl/worksheets/sheet1.xml"];
  assert.match(sheet, /<c r="A1" s="1" t="inlineStr"><is><t xml:space="preserve">Order ID<\/t>/);
  assert.match(sheet, /<c r="B2" t="inlineStr"><is><t xml:space="preserve">Smith, &quot;Jo&quot; &amp; &lt;Co&gt;<\/t>/);
  assert.match(sheet, /<c r="C2" s="\d"><v>46095<\/v><\/c>/); // 2026-03-14 as an Excel day number
  assert.match(sheet, /<c r="D2" s="\d"><v>-1234.5<\/v><\/c>/);
  assert.match(sheet, /<c r="E3" s="\d" t="inlineStr"><is><t xml:space="preserve">No<\/t>/);
  assert.match(sheet, /<c r="C3" s="\d"\/>/); // empty date: no value
  assert.match(sheet, /<autoFilter ref="A1:E3"\/>/);
  assert.match(files["xl/styles.xml"], /formatCode="&quot;\$&quot;#,##0.00;-&quot;\$&quot;#,##0.00"/);
});

test("LoanMart style: green band with logo across every column, gold stripe, branded header and a SUBTOTAL totals row", async () => {
  const cols = effectiveColumns(columns, DEFAULT_TPL);
  const files = unzip(await toXlsx(cols, rowsOf(cols), DEFAULT_TPL, "Orders", { style: "loanmart" }));
  const sheet = files["xl/worksheets/sheet1.xml"];
  assert.doesNotMatch(sheet, /LOANMART/); // no organisation line by default
  assert.match(sheet, /<t xml:space="preserve">Orders<\/t>/);
  assert.doesNotMatch(sheet, /Rows:|Revenue:/); // no summary figures in the band
  assert.match(sheet, /<mergeCell ref="A1:[A-Z]+1"\/>/);
  assert.match(sheet, /showGridLines="0"/);
  const head = Number(sheet.match(/<c r="A(\d+)"[^>]*t="inlineStr"><is><t xml:space="preserve">Order ID</)[1]);
  assert.match(sheet, new RegExp(`<pane ySplit="${head}" topLeftCell="A${head + 1}"`));
  assert.match(sheet, new RegExp(`<autoFilter ref="A${head}:E${head + 2}"/>`));
  assert.match(sheet, new RegExp(`<f>SUBTOTAL\\(109,D${head + 1}:D${head + 2}\\)</f><v>-1135.5</v>`)); // revenue; order_id isn't totalled
  assert.match(sheet, /<drawing r:id="rId1"\/>/);
  assert.match(files["xl/styles.xml"], /<gradientFill degree="0"><stop position="0"><color rgb="FF0F5131"\/>/);
  assert.match(files["xl/styles.xml"], /rgb="FFF5C518"/);
  assert.ok(files["xl/media/logo.png"]);
  assert.match(files["xl/drawings/_rels/drawing1.xml.rels"], /media\/logo\.png/);

  const plain = unzip(await toXlsx(cols, rowsOf(cols), DEFAULT_TPL, "Orders"));
  assert.ok(!plain["xl/media/logo.png"]);
  assert.doesNotMatch(plain["xl/worksheets/sheet1.xml"], /mergeCell/);
  // the totals row follows tpl.totals in both styles
  assert.match(plain["xl/worksheets/sheet1.xml"], /<t xml:space="preserve">Total<\/t>.*<f>SUBTOTAL\(109,D2:D3\)<\/f>/);
  for (const style of ["plain", "loanmart"]) {
    const off = unzip(await toXlsx(cols, rowsOf(cols), { ...DEFAULT_TPL, totals: false }, "Orders", { style }));
    assert.doesNotMatch(off["xl/worksheets/sheet1.xml"], /SUBTOTAL|>Total</, style);
  }
});

test("PDF: one page for a short table, headings repeated on every page of a long one", async () => {
  const cols = effectiveColumns(columns, DEFAULT_TPL);
  const pages = (buf) => (buf.toString("latin1").match(/\/Type \/Page\b/g) || []).length;
  for (const style of ["loanmart", "plain"]) {
    const short = await toPdf(cols, rowsOf(cols), DEFAULT_TPL, "Orders", { style });
    assert.equal(short.subarray(0, 5).toString(), "%PDF-");
    assert.equal(pages(short), 1);
    const many = Array.from({ length: 200 }, (_, i) => ({ ...rowsOf(cols)[i % 2], a: i }));
    assert.ok(pages(await toPdf(cols, many, DEFAULT_TPL, "Orders", { style })) >= 5);
  }
});

async function withServer(pool, fn) {
  const connections = { get: (id) => { if (id !== "conn1") throw Object.assign(new Error("expired"), { status: 410 }); return { pool }; }, size: () => 1 };
  const server = createApp({ connections }).listen(0);
  await new Promise((r) => server.once("listening", r));
  try { await fn(`http://127.0.0.1:${server.address().port}/api/export`); }
  finally { server.close(); }
}
const post = (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("POST /api/export returns every row, sorted, as an attachment", async () => {
  const pool = fakePool({ stream: { columns: columns.map((c) => c.name), rows: raw } });
  await withServer(pool, async (url) => {
    const body = { connectionId: "conn1", sql: "SELECT * FROM orders", columns, tpl: DEFAULT_TPL, title: "Orders", sort: { key: "a", dir: "asc" } };
    const csv = await post(url, { ...body, format: "csv" });
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get("content-disposition"), /filename="orders\.csv"/);
    assert.equal(csv.headers.get("x-export-rows"), "2");
    assert.equal(csv.headers.get("x-export-truncated"), "0");
    const lines = (await csv.text()).split("\r\n");
    assert.match(lines[1], /^1,Ana/); // sorted by order_id
    assert.equal(pool.log.rolledBack, 1);

    const xlsx = await post(url, { ...body, format: "xlsx" });
    assert.equal(xlsx.status, 200);
    assert.match(xlsx.headers.get("content-type"), /spreadsheetml/);
    assert.ok(unzip(Buffer.from(await xlsx.arrayBuffer()))["xl/worksheets/sheet1.xml"].includes("Ana"));

    const pdf = await post(url, { ...body, format: "pdf", style: "loanmart" });
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get("content-disposition"), /filename="orders\.pdf"/);
    assert.equal((await pdf.arrayBuffer()).byteLength > 1000, true);

    assert.equal((await post(url, { ...body, format: "docx" })).status, 400);
    assert.equal((await post(url, { ...body, format: "csv", sql: "DELETE FROM orders" })).status, 422);
    assert.equal((await post(url, { ...body, format: "csv", connectionId: "gone" })).status, 410);
  });
});

test("every built-in style makes Excel and PDF files in that style's colours", async () => {
  const cols = effectiveColumns(columns, DEFAULT_TPL);
  const sheet = async (style) => unzip(await toXlsx(cols, rowsOf(cols), DEFAULT_TPL, "Orders", { style }));
  // Ledger: navy headings; Contrast: blue headings; Clean: a navy rule under white headings. All have the title on top.
  for (const [style, color] of [["ledger", "FF18233A"], ["contrast", "FF2D4FD6"], ["clean", "FF18233A"]]) {
    const f = await sheet(style);
    assert.match(f["xl/styles.xml"], new RegExp(`rgb="${color}"`), style);
    assert.match(f["xl/worksheets/sheet1.xml"], /<t xml:space="preserve">Orders<\/t>/, style);
    assert.match(f["xl/worksheets/sheet1.xml"], /SUBTOTAL\(109,D5:D6\)/, style); // header on row 4 under the title, run date and gap
    assert.ok(!f["xl/media/logo.png"], style);
    const pdf = await toPdf(cols, rowsOf(cols), DEFAULT_TPL, "Orders", { style });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", style);
  }
});
