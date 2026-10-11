import { BLANK } from "@report-builder/shared";

/** Blanks out comments, strings and quoted names (same length), so keywords and brackets can be found by position. */
function mask(sql) {
  let out = "", i = 0;
  while (i < sql.length) {
    const ch = sql[i], two = sql.slice(i, i + 2);
    let end = -1;
    if (two === "--") { end = sql.indexOf("\n", i); if (end < 0) end = sql.length; }
    else if (two === "/*") { end = sql.indexOf("*/", i + 2); end = end < 0 ? sql.length : end + 2; }
    else if (ch === "'" || ch === '"' || ch === "[") {
      const close = ch === "[" ? "]" : ch;
      let j = i + 1;
      for (;;) {
        j = sql.indexOf(close, j);
        if (j < 0) { j = sql.length; break; }
        if (sql[j + 1] === close) { j += 2; continue; } // '' or ]] inside
        j += 1; break;
      }
      end = j;
    }
    if (end >= 0) { out += " ".repeat(end - i); i = end; } else { out += ch; i++; }
  }
  return out;
}

/** Matches of re that are outside any parentheses. */
function topLevel(masked, re) {
  const depth = [];
  let d = 0;
  for (const ch of masked) { depth.push(d); if (ch === "(") d++; else if (ch === ")") d--; }
  return [...masked.matchAll(re)].filter((m) => depth[m.index] === 0);
}

export const quoteName = (name) => `[${String(name).replace(/]/g, "]]")}]`;

/**
 * SQL listing the distinct values of one column of the report query, for an SSRS pick list:
 *   [WITH …] SELECT DISTINCT <column as trimmed text, blanks as "(Blank)"> AS Value FROM (<query>) AS src ORDER BY Value
 * The query becomes a derived table, so a final ORDER BY is dropped unless TOP or OFFSET needs it, and
 * OPTION (…) moves to the outside. Returns null when the query can't be wrapped (FOR XML/JSON).
 */
export function distinctValuesQuery(sql, column) {
  let body = String(sql).trim().replace(/^;+\s*/, "").replace(/;\s*$/, "");
  let prefix = "", option = "";

  if (/^with\b/i.test(mask(body))) {
    const first = topLevel(mask(body), /\bselect\b/gi)[0];
    if (!first) return null;
    prefix = body.slice(0, first.index);
    body = body.slice(first.index);
  }
  if (topLevel(mask(body), /\bfor\s+(xml|json|browse)\b/gi).length) return null;

  const opt = topLevel(mask(body), /\boption\s*\(/gi).pop();
  if (opt) { option = body.slice(opt.index).trim(); body = body.slice(0, opt.index); }

  const m = mask(body);
  const order = topLevel(m, /\border\s+by\b/gi).pop();
  if (order) {
    const offset = topLevel(m.slice(order.index), /\boffset\b/gi).length > 0;
    const setOp = topLevel(m, /\b(union|except|intersect)\b/gi).length > 0;
    const top = !setOp && /^select\s+(?:all\s+|distinct\s+)?top\b/i.test(m);
    if (!offset && !top) body = body.slice(0, order.index); // order doesn't change which rows there are
  }

  const value = `ISNULL(NULLIF(RTRIM(CONVERT(nvarchar(4000), src.${quoteName(column)})), N''), N'${BLANK}')`;
  return `${prefix}SELECT DISTINCT ${value} AS Value\nFROM (\n${body.trim()}\n) AS src\nORDER BY Value${option ? "\n" + option : ""}`;
}
