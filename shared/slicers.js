import { family } from "./constants.js";
import { idLike, pad } from "./text.js";
import { parseLocalDate, startOfDay, fmtDate } from "./dates.js";

/**
 * Slicers are the filters report readers change themselves in SSRS (report parameters). Each starts on "All".
 * A slicer is { col, kind, def? }; the kinds a column offers depend on its type. Date ranges can start on a
 * default instead of All: def = { preset, from, to } (see DATE_PRESETS).
 */
export const SLICER_KINDS = {
  Text: [["list", "Pick from a list"], ["search", "Type to search"]],
  Number: [["range", "From / to"]],
  Date: [["range", "From / to"]],
  Boolean: [["yesno", "All, Yes or No"]],
};

/** Shown for empty values in pick lists, here and in SSRS. */
export const BLANK = "(Blank)";

export const slicerKinds = (col) => SLICER_KINDS[family(col.type)];

/**
 * Defaults a date range can start on. Rolling ones are worked out when the report runs ("to date" ends today),
 * so the report keeps opening on the current period; "custom" uses fixed dates.
 */
export const DATE_PRESETS = [
  ["none", "All dates"], ["today", "Today"], ["last7", "Last 7 days"], ["last30", "Last 30 days"],
  ["mtd", "Month to date"], ["lastmonth", "Last month"], ["qtd", "Quarter to date"], ["ytd", "Year to date"],
  ["lastyear", "Last year"], ["custom", "Fixed dates"],
];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Cleans a date range default from the client: a known preset, and fixed dates only as YYYY-MM-DD. */
export function cleanDateDefault(def) {
  const preset = DATE_PRESETS.some((p) => p[0] === def?.preset) ? def.preset : "none";
  if (preset !== "custom") return { preset, from: "", to: "" };
  const d = (x) => (ISO.test(x ?? "") && parseLocalDate(x) ? x : "");
  return { preset, from: d(def.from), to: d(def.to) };
}

/** The dates a default stands for on a given day, as { from, to } in YYYY-MM-DD ("" = no limit). */
export function presetRange(def, today = new Date()) {
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const y = today.getFullYear(), m = today.getMonth(), t = iso(today);
  const day = (yy, mm, dd) => iso(new Date(yy, mm, dd));
  switch (def?.preset) {
    case "today": return { from: t, to: t };
    case "last7": return { from: day(y, m, today.getDate() - 6), to: t };
    case "last30": return { from: day(y, m, today.getDate() - 29), to: t };
    case "mtd": return { from: day(y, m, 1), to: t };
    case "lastmonth": return { from: day(y, m - 1, 1), to: day(y, m, 0) };
    case "qtd": return { from: day(y, m - (m % 3), 1), to: t };
    case "ytd": return { from: day(y, 0, 1), to: t };
    case "lastyear": return { from: day(y - 1, 0, 1), to: day(y - 1, 11, 31) };
    case "custom": return { from: def.from || "", to: def.to || "" };
    default: return { from: "", to: "" };
  }
}

/** Keeps slicers whose column is still in the report; a kind that no longer fits the column's type is reset. */
export function liveSlicers(slicers, colsByKey) {
  return slicers.filter((s) => colsByKey[s.col]).map((s) => {
    const c = colsByKey[s.col], kinds = slicerKinds(c);
    const out = kinds.some((k) => k[0] === s.kind) ? s : { ...s, kind: kinds[0][0] };
    if (out.def && !(out.kind === "range" && family(c.type) === "Date")) { const { def, ...rest } = out; return rest; }
    return out;
  });
}

/**
 * The cells a slicer takes in SSRS's parameter bar: one, or two for a range (from and to), as SSRS shows them.
 * Each item: { id, s, side? }. Ids are what the layout stores positions under.
 */
export function slicerItems(slicers) {
  return slicers.flatMap((s) => (s.kind === "range"
    ? [{ id: `${s.col}:from`, s, side: "from" }, { id: `${s.col}:to`, s, side: "to" }]
    : [{ id: s.col, s }]));
}

/**
 * The name of a parameter cell, shown above its box here and in SSRS: the user's own name (s.prompts.main, or
 * .from/.to for a range), otherwise e.g. "Territory", "Customer contains", "Order date from".
 */
export function itemPrompt(s, side, col, tpl) {
  const own = String(s.prompts?.[side || "main"] ?? "").trim();
  if (own) return own;
  const unit = col.type === "Percentage" ? " (%)" : col.type === "Currency" ? ` (${tpl.currency})` : "";
  return s.kind === "search" ? `${col.label} contains` : side ? `${col.label} ${side}${unit}` : col.label;
}

/** The slicer's name in the "Showing:" line: its own name, except for ranges (two names), which use the column's. */
export const slicerName = (s, col) => (s.kind !== "range" && String(s.prompts?.main ?? "").trim()) || col.label;

export const PROMPT_MAX = 100;

/** Cleans names from the client: only main/from/to, trimmed text. */
export function cleanPrompts(p) {
  if (!p || typeof p !== "object") return undefined;
  const out = {};
  for (const k of ["main", "from", "to"]) if (typeof p[k] === "string" && p[k].trim()) out[k] = p[k].trim().slice(0, PROMPT_MAX);
  return Object.keys(out).length ? out : undefined;
}

export const GRID_MAX_COLS = 8;
export const GRID_MAX_ROWS = 20;

/**
 * Places parameter cells on the parameter bar grid. layout: { cols, rows, cells: { id: [row, col] } } as saved by
 * the user (may be stale). Saved positions are kept when they fit and don't collide; everything else fills the first
 * free cells in order. The grid grows to fit every item. Returns the same shape, complete.
 */
export function layoutGrid(ids, layout = {}) {
  const int = (x, lo, hi, d) => (Number.isInteger(x) ? Math.min(hi, Math.max(lo, x)) : d);
  const cols = int(layout.cols, 1, GRID_MAX_COLS, 4);
  if (!ids.length) return { cols, rows: 0, cells: {} };
  const rows = Math.max(int(layout.rows, 1, GRID_MAX_ROWS, 1), Math.ceil(ids.length / cols));
  const cells = {}, taken = new Set();
  for (const id of ids) {
    const p = layout.cells?.[id];
    if (Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[1] >= 0 && p[0] < rows && p[1] < cols && !taken.has(`${p[0]},${p[1]}`)) {
      cells[id] = [p[0], p[1]];
      taken.add(`${p[0]},${p[1]}`);
    }
  }
  let next = 0;
  for (const id of ids) {
    if (cells[id]) continue;
    while (taken.has(`${Math.floor(next / cols)},${next % cols}`)) next++;
    cells[id] = [Math.floor(next / cols), next % cols];
    taken.add(`${cells[id][0]},${cells[id][1]}`);
  }
  return { cols, rows, cells };
}

/** The preview's starting choices: date ranges on their default, everything else on All. */
export function slicerDefaults(slicers, today = new Date()) {
  const v = {};
  for (const s of slicers) if (s.def && s.def.preset !== "none") v[s.col] = presetRange(s.def, today);
  return v;
}

/** How a value appears in a pick list. Matches the SQL that builds the list in SSRS (trimmed, blanks grouped). */
export function sliceKey(v) {
  const s = v === null || v === undefined ? "" : String(v).trimEnd();
  return s === "" ? BLANK : s;
}

/** The distinct pick-list values of a column, sorted. */
export function sliceOptions(rows, key) {
  return [...new Set(rows.map((r) => sliceKey(r[key])))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/**
 * Suggests slicers from the sample rows: the first date, text columns with a short list of repeating values
 * (status, region, product…), and the first yes/no column.
 */
export function suggestSlicers(cols, rows, max = 5) {
  const date = cols.filter((c) => family(c.type) === "Date").slice(0, 1);
  const lists = rows.length < 5 ? [] : cols
    .filter((c) => family(c.type) === "Text" && !idLike(c.name))
    .map((c) => ({ c, n: new Set(rows.map((r) => sliceKey(r[c.key]))).size }))
    .filter(({ n }) => n >= 2 && n <= 30 && n <= rows.length * 0.5)
    .sort((a, b) => a.n - b.n)
    .slice(0, 3)
    .map(({ c }) => c);
  const yesno = cols.filter((c) => c.type === "Boolean").slice(0, 1);
  return [...date, ...lists, ...yesno].slice(0, max).map((c) => ({ col: c.key, kind: slicerKinds(c)[0][0] }));
}

/** The kind a newly added slicer starts as: text with many different values (names, order numbers) gets a search box. */
export function defaultSlicerKind(col, rows) {
  if (family(col.type) !== "Text") return slicerKinds(col)[0][0];
  return idLike(col.name) || new Set(rows.map((r) => sliceKey(r[col.key]))).size > 30 ? "search" : "list";
}

/** Whether a reader's choice for a slicer narrows anything. values: list -> [keys], search -> text, range -> {from,to}, yesno -> "Yes"/"No". */
export function sliceActive(s, v) {
  if (v === undefined || v === null) return false;
  if (s.kind === "list") return Array.isArray(v);
  if (s.kind === "search") return String(v).trim() !== "";
  if (s.kind === "range") return (v.from ?? "") !== "" || (v.to ?? "") !== "";
  if (s.kind === "yesno") return v === "Yes" || v === "No";
  return false;
}

function testSlice(x, s, v, col) {
  if (s.kind === "list") return v.includes(sliceKey(x));
  if (s.kind === "search") return x !== null && String(x).toLowerCase().includes(String(v).trim().toLowerCase());
  if (s.kind === "yesno") return x !== null && x === (v === "Yes");
  if (x === null) return false;
  if (family(col.type) === "Date") {
    const day = startOfDay(x), a = parseLocalDate(v.from), b = parseLocalDate(v.to);
    return (!a || day >= a.getTime()) && (!b || day <= b.getTime());
  }
  const scale = col.type === "Percentage" ? 100 : 1; // entered as 15, stored as 0.15
  const eps = 1e-9;
  return ((v.from ?? "") === "" || x >= parseFloat(v.from) / scale - eps) && ((v.to ?? "") === "" || x <= parseFloat(v.to) / scale + eps);
}

/** The line SSRS prints under the header, e.g. "Territory: Canada, France  |  Order date: All". */
export function describeSlices(slicers, values, colsByKey, tpl) {
  return slicers.filter((s) => colsByKey[s.col]).map((s) => {
    const c = colsByKey[s.col], v = values[s.col];
    const label = `${slicerName(s, c)}: `;
    if (!sliceActive(s, v)) return label + "All";
    if (s.kind === "list") return label + v.join(", ");
    if (s.kind === "search") return `${label}contains “${String(v).trim()}”`;
    if (s.kind === "yesno") return label + v;
    const show = (x) => (family(c.type) === "Date" ? fmtDate(parseLocalDate(x), tpl.dateFormat) : `${x}${c.type === "Percentage" ? "%" : ""}`);
    const from = (v.from ?? "") !== "", to = (v.to ?? "") !== "";
    return label + (from && to ? `${show(v.from)} to ${show(v.to)}` : from ? `from ${show(v.from)}` : `up to ${show(v.to)}`);
  }).join("  |  ");
}

/** What SSRS does with the readers' choices, for the preview. values: { [col key]: choice }. */
export function applySlicers(rows, slicers, values, colsByKey) {
  const active = slicers.filter((s) => colsByKey[s.col] && sliceActive(s, values[s.col]));
  if (!active.length) return rows;
  return rows.filter((r) => active.every((s) => testSlice(r[s.col], s, values[s.col], colsByKey[s.col])));
}
