import { HttpError } from "../../lib/errors.js";
import { sqlErrorMessage } from "../db/errors.js";

const COLUMNS_SQL = `
SELECT s.name AS sch, o.name AS obj, o.type AS kind, c.name AS col, TYPE_NAME(c.user_type_id) AS type
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
JOIN sys.columns c ON c.object_id = o.object_id
WHERE o.type IN ('U', 'V') AND o.is_ms_shipped = 0
ORDER BY s.name, o.name, c.column_id`;

const KEYS_SQL = `
SELECT OBJECT_SCHEMA_NAME(k.parent_object_id) + '.' + OBJECT_NAME(k.parent_object_id) AS fromTable, pc.name AS fromCol,
       OBJECT_SCHEMA_NAME(k.referenced_object_id) + '.' + OBJECT_NAME(k.referenced_object_id) AS toTable, rc.name AS toCol
FROM sys.foreign_key_columns k
JOIN sys.columns pc ON pc.object_id = k.parent_object_id AND pc.column_id = k.parent_column_id
JOIN sys.columns rc ON rc.object_id = k.referenced_object_id AND rc.column_id = k.referenced_column_id
ORDER BY fromTable, toTable`;

/** One schema text per connection pool, so follow-up questions reuse it (and hit the AI's prompt cache). */
const cache = new WeakMap();

/**
 * Describes the database's tables, views, columns and foreign keys as plain text for the AI.
 * Only names and types are read; no row data leaves the database.
 */
export async function loadSchema(pool, { maxChars }) {
  if (cache.has(pool)) return cache.get(pool);
  let cols, keys;
  try {
    cols = (await pool.request().query(COLUMNS_SQL)).recordset || [];
    keys = (await pool.request().query(KEYS_SQL)).recordset || [];
  } catch (e) {
    throw new HttpError(422, sqlErrorMessage(e));
  }
  if (!cols.length) throw new HttpError(422, "This login can't see any tables or views in the database.");

  const objects = new Map();
  for (const r of cols) {
    const name = `${r.sch}.${r.obj}`;
    if (!objects.has(name)) objects.set(name, { kind: r.kind.trim() === "V" ? "view" : "table", cols: [] });
    objects.get(name).cols.push(`${r.col} ${r.type}`);
  }
  const lines = [...objects].map(([name, o]) => `${name} (${o.kind}): ${o.cols.join(", ")}`);
  if (keys.length) lines.push("", "Foreign keys:", ...keys.map((k) => `${k.fromTable}.${k.fromCol} -> ${k.toTable}.${k.toCol}`));

  const text = lines.join("\n");
  if (text.length > maxChars) {
    throw new HttpError(413, `The database has too many tables (${objects.size}) to describe to the AI assistant. Raise AI_SCHEMA_MAX_CHARS to allow it.`);
  }
  cache.set(pool, text);
  return text;
}
