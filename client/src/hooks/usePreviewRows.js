import { useEffect, useMemo, useState } from "react";
import { coerce } from "@report-builder/shared";
import { api } from "../api.js";

/**
 * Runs the query on the server (first N rows) once per analysis and returns typed rows keyed by column key.
 * Changing a column's type only re-converts the rows already loaded; it doesn't query again.
 * `count` is every row the query returns: the loaded rows when that's all of them, otherwise counted on the server
 * afterwards (`counting` while it runs; null if the count failed).
 * `all` loads every row (up to the server's safety ceiling) rather than the first few, for charts that sum them up;
 * changing it loads the rows again.
 */
export function usePreviewRows({ connectionId, sql, analysisKey, columns, onExpired, all = false }) {
  const [state, setState] = useState({ key: null, raw: [], truncated: false, limit: 0, count: null, counting: false, error: "", loading: false });
  const [nonce, setNonce] = useState(0);
  const loadKey = analysisKey && `${analysisKey}\u0000${all ? "all" : ""}`;

  useEffect(() => {
    if (!analysisKey || !connectionId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.preview(connectionId, sql, { all })
      .then((r) => {
        if (cancelled) return;
        setState({ key: loadKey, raw: r.rows, truncated: r.truncated, limit: r.limit, count: r.truncated ? null : r.rows.length, counting: r.truncated && !all, error: "", loading: false });
        if (!r.truncated || all) return; // nothing shows a count of every row when they were all asked for
        api.count(connectionId, sql)
          .then((c) => { if (!cancelled) setState((s) => ({ ...s, count: c.count, counting: false })); })
          .catch(() => { if (!cancelled) setState((s) => ({ ...s, counting: false })); });
      })
      .catch((e) => {
        if (cancelled) return;
        if (e.status === 410) onExpired?.(e);
        setState((s) => ({ ...s, loading: false, error: e.message }));
      });
    return () => { cancelled = true; };
    // loadKey already encodes the connection, the query text and whether every row is wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadKey, nonce]);

  // Keyed on the loaded rows only, so loading flags and the count arriving don't convert every row again
  const { key, raw } = state;
  const rows = useMemo(() => {
    if (key !== loadKey) return [];
    return raw.map((arr) => Object.fromEntries(columns.map((c) => [c.key, coerce(arr[c.index], c.type)])));
  }, [key, raw, columns, loadKey]);

  return {
    rows, loading: state.loading, error: state.error, truncated: state.truncated, limit: state.limit,
    count: state.count, counting: state.counting, refresh: () => setNonce((n) => n + 1),
  };
}
