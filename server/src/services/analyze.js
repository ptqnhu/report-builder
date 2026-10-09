import { HttpError } from "../lib/errors.js";
import { checkReadOnly } from "./queryGuard.js";
import { describeQuery } from "./db/describe.js";
import { firstTableName } from "./sqlParser.js";

/** Checks the query is read-only, then asks SQL Server for its columns. */
export async function analyzeQuery(pool, sql) {
  const problem = checkReadOnly(sql);
  if (problem) throw new HttpError(422, problem);
  const columns = await describeQuery(pool, sql);
  return { columns, table: firstTableName(sql) };
}
