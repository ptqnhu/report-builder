import {
  NUMERIC, BRAND, LOANMART_LOGO_PNG, LOGO_SIZE, formatValue, numberSpec, dateSpec, booleanLabels, displayOf, idLike, fmtDate,
} from "@report-builder/shared";
import { zip } from "./zip.js";

const EXCEL_DATE = { "D MMM YYYY": "d mmm yyyy", "YYYY-MM-DD": "yyyy-mm-dd", "MM/DD/YYYY": "mm/dd/yyyy", "DD/MM/YYYY": "dd/mm/yyyy", "MMM YYYY": "mmm yyyy" };
const quoted = (s) => (s ? `"${s.replace(/"/g, "")}"` : "");

/** The Excel number format for a column, so cells stay real numbers and dates but look like the preview. */
export function excelFormat(c, tpl) {
  if (NUMERIC.has(c.type)) {
    const s = numberSpec(c, tpl);
    const sym = s.currency ? quoted(tpl.currency || "") : "";
    const body = (s.group ? "#,##0" : "0") + (s.dec ? "." + "0".repeat(s.dec) : "") +
      { 1: "", 1e3: ",", 1e6: ",," }[s.scale] + quoted(s.suffix) + (s.pct ? "%" : "");
    if (s.parens) return `${sym}${body};(${sym}${body})`;
    return s.currency ? `${sym}${body};-${sym}${body}` : body;
  }
  if (c.type === "Date" || c.type === "DateTime") {
    const s = dateSpec(c, tpl);
    return [s.date && EXCEL_DATE[s.date], s.time && (s.seconds ? "hh:mm:ss" : "hh:mm")].filter(Boolean).join(" ");
  }
  return "";
}

const xesc = (s) => String(s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "") // not allowed in XML
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "A", "B", … "Z", "AA", … */
export function colLetter(i) {
  let s = "";
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/** Excel's day number for a date, read from its local parts (that's how the preview shows it). */
const EPOCH = Date.UTC(1899, 11, 30);
const serial = (d) => (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - EPOCH) / 86_400_000;

const argb = (hex) => "FF" + hex.replace("#", "").toUpperCase();

/**
 * The workbook's cell formats. add({ font, fill, border, numFmt, align }) returns the style index for a cell's s="…",
 * reusing an existing one when the same combination was added before.
 *   font: { b, sz, color }   fill: "#hex" or { from, to } (left-to-right gradient)
 *   border: { top, bottom: { style, color } }   align: { h, v, indent, wrap }
 */
class Styles {
  constructor() {
    this.fonts = [{}];
    this.fills = ["none", "gray125"]; // Excel requires these two first
    this.borders = [{}];
    this.formats = [];
    this.xfs = [];
    this.byKey = new Map();
    this.add({});
  }
  static index(list, item) {
    const k = JSON.stringify(item);
    const i = list.findIndex((x) => JSON.stringify(x) === k);
    return i >= 0 ? i : list.push(item) - 1;
  }
  add({ font = {}, fill, border = {}, numFmt = "", align }) {
    const key = JSON.stringify([font, fill, border, numFmt, align]);
    if (this.byKey.has(key)) return this.byKey.get(key);
    const xf = {
      font: Styles.index(this.fonts, font),
      fill: fill ? Styles.index(this.fills, fill) : 0,
      border: Styles.index(this.borders, border),
      fmt: numFmt ? 164 + Styles.index(this.formats, numFmt) : 0,
      align,
    };
    const i = this.xfs.push(xf) - 1;
    this.byKey.set(key, i);
    return i;
  }
  xml() {
    const font = (f) => `<font>${f.b ? "<b/>" : ""}<sz val="${f.sz || 11}"/>${f.color ? `<color rgb="${argb(f.color)}"/>` : ""}<name val="Calibri"/><family val="2"/></font>`;
    const fill = (f) => (typeof f === "string" && !f.startsWith("#") ? `<fill><patternFill patternType="${f}"/></fill>`
      : typeof f === "string" ? `<fill><patternFill patternType="solid"><fgColor rgb="${argb(f)}"/><bgColor indexed="64"/></patternFill></fill>`
      : `<fill><gradientFill degree="0"><stop position="0"><color rgb="${argb(f.from)}"/></stop><stop position="1"><color rgb="${argb(f.to)}"/></stop></gradientFill></fill>`);
    const side = (name, s) => (s ? `<${name} style="${s.style}"><color rgb="${argb(s.color)}"/></${name}>` : `<${name}/>`);
    const border = (b) => `<border>${side("left")}${side("right")}${side("top", b.top)}${side("bottom", b.bottom)}<diagonal/></border>`;
    const xf = (x) => `<xf numFmtId="${x.fmt}" fontId="${x.font}" fillId="${x.fill}" borderId="${x.border}" xfId="0"` +
      `${x.fmt ? ' applyNumberFormat="1"' : ""}${x.font ? ' applyFont="1"' : ""}${x.fill ? ' applyFill="1"' : ""}${x.border ? ' applyBorder="1"' : ""}` +
      (x.align ? ` applyAlignment="1"><alignment${x.align.h ? ` horizontal="${x.align.h}"` : ""}${x.align.v ? ` vertical="${x.align.v}"` : ""}` +
        `${x.align.indent ? ` indent="${x.align.indent}"` : ""}${x.align.wrap ? ' wrapText="1"' : ""}/></xf>` : "/>");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (this.formats.length ? `<numFmts count="${this.formats.length}">${this.formats.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${xesc(f)}"/>`).join("")}</numFmts>` : "") +
      `<fonts count="${this.fonts.length}">${this.fonts.map(font).join("")}</fonts>` +
      `<fills count="${this.fills.length}">${this.fills.map(fill).join("")}</fills>` +
      `<borders count="${this.borders.length}">${this.borders.map(border).join("")}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${this.xfs.length}">${this.xfs.map(xf).join("")}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      "</styleSheet>";
  }
}

/** A text cell; an empty one is only written when it has a style (e.g. a shaded row). */
function textCell(ref, text, style) {
  const s = style ? ` s="${style}"` : "";
  if (!text) return style ? `<c r="${ref}"${s}/>` : "";
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xesc(String(text).slice(0, 32_767))}</t></is></c>`;
}

/** One data cell: numbers and dates as values, booleans and text as the shown text. */
function dataCell(v, c, ref, style) {
  if (v === null || v === undefined) return style ? `<c r="${ref}" s="${style}"/>` : "";
  if (NUMERIC.has(c.type) || c.type === "Date" || c.type === "DateTime") {
    const n = v instanceof Date ? serial(v) : Number(v);
    if (!Number.isFinite(n)) return style ? `<c r="${ref}" s="${style}"/>` : "";
    return `<c r="${ref}"${style ? ` s="${style}"` : ""}><v>${n}</v></c>`;
  }
  let text;
  if (c.type === "Boolean") text = booleanLabels(c)[v ? 0 : 1];
  else {
    const d = displayOf(c);
    text = d === "upper" ? String(v).toUpperCase() : d === "lower" ? String(v).toLowerCase() : String(v);
  }
  return textCell(ref, text, style);
}

/**
 * Column widths (in characters) that fit the longest shown value in the first 1,000 rows, and the bold heading
 * with room for its filter button.
 */
const widthOf = (c, rows, tpl) => {
  let w = 0;
  for (let i = 0; i < Math.min(rows.length, 1_000); i++) w = Math.max(w, formatValue(rows[i][c.key], c, tpl).length);
  return Math.min(60, Math.max(8, w + 3, Math.ceil(c.label.length * 1.15) + (NUMERIC.has(c.type) ? 9 : 6)));
};

/** Sum for numbers, average for percentages, over every row; ID-like columns aren't totalled. Same rule as the preview. */
function totalsOf(cols, rows) {
  const out = {};
  for (const c of cols) {
    if (!NUMERIC.has(c.type) || idLike(c.name)) continue;
    let sum = 0, n = 0;
    for (const r of rows) if (typeof r[c.key] === "number") { sum += r[c.key]; n++; }
    if (n) out[c.key] = c.type === "Percentage" ? { value: sum / n, kind: "avg" } : { value: sum, kind: "sum" };
  }
  return out;
}

const EMU = 914_400; // per inch
const DEFAULT_COL_PX = 64; // a column of Excel's default width

/**
 * The sheet layout. Plain: the header row, then the data. LoanMart (the SSRS template's look): a green band with the
 * logo, organisation, title and run date across every column, a gold stripe, a green header row, shaded alternate rows
 * and a totals row. Either style ends with a totals row (SUBTOTAL formulas, so they follow Excel's filters) when
 * tpl.totals is on.
 */
function layout(cols, rows, tpl, title, branded) {
  const st = new Styles();
  const widths = cols.map((c) => widthOf(c, rows, tpl));
  const fmts = cols.map((c) => excelFormat(c, tpl));
  const align = (c) => (c.type === "Boolean" ? { h: "center" } : undefined);
  const top = []; // rows above the header: { height, cells: [xml] }
  const merges = [];
  let span = cols.length; // columns the band covers

  const totals = tpl.totals ? totalsOf(cols, rows) : {};
  const totalsRow = (style) => (Object.keys(totals).length ? { values: totals, styles: fmts.map(style) } : null);

  if (!branded) {
    const head = st.add({ font: { b: true } });
    return {
      st, widths, top, merges, span, showGrid: true,
      head: cols.map(() => head),
      body: [fmts.map((f, i) => st.add({ numFmt: f, align: align(cols[i]) }))],
      totals: totalsRow((f) => st.add({ font: { b: true }, border: { top: { style: "thin", color: "#18233A" } }, numFmt: f })),
    };
  }

  // The band: one merged cell per line across every column, and wider still if the title (20pt) needs it.
  // Row heights are whole pixels (multiples of 0.75pt), so the logo, sized to the band in points, fills it exactly.
  const heights = { org: 21, title: 31.5, meta: 16.5 };
  const bandPt = (tpl.org ? heights.org : 0) + heights.title + heights.meta;
  const logoPx = tpl.logo ? (bandPt / 0.75) * LOGO_SIZE.w / LOGO_SIZE.h : 0;
  const indent = tpl.logo ? Math.ceil((logoPx + 14) / 10) : 1; // an indent level is about 10px; clears the logo
  const textPx = Math.max(title.length * 15, 300) + indent * 10 + 24;
  let px = widths.reduce((n, w) => n + w * 7 + 5, 0);
  while (px < textPx && span < 30) { px += DEFAULT_COL_PX; span++; }
  const last = colLetter(span - 1);
  const band = { from: BRAND.green, to: BRAND.greenDeep };
  const bandStyle = (font, v) => st.add({ font, fill: band, align: { h: "left", v, indent } });
  const lines = [];
  if (tpl.org) lines.push({ height: heights.org, s: bandStyle({ b: true, sz: 8, color: BRAND.gold }, "bottom"), text: tpl.org.toUpperCase() });
  lines.push({ height: heights.title, s: bandStyle({ b: true, sz: 20, color: "#FFFFFF" }, "center"), text: title || "Report" });
  lines.push({ height: heights.meta, s: bandStyle({ sz: 8.5, color: "#9CC3AC" }, "top"), text: metaLine(cols, rows, tpl) });
  const pad = st.add({ fill: band });
  lines.forEach((l) => {
    const r = top.length + 1;
    top.push({ height: l.height, cells: [textCell(`A${r}`, l.text, l.s), ...Array.from({ length: span - 1 }, (_, i) => `<c r="${colLetter(i + 1)}${r}" s="${pad}"/>`)] });
    merges.push(`A${r}:${last}${r}`);
  });
  const gold = st.add({ fill: BRAND.gold });
  top.push({ height: 4, cells: Array.from({ length: span }, (_, i) => `<c r="${colLetter(i)}${top.length + 1}" s="${gold}"/>`) });
  top.push({ height: 8, cells: [] });

  const line = { style: "thin", color: BRAND.greenLine };
  const body = [false, true].map((zebra) => fmts.map((f, i) => st.add({
    font: { color: BRAND.ink }, fill: zebra && tpl.zebra ? BRAND.greenTint : undefined, border: { bottom: line }, numFmt: f, align: align(cols[i]),
  })));
  // Right-aligned headings are indented so the filter button doesn't cover their last letters.
  const head = cols.map((c) => st.add({
    font: { b: true, color: "#FFFFFF" }, fill: BRAND.green,
    align: NUMERIC.has(c.type) ? { h: "right", v: "center", indent: 2 } : { h: c.type === "Boolean" ? "center" : "left", v: "center" },
  }));
  const totalStyle = (f) => st.add({ font: { b: true, color: BRAND.ink }, fill: "#E2EEE6", border: { top: { style: "medium", color: BRAND.green } }, numFmt: f });

  return {
    st, widths, top, merges, span, showGrid: false, head, body,
    bandHeight: lines.reduce((n, l) => n + l.height, 0),
    totals: totalsRow(totalStyle),
    logo: tpl.logo,
  };
}

function* sheetXml(cols, rows, L) {
  const headRow = L.top.length + 1, firstData = headRow + 1, lastData = headRow + rows.length;
  const lastCol = colLetter(Math.max(cols.length - 1, 0));
  const letters = cols.map((_, i) => colLetter(i));
  const extra = Math.max(0, L.span - cols.length);
  yield '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<sheetViews><sheetView workbookViewId="0"${L.showGrid ? "" : ' showGridLines="0"'}>` +
    `<pane ySplit="${headRow}" topLeftCell="A${firstData}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    "<cols>" + L.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("") +
    (extra ? `<col min="${cols.length + 1}" max="${L.span}" width="8.43"/>` : "") + "</cols>" +
    "<sheetData>" +
    L.top.map((t, i) => `<row r="${i + 1}" ht="${t.height}" customHeight="1">${t.cells.join("")}</row>`).join("") +
    `<row r="${headRow}"${L.showGrid ? "" : ' ht="20" customHeight="1"'}>${cols.map((c, i) => textCell(letters[i] + headRow, c.label, L.head[i])).join("")}</row>`;

  let chunk = [];
  for (let n = 0; n < rows.length; n++) {
    const r = firstData + n, styles = L.body[L.body.length > 1 ? n % 2 : 0];
    chunk.push(`<row r="${r}">${cols.map((c, i) => dataCell(rows[n][c.key], c, letters[i] + r, styles[i])).join("")}</row>`);
    if (chunk.length === 5_000) { yield chunk.join(""); chunk = []; }
  }
  if (chunk.length) yield chunk.join("");

  if (L.totals && rows.length) {
    const r = lastData + 1, label = cols.findIndex((c) => !L.totals.values[c.key]);
    yield `<row r="${r}" ht="20" customHeight="1">` + cols.map((c, i) => {
      const t = L.totals.values[c.key], ref = letters[i] + r, s = L.totals.styles[i];
      if (t) return `<c r="${ref}" s="${s}"><f>SUBTOTAL(${t.kind === "avg" ? 101 : 109},${letters[i]}${firstData}:${letters[i]}${lastData})</f><v>${t.value}</v></c>`;
      return textCell(ref, i === label ? "Total" : "", s);
    }).join("") + "</row>";
  }
  yield "</sheetData>" +
    `<autoFilter ref="A${headRow}:${lastCol}${Math.max(lastData, headRow)}"/>` +
    (L.merges.length ? `<mergeCells count="${L.merges.length}">${L.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "") +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
    (L.logo ? '<drawing r:id="rId1"/>' : "") +
    "</worksheet>";
}

/** The logo, filling the band's left end: anchored at A1, as tall as the band. */
function drawingXml(bandHeightPt) {
  const x = 0, y = 0;
  const cy = Math.round((bandHeightPt / 72) * EMU), cx = Math.round(cy * LOGO_SIZE.w / LOGO_SIZE.h);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<xdr:absoluteAnchor><xdr:pos x="${x}" y="${y}"/><xdr:ext cx="${cx}" cy="${cy}"/>` +
    '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="LoanMart logo" descr="LoanMart"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>' +
    '<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>' +
    `<xdr:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>` +
    "<xdr:clientData/></xdr:absoluteAnchor></xdr:wsDr>";
}

/** "Generated 11 Oct 2026  ·  5 columns  ·  1,234 rows" */
export const metaLine = (cols, rows, tpl) =>
  `Generated ${fmtDate(new Date(), tpl.dateFormat)}  ·  ${cols.length} ${cols.length === 1 ? "column" : "columns"}  ·  ` +
  `${rows.length.toLocaleString("en-US")} ${rows.length === 1 ? "row" : "rows"}`;

/** Excel's limits on sheet names: 31 characters, none of []:*?/\ */
const sheetName = (s) => String(s || "").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Data";

/**
 * Rows as an .xlsx workbook with one sheet; the header row is frozen and has filter buttons. Numbers and dates are
 * written as real values with a number format matching the column's display choice; booleans and text as the shown
 * text. style: "plain" or "loanmart" (see layout()).
 */
export async function toXlsx(cols, rows, tpl, title, { style = "plain" } = {}) {
  const L = layout(cols, rows, tpl, title, style === "loanmart");
  const headRow = L.top.length + 1;
  const name = sheetName(title);
  const ref = (a, b) => `'${xesc(name.replace(/'/g, "''"))}'!${a}:${b}`;
  const lastCol = colLetter(Math.max(cols.length - 1, 0));
  const ns = "http://schemas.openxmlformats.org";
  const rel = (id, type, target) => `<Relationship Id="${id}" Type="${ns}/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
  const rels = (...items) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    `<Relationships xmlns="${ns}/package/2006/relationships">${items.join("")}</Relationships>`;

  return zip([
    { name: "[Content_Types].xml", pieces: ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<Types xmlns="${ns}/package/2006/content-types">` +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="png" ContentType="image/png"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      (L.logo ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : "") +
      "</Types>"] },
    { name: "_rels/.rels", pieces: [rels(rel("rId1", "officeDocument", "xl/workbook.xml"))] },
    { name: "xl/workbook.xml", pieces: ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      `<workbook xmlns="${ns}/spreadsheetml/2006/main" xmlns:r="${ns}/officeDocument/2006/relationships">` +
      `<sheets><sheet name="${xesc(name)}" sheetId="1" r:id="rId1"/></sheets>` +
      "<definedNames>" +
      `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${ref(`$A$${headRow}`, `$${lastCol}$${headRow + rows.length}`)}</definedName>` +
      `<definedName name="_xlnm.Print_Titles" localSheetId="0">${ref(`$${headRow}`, `$${headRow}`)}</definedName>` +
      "</definedNames></workbook>"] },
    { name: "xl/_rels/workbook.xml.rels", pieces: [rels(rel("rId1", "worksheet", "worksheets/sheet1.xml"), rel("rId2", "styles", "styles.xml"))] },
    { name: "xl/styles.xml", pieces: [L.st.xml()] },
    { name: "xl/worksheets/sheet1.xml", pieces: sheetXml(cols, rows, L) },
    ...(L.logo ? [
      { name: "xl/worksheets/_rels/sheet1.xml.rels", pieces: [rels(rel("rId1", "drawing", "../drawings/drawing1.xml"))] },
      { name: "xl/drawings/drawing1.xml", pieces: [drawingXml(L.bandHeight)] },
      { name: "xl/drawings/_rels/drawing1.xml.rels", pieces: [rels(rel("rId1", "image", "../media/logo.png"))] },
      { name: "xl/media/logo.png", pieces: [Buffer.from(LOANMART_LOGO_PNG, "base64")] },
    ] : []),
  ]);
}
