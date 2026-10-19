import company from "./company.js";
import sales from "./sales.js";
import purchasing from "./purchasing.js";
import humanResources from "./humanResources.js";

/**
 * The dashboards (#/dashboards/<id>), in the order the drop-down lists them. The first, the business overview, is
 * also the home page.
 * Each one is a file in this folder:
 * - id, name, summary: the drop-down entry and the page heading ("<name> overview", or `heading` when given).
 * - tables: the tables its queries read, named in the message when the database doesn't have them.
 * - dates: { table, column, what } the date the slicer filters on ("order date"), whose first and last values the
 *   presets count from. Left out for a snapshot, which the slicer doesn't change.
 * - headline: { sql, build } giving { tiles }: the headline numbers.
 * - charts: [{ id, kind ("line" | "bar" | "share"), title, why, sql, build }].
 *   `sql(period)` returns the query for the slicer's period (see period.js; helpers.js has the WHERE clauses), or is
 *   a plain string for a snapshot. `build(rows, period)` gets arrays in the query's column order and returns the rest
 *   of a <ChartCard> chart (x, measure, series / bars / parts), or null when there's nothing to show.
 * Every query is a single read-only SELECT (or WITH), run as the dashboard opens.
 */
export const DEPARTMENTS = [company, sales, purchasing, humanResources];

export const departmentOf = (id) => DEPARTMENTS.find((d) => d.id === id) || DEPARTMENTS[0];
