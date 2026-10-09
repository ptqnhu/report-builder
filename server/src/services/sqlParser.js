// Light SQL reading. Column names and types come from SQL Server itself (db/describe.js);
// this file only finds the main table so the report can get a sensible default title.

/** Finds a keyword at parenthesis depth 0, skipping quoted text and [bracketed] names. */
export function findTopLevel(str, regex, from = 0) {
  let depth = 0, quote = null;
  for (let i = from; i < str.length; i++) {
    const ch = str[i];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "[") { quote = "]"; continue; }
    if (ch === "(") { depth++; continue; }
    if (ch === ")") { depth--; continue; }
    if (depth === 0 && (i === 0 || /[\s();]/.test(str[i - 1]))) {
      const m = str.slice(i).match(regex);
      if (m) return { index: i, length: m[0].length };
    }
  }
  return null;
}

const cleanIdent = (s) => s.replace(/^["`\[]/, "").replace(/["`\]]$/, "");

/** "SELECT ... FROM dbo.Orders o ..." -> "Orders" */
export function firstTableName(sql) {
  const clean = String(sql ?? "").replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").trim();
  const sel = findTopLevel(clean, /^select\b/i);
  if (!sel) return null;
  const from = findTopLevel(clean, /^from\b/i, sel.index + sel.length);
  if (!from) return null;
  const m = clean.slice(from.index + 4).trim().match(/^([\w."`\[\]]+)/);
  return m ? cleanIdent(m[1].split(".").pop()) : null;
}
