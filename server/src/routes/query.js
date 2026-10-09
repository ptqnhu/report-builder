import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireString } from "../lib/validate.js";
import { settings } from "../lib/config.js";
import { analyzeQuery } from "../services/analyze.js";
import { checkReadOnly } from "../services/queryGuard.js";
import { previewQuery } from "../services/db/preview.js";

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

  /** POST /api/preview { connectionId, sql } -> { rows, truncated, limit } */
  router.post("/preview", asyncHandler(async (req, res) => {
    const { pool, sql } = read(req.body);
    const problem = checkReadOnly(sql);
    if (problem) throw new HttpError(422, problem);
    res.json(await previewQuery(pool, sql, { limit: settings.previewRowLimit, timeoutMs: settings.queryTimeoutMs }));
  }));

  return router;
}
