import { useEffect, useState } from "react";
import { api } from "../api.js";

const EMPTY = { rdl: "", fileName: "", warnings: [], problem: "", loading: false, error: "" };

/** Asks the server to build the .rdl whenever the report changes (debounced). */
export function useRdlExport(payload, enabled) {
  const [state, setState] = useState(EMPTY);
  const body = enabled ? JSON.stringify(payload) : null;

  useEffect(() => {
    if (!body) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(async () => {
      try {
        const r = await api.rdl(JSON.parse(body));
        if (!cancelled) setState({ ...EMPTY, rdl: r.rdl || "", fileName: r.fileName || "", warnings: r.warnings || [], problem: r.problem || "" });
      } catch (e) {
        if (!cancelled) setState({ ...EMPTY, error: e.message });
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [body]);

  return state;
}
