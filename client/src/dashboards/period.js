import { fmtDate, parseLocalDate } from "@report-builder/shared";

/**
 * The dashboards' date slicer: a preset (or a custom range) turned into the dates every query uses.
 * Presets count back from the newest date in the dashboard's data rather than from today, so a database that stopped
 * updating still shows its last stretch; on live data the two are the same.
 */

export const PRESETS = [
  ["30d", "Last 30 days"],
  ["3m", "Last 3 months"],
  ["6m", "Last 6 months"],
  ["12m", "Last 12 months"],
  ["ytd", "Year to date"],
  ["year", "Last full year"],
  ["all", "All time"],
  ["custom", "Custom range"],
];

/** What the slicer starts on. `from` and `to` (YYYY-MM-DD, both included) are only used by "custom". */
export const DEFAULT_SLICE = { preset: "12m", from: "", to: "" };

const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** `d` moved by `n` months, kept on the same day of the month (or the month's last day when it's shorter). */
function addMonths(d, n) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}
const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const days = (from, to) => Math.round((to - from) / 86_400_000);

/** 2014-06-30 */
export const isoDate = (d) => fmtDate(d, "YYYY-MM-DD");
/** A date from the server ("2014-06-30T00:00:00") or a date input ("2014-06-30"), as a local date. */
export const readDate = (v) => (v ? parseLocalDate(String(v).slice(0, 10)) : null);

/** "Jul 2013 – Jun 2014" for whole months, otherwise "1 Jul 2013 – 15 Jun 2014". `to` is the day after the last. */
function rangeLabel(from, to) {
  const last = addDays(to, -1);
  if (from.getDate() === 1 && to.getDate() === 1) {
    const a = fmtDate(from, "MMM YYYY"), b = fmtDate(last, "MMM YYYY");
    return a === b ? a : `${a} – ${b}`;
  }
  const a = fmtDate(from, ""), b = fmtDate(last, "");
  return a === b ? a : `${a} – ${b}`;
}

/**
 * The period a slice covers, given the first and last dates in the data: { from, to } (to is the day after the last
 * day), the period before it to compare with ({ prevFrom, prevTo }, when `compare`), labels for both, the SQL date
 * literals, and the grain trend charts use: by day up to 45 days, by week (starting Monday) up to about six
 * months, otherwise by month.
 */
export function resolvePeriod(slice, first, last) {
  first = day(first);
  last = day(last);
  const end = addDays(last, 1);
  let from, to = end, shift = null; // shift: months between the period and the one it's compared with
  const months = { "3m": 3, "6m": 6, "12m": 12 }[slice.preset];
  if (months) {
    from = addMonths(monthStart(last), -(months - 1));
    shift = months;
  } else if (slice.preset === "30d") {
    from = addDays(last, -29);
  } else if (slice.preset === "ytd") {
    from = new Date(last.getFullYear(), 0, 1);
    shift = 12;
  } else if (slice.preset === "year") {
    // The last calendar year the data covers to its end
    const y = last.getMonth() === 11 && last.getDate() === 31 ? last.getFullYear() : last.getFullYear() - 1;
    from = new Date(y, 0, 1);
    to = new Date(y + 1, 0, 1);
    shift = 12;
  } else if (slice.preset === "custom") {
    from = readDate(slice.from) || first;
    to = slice.to && readDate(slice.to) ? addDays(readDate(slice.to), 1) : end;
    if (to <= from) [from, to] = [addDays(to, -1), addDays(from, 1)];
  } else {
    from = first; // all time
  }

  const compare = slice.preset !== "all";
  const prevFrom = !compare ? from : shift ? addMonths(from, -shift) : addDays(from, -days(from, to));
  const prevTo = !compare ? from : shift ? addMonths(to, -shift) : from;
  const lit = (d) => `'${isoDate(d)}'`;
  return {
    from, to, prevFrom, prevTo, compare,
    grain: days(from, to) <= 45 ? "day" : days(from, to) <= 190 ? "week" : "month",
    label: rangeLabel(from, to),
    prevLabel: compare ? rangeLabel(prevFrom, prevTo) : "",
    sql: { from: lit(from), to: lit(to), prevFrom: lit(prevFrom), prevTo: lit(prevTo) },
  };
}

/** Every point on a trend chart's axis for the period: each day, each week's Monday or each month's first day. */
export function periodSteps(p) {
  const start = { day: p.from, week: addDays(p.from, -((p.from.getDay() + 6) % 7)), month: monthStart(p.from) }[p.grain];
  const next = { day: (d) => addDays(d, 1), week: (d) => addDays(d, 7), month: (d) => addMonths(d, 1) }[p.grain];
  const out = [];
  for (let d = start; d < p.to; d = next(d)) out.push(d);
  return out;
}
