import { countQuery } from "../../rdl/sqlWrap.js";
import { describeQuery } from "./describe.js";
import { previewQuery } from "./preview.js";

/**
 * How many rows the query returns, for "Preview 10 out of N rows". Returns { count }.
 * Asks SQL Server for COUNT_BIG(*) over the query. A derived table needs every column named once, so when a column
 * has no name or a repeated one (checked first, without running the query), or the query can't be wrapped (FOR XML),
 * it runs the query itself instead and counts the rows as they stream past, keeping none.
 * Both run like the preview: in a transaction that is always rolled back, cancelled after timeoutMs.
 */
export async function countRows(pool, query, { timeoutMs }) {
  const columns = await describeQuery(pool, query);
  const wrapped = columns.some((c) => c.unnamed || c.dup) ? null : countQuery(query);
  if (!wrapped) return previewQuery(pool, query, { timeoutMs, countOnly: true });
  const { rows } = await previewQuery(pool, wrapped, { limit: 1, timeoutMs });
  return { count: Number(rows[0][0]) };
}
