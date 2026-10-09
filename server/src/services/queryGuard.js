// Report queries must only read data. This check runs before anything reaches SQL Server;
// previews also run inside a transaction that is always rolled back (see db/preview.js).
// For real protection, connect with a login that only has read access (e.g. db_datareader).

const BLOCKED = /\b(insert|update|delete|merge|drop|alter|create|truncate|exec|execute|grant|revoke|deny|backup|restore|shutdown|dbcc|bulk|openrowset|opendatasource|openquery|into|waitfor|use|kill|reconfigure|sp_\w+|xp_\w+)\b/i;

/** Returns a message explaining why the query isn't allowed, or "" if it's fine. */
export function checkReadOnly(sql) {
  const stripped = String(sql ?? "")
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, "''") // string literals can contain anything
    .replace(/\[[^\]]*\]/g, "[x]") // so can [bracketed names]
    .replace(/"[^"]*"/g, '"x"')
    .trim()
    .replace(/^;+\s*/, ""); // allow the common ";WITH cte AS (...)" style

  if (!stripped) return "Enter a query.";
  if (!/^(select|with)\b/i.test(stripped)) return "Only SELECT queries can be used for reports. Start the query with SELECT or WITH.";
  const body = stripped.replace(/;\s*$/, "");
  if (body.includes(";")) return "Use a single SELECT statement. Remove the extra statement after the semicolon.";
  const m = body.match(BLOCKED);
  if (m) return `The query can't contain ${m[1].toUpperCase()}. Reports can only read data.`;
  return "";
}
