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
 * Splits the report query so it can become a derived table: [prefix]SELECT … FROM (<body>) AS src[option].
 * A leading WITH goes in prefix, OPTION (…) moves to the outside, and a final ORDER BY is dropped unless TOP or
 * OFFSET needs it. Returns null when the query can't be wrapped (FOR XML/JSON).
 */
function derivedTable(sql) {
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
  return { prefix, body: body.trim(), option: option ? "\n" + option : "" };
}

/**
 * SQL listing the distinct values of one column of the report query, for an SSRS pick list:
 *   [WITH …] SELECT DISTINCT <column as trimmed text, blanks as "(Blank)"> AS Value FROM (<query>) AS src ORDER BY Value
 * Returns null when the query can't be wrapped (see derivedTable).
 */
export function distinctValuesQuery(sql, column) {
  const t = derivedTable(sql);
  if (!t) return null;
  const value = `ISNULL(NULLIF(RTRIM(CONVERT(nvarchar(4000), src.${quoteName(column)})), N''), N'${BLANK}')`;
  return `${t.prefix}SELECT DISTINCT ${value} AS Value\nFROM (\n${t.body}\n) AS src\nORDER BY Value${t.option}`;
}

/** SQL counting the rows of the report query: [WITH …] SELECT COUNT_BIG(*) FROM (<query>) AS src. null if it can't be wrapped. */
export function countQuery(sql) {
  const t = derivedTable(sql);
  if (!t) return null;
  return `${t.prefix}SELECT COUNT_BIG(*) AS n\nFROM (\n${t.body}\n) AS src${t.option}`;
}
