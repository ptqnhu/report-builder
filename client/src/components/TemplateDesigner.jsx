import { useMemo, useState } from "react";
import { DEFAULT_TPL, effectiveColumns, keyBy, sortRows } from "@report-builder/shared";
import TemplateSettings from "./TemplateSettings.jsx";
import ReportDocument from "./ReportDocument.jsx";
import { SAMPLE_COLUMNS, SAMPLE_ROWS } from "../utils/sampleData.js";

/**
 * Designs a reusable template on a sample loan dataset rather than a real query, so it only holds
 * report-wide settings and fits any report. `start` is the template to begin from (with `name` when editing one).
 * onSave(template) stores it.
 */
export default function TemplateDesigner({ start, names, onSave, onCancel, message }) {
  const editing = start.name;
  const [draft, setDraft] = useState({ ...start, order: [], cols: {} });
  const [sort, setSort] = useState(null);
  const [problem, setProblem] = useState("");
  const patch = (p) => setDraft((d) => ({ ...d, ...p }));

  const cols = useMemo(() => effectiveColumns(SAMPLE_COLUMNS, { ...DEFAULT_TPL, ...draft }), [draft]);
  const colsByKey = useMemo(() => keyBy(cols), [cols]);
  const rows = useMemo(() => sortRows(SAMPLE_ROWS, sort, colsByKey), [sort, colsByKey]);
  const toggleSort = (key) => setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));

  async function save() {
    const name = draft.name.trim();
    if (!name) return setProblem("Name the template before saving it.");
    if (name !== editing && names.includes(name) && !window.confirm(`A template called “${name}” already exists. Replace it?`)) return;
    setProblem("");
    await onSave({ ...draft, name });
  }

  return (
    <div className="tpl-grid">
      <div className="panel">
        <div className="group">
          <label className="fld">
            <span className="fld-label">Template name</span>
            <input className="inp" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Collections monthly" autoFocus />
          </label>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={save}>Save template</button>
            <button className="btn btn-quiet btn-sm" onClick={onCancel}>Cancel</button>
          </div>
          {(problem || message) && <p className="fld-hint">{problem || message}</p>}
        </div>
        <TemplateSettings tpl={draft} patch={patch} />
      </div>

      <div className="tpl-preview">
        <ReportDocument cols={cols} rows={rows} totalRows={rows.length} tpl={{ ...DEFAULT_TPL, ...draft }} colsByKey={colsByKey}
          title="Sample report" desc="Example loans, to show how the template looks" sort={sort} onSort={toggleSort} />
      </div>
    </div>
  );
}
