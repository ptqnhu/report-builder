import { HttpError } from "../../lib/errors.js";
import { serializeValue } from "./serialize.js";
import { sqlErrorMessage } from "./errors.js";

/**
 * Runs the query for the on-screen preview and returns at most `limit` rows.
 * - Rows are streamed, and the query is cancelled once the limit is reached, so big tables stay fast.
 * - It runs inside a transaction that is always rolled back, as a second guard against writes.
 * - Only the first result set is used.
 * Returns { rows: any[][], truncated, limit } with rows in column order.
 */
export async function previewQuery(pool, query, { limit = 200, timeoutMs = 60_000 } = {}) {
  const tx = pool.transaction();
  await tx.begin();
  try {
    return await new Promise((resolve, reject) => {
      const req = tx.request();
      req.stream = true;
      req.arrayRowMode = true;

      const rows = [];
      let sets = 0, truncated = false, timedOut = false, failure = null, settled = false;

      const settle = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearTimeout(fallback);
        if (timedOut) reject(new HttpError(504, `The query took longer than ${Math.round(timeoutMs / 1000)} seconds. Narrow it with a WHERE clause and try again.`));
        else if (failure) reject(failure);
        else resolve({ rows, truncated, limit });
      };
      // mssql always emits "done" after a cancel or error; this is only a safety net.
      let fallback = null;
      const settleSoon = () => { fallback = setTimeout(settle, 5_000); };

      const timer = setTimeout(() => { timedOut = true; req.cancel(); settleSoon(); }, timeoutMs);

      req.on("recordset", () => { sets += 1; });
      req.on("row", (row) => {
        if (sets > 1 || truncated || timedOut) return;
        if (rows.length < limit) rows.push(row.map(serializeValue));
        else { truncated = true; req.cancel(); settleSoon(); }
      });
      req.on("error", (e) => {
        if (truncated || timedOut) return; // expected after cancel()
        failure = new HttpError(422, sqlErrorMessage(e));
        settleSoon();
      });
      req.on("done", settle);
      req.query(query);
    });
  } finally {
    try { await tx.rollback(); } catch { /* already rolled back by SQL Server */ }
  }
}
