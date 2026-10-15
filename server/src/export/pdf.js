import PDFDocument from "pdfkit";
import { metaLine } from "./xlsx.js";
import { tablePalette } from "./palette.js";
import { NUMERIC, BRAND, LOANMART_LOGO_PNG, LOGO_SIZE, formatValue, alignOf, idLike, fmtDate } from "@report-builder/shared";

const PAGE = { size: "LETTER", layout: "landscape", margin: 30 };
const LOGO = Buffer.from(LOANMART_LOGO_PNG, "base64");
const PLAIN = { ink: "#18233A", muted: "#7A859A", line: "#E6EAF0", headLine: "#18233A" };

/** Sum for numbers, average for percentages; ID-like columns aren't totalled. Same rule as the preview and Excel. */
function totalsOf(cols, rows) {
  const out = {};
  for (const c of cols) {
    if (!NUMERIC.has(c.type) || idLike(c.name)) continue;
    let sum = 0, n = 0;
    for (const r of rows) if (typeof r[c.key] === "number") { sum += r[c.key]; n++; }
    if (n) out[c.key] = c.type === "Percentage" ? sum / n : sum;
  }
  return out;
}

/** The text cut to fit `width` at the current font, ending in "..." when cut. */
function fit(doc, text, width) {
  if (doc.widthOfString(text) <= width) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(text.slice(0, mid) + "...") <= width) lo = mid; else hi = mid - 1;
  }
  return lo ? text.slice(0, lo) + "..." : "";
}

/**
 * Rows as a landscape Letter PDF that fits the page width; the column headings repeat on every page, and each page
 * has the title and "Page n of N" at the bottom. style "loanmart" adds the LoanMart template's look (green band with
 * the logo, gold stripe, green headings and shaded rows); "ledger", "clean" and "contrast" are a title and a table in
 * that style's colours; "plain" is a simple title and table. Every style ends with a totals row when tpl.totals is on.
 * Text is drawn in Helvetica, so characters outside Windows-1252 (e.g. CJK) don't show.
 */
export function toPdf(cols, rows, tpl, title, { style = "plain" } = {}) {
  const branded = style === "loanmart";
  const P = tablePalette(style);
  const doc = new PDFDocument({ ...PAGE, bufferPages: true, info: { Title: title || "Report", Creator: "Report builder" } });
  const chunks = [];
  doc.on("data", (b) => chunks.push(b));
  const done = new Promise((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });

  const left = PAGE.margin, width = doc.page.width - PAGE.margin * 2;
  const bottom = doc.page.height - PAGE.margin - 16; // room for the page footer
  const text = cols.map((c) => rows.map((r) => formatValue(r[c.key], c, tpl)));
  const totals = tpl.totals ? totalsOf(cols, rows) : {};
  const hasTotals = Object.keys(totals).length > 0 && rows.length > 0;

  // Column widths: what the heading and the first 500 values need, then scaled to the page width.
  // Too wide: the font shrinks (down to 6pt), then the columns, and long values are cut with "...".
  let size = 8.5;
  const pad = 5;
  const natural = cols.map((c, i) => {
    doc.font("Helvetica-Bold").fontSize(size);
    let w = doc.widthOfString(c.label);
    doc.font("Helvetica");
    for (let n = 0; n < Math.min(rows.length, 500); n++) w = Math.max(w, doc.widthOfString(text[i][n]));
    return Math.min(w, 260) + pad * 2;
  });
  let sum = natural.reduce((a, b) => a + b, 0);
  if (sum > width) { const k = Math.max(6 / size, width / sum); size *= k; sum = natural.reduce((a, w) => a + (w - pad * 2) * k + pad * 2, 0); }
  const k = size / 8.5;
  const widths = natural.map((w) => ((w - pad * 2) * k + pad * 2) * (width / sum));
  const xs = widths.reduce((a, w, i) => [...a, a[i] + w], [left]);
  const rowH = size * 2;
  const align = cols.map((c) => alignOf(c));

  function cell(str, i, y, h, { bold = false, color, alignTo = align[i] } = {}) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(color);
    doc.text(fit(doc, str, widths[i] - pad * 2), xs[i] + pad, y + (h - size) / 2 + 0.5, { width: widths[i] - pad * 2, align: alignTo, lineBreak: false });
  }

  function heading(y) {
    const h = rowH + 2;
    if (P.headBg) doc.rect(left, y, width, h).fill(P.headBg);
    cols.forEach((c, i) => cell(c.label, i, y, h, { bold: true, color: P.headColor }));
    if (P.headLine) doc.moveTo(left, y + h).lineTo(left + width, y + h).lineWidth(style === "plain" ? 1 : 2).stroke(P.headLine);
    return y + h;
  }

  // Report header, first page only
  let y = PAGE.margin;
  const generated = metaLine(cols, rows, tpl);
  if (branded) {
    const h = 70;
    const grad = doc.linearGradient(left, 0, left + width, 0);
    grad.stop(0, BRAND.green).stop(1, BRAND.greenDeep);
    doc.rect(left, y, width, h).fill(grad);
    let tx = left + 14;
    if (tpl.logo) { // fills the band's left end, flush with its edges
      const w = h * LOGO_SIZE.w / LOGO_SIZE.h;
      doc.image(LOGO, left, y, { width: w, height: h });
      tx = left + w + 14;
    }
    const tw = left + width - 14 - tx;
    let ty = y + 13;
    if (tpl.org) { doc.font("Helvetica-Bold").fontSize(7.5).fillColor(BRAND.gold).text(tpl.org.toUpperCase(), tx, ty, { width: tw, lineBreak: false, characterSpacing: 1 }); }
    ty += 11;
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#FFFFFF");
    doc.text(fit(doc, title || "Report", tw), tx, ty, { width: tw, lineBreak: false });
    ty += 23;
    doc.font("Helvetica").fontSize(7.5).fillColor("#9CC3AC").text(generated, tx, ty, { width: tw, lineBreak: false });
    doc.rect(left, y + h, width, 3).fill(BRAND.gold);
    y += h + 3 + 10;
  } else {
    // Contrast marks the title with a blue bar at its left; Ledger rules a line under the header, as in the report
    const tx = style === "contrast" ? left + 10 : left;
    if (style === "contrast") doc.rect(left, y, 4, 32).fill("#2D4FD6");
    doc.font("Helvetica-Bold").fontSize(16).fillColor(PLAIN.ink);
    doc.text(fit(doc, title || "Report", width), tx, y, { width: width - (tx - left), lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor(PLAIN.muted).text(generated, tx, y + 21, { width: width - (tx - left), lineBreak: false });
    if (style === "ledger") doc.moveTo(left, y + 35).lineTo(left + width, y + 35).lineWidth(2).stroke(PLAIN.ink);
    y += 40;
  }

  // Table
  y = heading(y);
  for (let n = 0; n < rows.length; n++) {
    if (y + rowH > bottom) { doc.addPage(); y = heading(PAGE.margin); }
    if (P.zebra && tpl.zebra && n % 2 === 1) doc.rect(left, y, width, rowH).fill(P.zebra);
    cols.forEach((c, i) => cell(text[i][n], i, y, rowH, { color: P.ink }));
    doc.moveTo(left, y + rowH).lineTo(left + width, y + rowH).lineWidth(0.5).stroke(P.rowLine);
    y += rowH;
  }
  if (!rows.length) {
    doc.font("Helvetica").fontSize(size).fillColor(PLAIN.muted).text("The query returned no rows.", left + pad, y + 8, { width, lineBreak: false });
  }
  if (hasTotals) {
    if (y + rowH + 2 > bottom) { doc.addPage(); y = heading(PAGE.margin); }
    const h = rowH + 2, label = cols.findIndex((c) => totals[c.key] === undefined);
    const ink = P.ink;
    if (P.totalBg) doc.rect(left, y, width, h).fill(P.totalBg);
    doc.moveTo(left, y).lineTo(left + width, y).lineWidth(P.totalBg ? 1.5 : 1).stroke(P.totalLine);
    cols.forEach((c, i) => {
      const v = totals[c.key];
      if (v !== undefined) cell(formatValue(v, c, tpl), i, y, h, { bold: true, color: ink });
      else if (i === label) cell("Total", i, y, h, { bold: true, color: ink, alignTo: "left" });
    });
  }

  // Page footers
  const { start, count } = doc.bufferedPageRange();
  for (let p = start; p < start + count; p++) {
    doc.switchToPage(p);
    const fy = doc.page.height - PAGE.margin - 8;
    doc.font("Helvetica").fontSize(7).fillColor(branded ? BRAND.muted : PLAIN.muted);
    doc.text(fit(doc, title || "Report", width / 2), left, fy, { width: width / 2, lineBreak: false, height: 10 });
    doc.text(`Page ${p - start + 1} of ${count}`, left + width / 2, fy, { width: width / 2, align: "right", lineBreak: false, height: 10 });
  }
  doc.end();
  return done;
}
