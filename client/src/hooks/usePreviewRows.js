import { useEffect, useMemo, useState } from "react";
import { coerce } from "@report-builder/shared";
import { api } from "../api.js";

/**
 * Runs the query on the server (first N rows) once per analysis and returns typed rows keyed by column key.
 * Changing a column's type only re-converts the rows already loaded; it doesn't query again.
 * `count` is every row the query returns: the loaded rows when that's all of them, otherwise counted on the server
 * afterwards (`counting` while it runs; null if the count failed).
 */
export function usePreviewRows({ connectionId, sql, analysisKey, columns, onExpired }) {
  const [state, setState] = useState({ key: null, raw: [], truncated: false, limit: 0, count: null, counting: false, error: "", loading: false });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!analysisKey || !connectionId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.preview(connectionId, sql)
      .then((r) => {
        if (cancelled) return;
        setState({ key: analysisKey, raw: r.rows, truncated: r.truncated, limit: r.limit, count: r.truncated ? null : r.rows.length, counting: r.truncated, error: "", loading: false });
        if (!r.truncated) return;
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
    // analysisKey already encodes the connection and the query text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisKey, nonce]);

  const rows = useMemo(() => {
    if (state.key !== analysisKey) return [];
    return state.raw.map((arr) => Object.fromEntries(columns.map((c) => [c.key, coerce(arr[c.index], c.type)])));
  }, [state, columns, analysisKey]);

  return {
    rows, loading: state.loading, error: state.error, truncated: state.truncated, limit: state.limit,
    count: state.count, counting: state.counting, refresh: () => setNonce((n) => n + 1),
  };
}
