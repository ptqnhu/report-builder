import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireString } from "../lib/validate.js";
import { settings } from "../lib/config.js";
import { analyzeQuery } from "../services/analyze.js";
import { checkReadOnly } from "../services/queryGuard.js";
import { previewQuery } from "../services/db/preview.js";
import { countRows } from "../services/db/count.js";

export default function queryRoutes(connections) {
  const router = Router();
  const read = (body) => ({
    pool: connections.get(requireString(body?.connectionId, "connectionId", { max: 64, allowEmpty: false })).pool,
    sql: requireString(body?.sql, "sql", { allowEmpty: false }),
  });

  /** POST /api/analyze { connectionId, sql } -> { columns, table } */
  router.post("/analyze", asyncHandler(async (req, res) => {
    const { pool, sql } = read(req.body);
    res.json(await analyzeQuery(pool, sql));
  }));

  /**
   * POST /api/preview { connectionId, sql, all? } -> { rows, truncated, limit }
   * The table preview gets the first few rows; `all: true` (charts) gets every row, up to a safety ceiling.
   */
  router.post("/preview", asyncHandler(async (req, res) => {
    const { pool, sql } = read(req.body);
    const problem = checkReadOnly(sql);
    if (problem) throw new HttpError(422, problem);
    const limit = req.body?.all === true ? settings.chartRowLimit : settings.previewRowLimit;
    res.json(await previewQuery(pool, sql, { limit, timeoutMs: settings.queryTimeoutMs }));
  }));

  /** POST /api/count { connectionId, sql } -> { count }: every row the query returns, not just the preview's */
  router.post("/count", asyncHandler(async (req, res) => {
    const { pool, sql } = read(req.body);
    const problem = checkReadOnly(sql);
    if (problem) throw new HttpError(422, problem);
    res.json(await countRows(pool, sql, { timeoutMs: settings.queryTimeoutMs }));
  }));

  return router;
}
