import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { readDate, resolvePeriod } from "../dashboards/period.js";

/**
 * Runs a dashboard's queries for the date slicer's `slice` and builds what each shows.
 * First the dates its data covers (the department's `dates` column), which the slicer's presets count back from; then
 * the headline and chart queries, all at once, for the resolved period. A dashboard without `dates` is a snapshot and
 * runs its queries straight away.
 * Returns { results, period, range, loading, refresh }: `results[id]` is { data } (null when there was nothing to show)
 * or { error }, with `loading` while its query runs; a reload keeps the last data so the charts hold their place.
 * `range` is { first, last } once read. A connection the server has forgotten goes to `onExpired`.
 */
export function useDashboard({ connectionId, department, slice, onExpired }) {
  // The dates the data covers. `version` moves on each time a read finishes, which runs the queries again.
  const [range, setRange] = useState({ dept: null, status: "loading", version: 0 });
  const [results, setResults] = useState({ dept: null, map: {} });
  const [nonce, setNonce] = useState(0);

  const expired = (e) => { if (e.status === 410) onExpired?.(e); };

  useEffect(() => {
    if (!connectionId) return;
    let cancelled = false;
    const done = (r) => { if (!cancelled) setRange((s) => ({ ...r, dept: department.id, version: s.version + 1 })); };
    if (!department.dates) { done({ status: "none" }); return; }
    setRange((s) => ({ ...s, status: "loading" }));
    const { table, column } = department.dates;
    api.preview(connectionId, `SELECT MIN(${column}) AS FirstDate, MAX(${column}) AS LastDate FROM ${table}`)
      .then((r) => {
        const [first, last] = (r.rows[0] || []).map(readDate);
        done(first && last ? { status: "ready", first, last } : { status: "error", error: `There are no rows in ${table} yet.` });
      })
      .catch((e) => { if (!cancelled) { expired(e); done({ status: "error", error: e.message }); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, department, nonce]);

  const current = range.dept === department.id && range.status !== "loading";
  const period = useMemo(
    () => (current && range.status === "ready" ? resolvePeriod(slice, range.first, range.last) : null),
    [current, range, slice],
  );
  const periodKey = period ? Object.values(period.sql).join("|") + period.grain : "";

  useEffect(() => {
    if (!connectionId || !current) return;
    let cancelled = false;
    const queries = [department.headline, ...department.charts];
    const settle = (id, result) => { if (!cancelled) setResults((r) => ({ ...r, map: { ...r.map, [id]: result } })); };
    if (range.status === "error") {
      setResults({ dept: department.id, map: Object.fromEntries(queries.map((q) => [q.id, { error: range.error }])) });
      return;
    }
    // Same dashboard: keep what's on screen while it reloads. Another dashboard: start empty.
    setResults((r) => ({
      dept: department.id,
      map: Object.fromEntries(queries.map((q) => [q.id, { ...(r.dept === department.id ? r.map[q.id] : {}), loading: true }])),
    }));
    for (const q of queries) {
      api.preview(connectionId, typeof q.sql === "function" ? q.sql(period) : q.sql)
        .then((r) => settle(q.id, { data: q.build(r.rows, period) || null }))
        .catch((e) => { if (!cancelled) { expired(e); settle(q.id, { error: e.message }); } });
    }
    return () => { cancelled = true; };
    // The period is read through periodKey, and the range through its version
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, department, current, range.version, periodKey]);

  const map = results.dept === department.id ? results.map : {};
  const loading = !current || Object.values(map).some((r) => r.loading);
  return {
    results: map, period, loading,
    range: current && range.status === "ready" ? { first: range.first, last: range.last } : null,
    refresh: () => setNonce((n) => n + 1),
  };
}
