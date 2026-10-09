import { useEffect, useMemo, useState } from "react";
import { coerce } from "@report-builder/shared";
import { api } from "../api.js";

/**
 * Runs the query on the server (first N rows) once per analysis and returns typed rows keyed by column key.
 * Changing a column's type only re-converts the rows already loaded; it doesn't query again.
 */
export function usePreviewRows({ connectionId, sql, analysisKey, columns, onExpired }) {
  const [state, setState] = useState({ key: null, raw: [], truncated: false, limit: 0, error: "", loading: false });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!analysisKey || !connectionId) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.preview(connectionId, sql)
      .then((r) => { if (!cancelled) setState({ key: analysisKey, raw: r.rows, truncated: r.truncated, limit: r.limit, error: "", loading: false }); })
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

  return { rows, loading: state.loading, error: state.error, truncated: state.truncated, limit: state.limit, refresh: () => setNonce((n) => n + 1) };
}
