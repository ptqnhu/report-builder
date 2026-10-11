import { Router } from "express";
import { effectiveColumns, keyBy, fileSlug, coerce, sortRows } from "@report-builder/shared";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireString, optionalString, normalizeColumns, sanitizeTemplate } from "../lib/validate.js";
import { settings } from "../lib/config.js";
import { checkReadOnly } from "../services/queryGuard.js";
import { previewQuery } from "../services/db/preview.js";
import { toCsv } from "../export/csv.js";
import { toXlsx } from "../export/xlsx.js";
import { toPdf } from "../export/pdf.js";

const FORMATS = {
  csv: { ext: ".csv", type: "text/csv; charset=utf-8" },
  xlsx: { ext: ".xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  pdf: { ext: ".pdf", type: "application/pdf" },
};

/**
 * POST /api/export { connectionId, sql, columns, tpl, sort, title, format: "csv" | "xlsx" | "pdf", style: "plain" | "loanmart" }
 *   -> the file as an attachment, with every row the query returns (up to EXPORT_ROW_LIMIT, or PDF_ROW_LIMIT for PDFs).
 * Headers: X-Export-Rows (rows written), X-Export-Truncated ("1" when the limit cut the export short).
 * `style` applies to Excel and PDF: "loanmart" adds the LoanMart template's band, colours and totals row.
 * `columns` is the full list from /analyze in query order; unselected ones are left out of the file.
 */
export default function exportRoutes(connections) {
  const router = Router();

  router.post("/export", asyncHandler(async (req, res) => {
    const b = req.body || {};
    const { pool } = connections.get(requireString(b.connectionId, "connectionId", { max: 64, allowEmpty: false }));
    const sql = requireString(b.sql, "sql", { allowEmpty: false });
    const format = FORMATS[b.format];
    if (!format) throw new HttpError(400, "format must be csv, xlsx or pdf.");
    const problem = checkReadOnly(sql);
    if (problem) throw new HttpError(422, problem);

    const columns = normalizeColumns(b.columns);
    const tpl = sanitizeTemplate(b.tpl);
    const title = optionalString(b.title, "title", 300);
    const cols = effectiveColumns(columns, tpl);
    if (!cols.length) throw new HttpError(400, "Select at least one column to export.");
    const colsByKey = keyBy(cols);
    const sort = b.sort && typeof b.sort.key === "string" ? { key: b.sort.key, dir: b.sort.dir === "desc" ? "desc" : "asc" } : null;

    const limit = b.format === "pdf" ? Math.min(settings.pdfRowLimit, settings.exportRowLimit) : settings.exportRowLimit;
    const result = await previewQuery(pool, sql, { limit, timeoutMs: settings.exportTimeoutMs });
    const rows = sortRows(
      result.rows.map((arr) => Object.fromEntries(columns.map((c, i) => [c.key, coerce(arr[i], c.type)]))),
      sort, colsByKey);

    const style = b.style === "loanmart" ? "loanmart" : "plain";
    const body = b.format === "csv" ? toCsv(cols, rows, tpl)
      : b.format === "pdf" ? await toPdf(cols, rows, tpl, title, { style })
      : await toXlsx(cols, rows, tpl, title, { style });
    res.set({
      "X-Export-Rows": String(rows.length),
      "X-Export-Truncated": result.truncated ? "1" : "0",
      "Access-Control-Expose-Headers": "Content-Disposition, X-Export-Rows, X-Export-Truncated",
    });
    res.attachment(fileSlug(title) + format.ext).type(format.type).send(body);
  }));

  return router;
}
