import { NUMERIC, idLike, BLANK, DEFAULT_TPL, formatValue, fmtDate, startOfDay } from "@report-builder/shared";

/**
 * Suggests charts for a query's rows, from the columns' types alone (nothing is sent anywhere).
 * - Numbers (not ID-like: LoanId, Year, ZipCode) are measures; dates are time; text, yes/no and ID-like numbers are
 *   categories.
 * - Date + measure: a trend line (split by a category when there is one). Category + measure: a ranked bar, and the
 *   share of the total when the measure adds up. No measure: rows counted per category or per month.
 * Charts may get every row the query returns (up to 100,000), so each step makes as few passes over them as it can.
 * Returns { tiles, charts }: headline totals, then the charts, best first.
 */
const MAX_SERIES = 5; // lines on one trend chart
const MAX_BARS = 15;
const MAX_SHARE = 6; // slices in a share bar before the rest fold into "Other"
const MAX_CHARTS = 6;
const ROWS = { key: "__count", name: "Rows", label: "Rows", type: "Integer", count: true }; // counts rows when nothing adds up

const present = (v) => v !== null && v !== undefined && v !== "";
/** Percentages and averages don't add up across rows. */
const summable = (c) => c.type !== "Percentage" && !/(^|_|\b)(avg|average|mean|rate|ratio|pct|percent)/i.test(c.name);
/** A row's value for measure `m` (1 for the row count), as a number. */
const valueOf = (m, r) => (m.count ? 1 : typeof r[m.key] === "number" ? r[m.key] : 0);
/** A category value as the report shows it (the column's case, Yes/No labels), blanks as "(Blank)". */
const catText = (v, c) => (present(v) ? formatValue(v, c, DEFAULT_TPL) : BLANK);
/** "Total" + "Revenue" -> "Total revenue", but "Total" + "Total Revenue" stays "Total revenue". */
const named = (what, label) => (/^(total|sum|avg|average|mean|count|number)\b/i.test(label) ? label : `${what} ${label.toLowerCase()}`);

function distinct(rows, key) {
  const seen = new Set();
  for (const r of rows) seen.add(r[key]);
  return seen.size;
}

export function suggestCharts(cols, rows) {
  if (!rows.length) return { tiles: [], charts: [] };
  const live = cols.filter((c) => rows.some((r) => present(r[c.key])));
  const measures = live.filter((c) => NUMERIC.has(c.type) && !idLike(c.name));
  const dates = live.filter((c) => c.type === "Date" || c.type === "DateTime");
  const others = live.filter((c) => !measures.includes(c) && !dates.includes(c)).map((c) => ({ c, n: distinct(rows, c.key) }));
  const cats = others
    .filter(({ n }) => n > 1 && n < rows.length * 0.9 + 1) // one value tells nothing; all different is a name list
    .sort((a, b) => a.n - b.n)
    .map(({ c }) => c);
  // Rank by the row's own label when each row has one (a TOP 10 of products), else by the category
  const own = rows.length <= 30 && others.find(({ c, n }) => c.type === "Text" && n === rows.length)?.c;
  const date = dates[0], cat = cats[0], label = own || cat;
  const [main, second] = measures;

  const tiles = measures.slice(0, 4).map((m) => {
    let sum = 0, n = 0;
    for (const r of rows) if (typeof r[m.key] === "number") { sum += r[m.key]; n++; }
    if (rows.length === 1) return { col: m, label: m.label, value: sum, note: "" };
    const note = `Across ${rows.length.toLocaleString()} rows`;
    return summable(m)
      ? { col: m, label: named("Total", m.label), value: sum, note }
      : { col: m, label: named("Average", m.label), value: sum / n, note };
  });

  const charts = [];
  const time = date && timeAxis(rows, date);
  if (time && main) {
    // Measures of the same kind share one axis; a different kind of number gets its own chart (never two axes)
    charts.push(trend(rows, date, time, measures.filter((m) => m.type === main.type).slice(0, MAX_SERIES)));
    if (cat && summable(main)) charts.push(trend(rows, date, time, [main], cat));
    const other = measures.find((m) => m.type !== main.type);
    if (other) charts.push(trend(rows, date, time, [other]));
  }
  if (main && label) {
    charts.push(ranked(rows, label, main));
    if (summable(main) && rows.every((r) => !(r[main.key] < 0))) charts.push(shareOf(rows, cat || label, main));
    if (second) charts.push(ranked(rows, label, second));
  }
  if (!main) {
    if (time) charts.push(trend(rows, date, time, [ROWS], null, "Rows per"));
    if (cat) charts.push(ranked(rows, cat, ROWS, "Rows"));
  }

  return { tiles, charts: charts.filter(Boolean).slice(0, MAX_CHARTS) };
}

/**
 * Measure `m` per key: the sum, or the average for a measure that doesn't add up (rates, percentages).
 * `keyOf(row, i)` gives the key, or undefined to leave the row out. Returns a Map in first-seen order.
 */
function sumBy(rows, keyOf, m) {
  const out = new Map(), counts = new Map();
  rows.forEach((r, i) => {
    const k = keyOf(r, i);
    if (k === undefined) return;
    out.set(k, (out.get(k) || 0) + valueOf(m, r));
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  if (!m.count && !summable(m)) for (const [k, v] of out) out.set(k, v / counts.get(k));
  return out;
}

/** How a measure is named in a chart title: "Funded Amount", or "Average rate" for one that is averaged. */
const measureName = (m) => (m.count || summable(m) ? m.label : named("Average", m.label));

const byValue = (map) => [...map].sort((a, b) => b[1] - a[1]);

/**
 * The x axis for a date column, worked out once and shared by every trend chart: each row's point (a day, or a month
 * when there are too many days to read; null for no date), the points in order, and their labels.
 */
function timeAxis(rows, date) {
  const keys = rows.map((r) => (r[date.key] instanceof Date ? startOfDay(r[date.key]) : null));
  const days = new Set(keys);
  days.delete(null);
  const byMonth = days.size > 60;
  if (byMonth) rows.forEach((r, i) => { if (keys[i] !== null) keys[i] = new Date(r[date.key].getFullYear(), r[date.key].getMonth(), 1).getTime(); });
  const xs = (byMonth ? [...new Set(keys)].filter((x) => x !== null) : [...days]).sort((a, b) => a - b);
  const monthly = byMonth || xs.every((x) => new Date(x).getDate() === 1);
  return { keys, xs, labels: xs.map((x) => fmtDate(new Date(x), monthly ? "MMM YYYY" : DEFAULT_TPL.dateFormat)), unit: monthly ? "month" : "day" };
}

/** A line over time: one line per measure, or (with `split`) one line per category for a single measure. */
function trend(rows, date, { keys, xs, labels, unit }, measures, split, verb) {
  if (xs.length < 2) return null;
  const m = measures[0];
  let series, of = 0;
  if (split) {
    // The largest few only: the rest summed into "Other" would tower over them and hide the comparison
    const totals = byValue(sumBy(rows, (r, i) => (keys[i] === null ? undefined : r[split.key]), m));
    if (totals.length < 2) return null;
    of = totals.length;
    const kept = new Map(totals.slice(0, MAX_SERIES).map(([k]) => [k, new Map()]));
    rows.forEach((r, i) => {
      const sums = kept.get(r[split.key]);
      if (sums && keys[i] !== null) sums.set(keys[i], (sums.get(keys[i]) || 0) + valueOf(m, r));
    });
    series = [...kept].map(([k, sums]) => ({ name: catText(k, split), values: xs.map((x) => sums.get(x) ?? 0) }));
  } else {
    series = measures.map((c) => {
      const sums = sumBy(rows, (r, i) => keys[i] ?? undefined, c);
      return { name: measureName(c), values: xs.map((x) => sums.get(x) ?? null) };
    });
  }
  return {
    id: `trend:${date.key}:${measures.map((c) => c.key).join(",")}:${split?.key || ""}`,
    kind: "line",
    title: split ? `${m.label} over time by ${split.label}` : verb ? `${verb} ${unit}` : `${measures.map(measureName).join(", ")} over time`,
    why: split
      ? `${of > MAX_SERIES ? `The ${MAX_SERIES} largest of ${of}, each` : `Each ${split.label.toLowerCase()}`} as its own line, one point per ${unit}.`
      : `One point per ${unit}, from ${date.label}.`,
    x: { label: date.label, values: labels },
    measure: m,
    series,
  };
}

/** A ranked horizontal bar: the measure per category, largest first. */
function ranked(rows, cat, m, verb) {
  const sums = byValue(sumBy(rows, (r) => r[cat.key], m));
  if (sums.length < 2) return null;
  return {
    id: `bar:${cat.key}:${m.key}`,
    kind: "bar",
    title: `${verb || measureName(m)} by ${cat.label}`,
    why: sums.length > MAX_BARS ? `The top ${MAX_BARS} of ${sums.length}, largest first.` : "Largest first, to compare them at a glance.",
    x: { label: cat.label },
    measure: m,
    bars: sums.slice(0, MAX_BARS).map(([k, v]) => ({ name: catText(k, cat), value: v })),
  };
}

/** Part of the whole: each category's share of the measure's total, the smallest folded into "Other". */
function shareOf(rows, cat, m) {
  const sums = byValue(sumBy(rows, (r) => r[cat.key], m));
  const total = sums.reduce((a, [, v]) => a + v, 0);
  if (sums.length < 2 || sums.length > 30 || !(total > 0)) return null;
  const keep = sums.length > MAX_SHARE ? sums.slice(0, MAX_SHARE - 1) : sums;
  const parts = keep.map(([k, v]) => ({ name: catText(k, cat), value: v }));
  if (keep.length < sums.length) parts.push({ name: "Other", value: sums.slice(keep.length).reduce((a, [, v]) => a + v, 0), other: true });
  return {
    id: `share:${cat.key}:${m.key}`,
    kind: "share",
    title: `Share of ${m.label.toLowerCase()} by ${cat.label}`,
    why: "How the total splits up.",
    measure: m,
    total,
    parts,
  };
}
