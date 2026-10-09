const pad = (n) => String(n).padStart(2, "0");

/**
 * Converts a value from the mssql driver into plain JSON.
 * Dates: mssql reads SQL Server date/time values as UTC (its default useUTC: true), so the UTC
 * parts are the values stored in the database. They're sent without a time zone so the browser
 * shows exactly what's in the table.
 */
export function serializeValue(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}T${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}`;
  }
  if (Buffer.isBuffer(v)) return "(binary data)";
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}
