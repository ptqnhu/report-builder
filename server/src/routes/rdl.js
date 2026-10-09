import { Router } from "express";
import { effectiveColumns, keyBy, fileSlug } from "@report-builder/shared";
import { buildRdl, validateExport, exportWarnings } from "../rdl/buildRdl.js";
import { asyncHandler } from "../lib/errors.js";
import { requireString, optionalString, normalizeColumns, sanitizeTemplate, sanitizeExport } from "../lib/validate.js";

const router = Router();

/**
 * POST /api/rdl  { sql, columns, tpl, title, desc, filters, sort, exp }
 *   -> { rdl, fileName, warnings, problem }
 * POST /api/rdl?download=1 -> the .rdl file as an attachment
 */
router.post("/rdl", asyncHandler(async (req, res) => {
  const b = req.body || {};
  const sql = requireString(b.sql, "sql", { allowEmpty: false });
  const columns = normalizeColumns(b.columns);
  const tpl = sanitizeTemplate(b.tpl);
  const exp = sanitizeExport(b.exp);
  const title = optionalString(b.title, "title", 300);
  const desc = optionalString(b.desc, "desc", 2000);
  const filters = Array.isArray(b.filters) ? b.filters : [];
  const sort = b.sort && typeof b.sort.key === "string" ? { key: b.sort.key, dir: b.sort.dir === "desc" ? "desc" : "asc" } : null;

  const warnings = exportWarnings(columns);
  const effCols = effectiveColumns(columns, tpl);
  const problem = validateExport(exp) || (effCols.length ? "" : "Select at least one column to export.");
  if (problem) return res.json({ rdl: null, fileName: null, warnings, problem });

  const rdl = buildRdl({ sql, columns, effCols, tpl, title, desc, filters, colsByKey: keyBy(effCols), sort, exp });
  const fileName = fileSlug(title) + ".rdl";

  if (req.query.download) return res.attachment(fileName).type("application/xml").send(rdl);
  res.json({ rdl, fileName, warnings, problem: "" });
}));

export default router;
