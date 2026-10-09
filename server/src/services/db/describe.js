import { randomUUID } from "node:crypto";
import { HttpError } from "../../lib/errors.js";
import { fromSqlServerType } from "../typeInference.js";
import { sqlErrorMessage } from "./errors.js";

export const newKey = () => "c" + randomUUID().slice(0, 8);

/**
 * Asks SQL Server what the query returns, without running it
 * (sys.sp_describe_first_result_set). Gives exact names, order and SQL types, and works for SELECT *.
 */
export async function describeQuery(pool, query) {
  let result;
  try {
    result = await pool.request().input("tsql", query).query("EXEC sys.sp_describe_first_result_set @tsql, NULL, 0");
  } catch (e) {
    throw new HttpError(422, sqlErrorMessage(e));
  }
  const rows = (result.recordset || []).filter((r) => !r.is_hidden).sort((a, b) => a.column_ordinal - b.column_ordinal);
  if (!rows.length) throw new HttpError(422, "The query doesn't return any columns.");

  const seen = {};
  return rows.map((r) => {
    const unnamed = !r.name;
    const base = r.name || `Column${r.column_ordinal}`;
    const k = base.toLowerCase();
    seen[k] = (seen[k] || 0) + 1;
    const name = seen[k] > 1 ? `${base}_${seen[k]}` : base;
    const [type, reason] = fromSqlServerType(r.system_type_name, name);
    return {
      key: newKey(),
      index: r.column_ordinal - 1, // position in each preview row
      name,
      sqlType: r.system_type_name,
      nullable: !!r.is_nullable,
      type,
      suggested: type,
      reason,
      selected: true,
      unnamed,
      dup: seen[k] > 1,
    };
  });
}
