import { fmtDate } from "@report-builder/shared";
import { periodSteps, readDate } from "./period.js";

/**
 * Building blocks for the dashboard files: SQL for the slicer's period `p` (see period.js), measure columns, and
 * turning rows into chart data.
 */

/** `col` in the selected period. */
export const inPeriod = (col, p) => `(${col} >= ${p.sql.from} AND ${col} < ${p.sql.to})`;
/** `col` in the selected period or the one it's compared with. */
export const withPrior = (col, p) =>
  p.compare ? `(${inPeriod(col, p)} OR (${col} >= ${p.sql.prevFrom} AND ${col} < ${p.sql.prevTo}))` : inPeriod(col, p);
/** 1 for a row of the selected period, 0 for one of the period before (on rows filtered by withPrior). */
export const isCurrent = (col, p) => `CASE WHEN ${col} >= ${p.sql.from} THEN 1 ELSE 0 END`;
/**
 * The point on a trend chart's axis `col` falls on: its day, its week's Monday, or its month's first day.
 * (Day 0, 1 Jan 1900, was a Monday, so whole weeks counted from it start on Mondays whatever DATEFIRST is.)
 */
export const step = (col, p) => ({
  day: `CAST(${col} AS date)`,
  week: `DATEADD(day, DATEDIFF(day, 0, ${col}) / 7 * 7, 0)`,
  month: `DATEADD(month, DATEDIFF(month, 0, ${col}), 0)`,
})[p.grain];

const col = (type) => (key, label) => ({ key, name: label, label, type });
export const money = col("Currency");
export const whole = col("Integer");
export const decimal = col("Decimal");
export const percent = col("Percentage");

export const num = (v) => Number(v) || 0;
/** The change from `before` to `now` as a fraction, or null when there's nothing to compare with. */
export const change = (now, before) => (before > 0 ? (now - before) / before : null);
/** What a tile's change is against: "vs Jul 2012 – Jun 2013". */
export const versus = (p) => `vs ${p.prevLabel}`;

/** Ranked bars from [name, value] rows. */
export const bars = (rows) => rows.map(([name, value]) => ({ name: name ?? "(Blank)", value: num(value) }));

/** A share bar from [name, value] rows, or null when there's no total to share. */
export function share(rows, measure) {
  const parts = bars(rows).filter((p) => p.value > 0);
  const total = parts.reduce((a, p) => a + p.value, 0);
  return parts.length && total > 0 ? { measure, total, parts } : null;
}

/**
 * Lines across the period from [step, ...values] rows (a query grouped by `step`), one value per series name.
 * Every day, week or month of the period is on the axis, so one with nothing shows as 0 rather than being skipped.
 */
export function timeline(rows, p, measure, names) {
  const steps = periodSteps(p);
  if (steps.length < 2) return null;
  const byStep = new Map(rows.map(([at, ...vals]) => [readDate(at)?.getTime(), vals.map(num)]));
  return {
    x: { label: { day: "Day", week: "Week starting", month: "Month" }[p.grain], values: steps.map((d) => fmtDate(d, p.grain === "month" ? "MMM YYYY" : "")) },
    measure,
    series: names.map((name, i) => ({ name, values: steps.map((d) => byStep.get(d.getTime())?.[i] ?? 0) })),
  };
}
