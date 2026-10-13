import { useState } from "react";
import { DEFAULT_TPL, templateStyle } from "@report-builder/shared";
import TypeBadge from "../components/TypeBadge.jsx";
import ReportDocument from "../components/ReportDocument.jsx";
import TemplateSettings from "../components/TemplateSettings.jsx";
import { useTemplates } from "../hooks/useTemplates.js";

const DEFAULT_NAME = "LoanMart (default)";

export default function TemplateStep({ tpl, setTpl, effCols, previewProps }) {
  const { templates, message, setMessage } = useTemplates();
  const [chosen, setChosen] = useState(tpl.name || "");
  // Column settings show one column at a time, picked from a dropdown
  const [editKey, setEditKey] = useState(null);
  const editIdx = Math.max(0, effCols.findIndex((c) => c.key === editKey));
  const ec = effCols[editIdx];
  const saved = templates.find((s) => s.name === chosen);

  const patch = (p) => setTpl((t) => ({ ...t, ...p }));
  const patchCol = (name, p) => setTpl((t) => ({ ...t, cols: { ...t.cols, [name]: { ...(t.cols[name] || {}), ...p } } }));
  function move(name, dir) {
    const names = effCols.map((c) => c.name);
    const i = names.indexOf(name), j = i + dir;
    if (j < 0 || j >= names.length) return;
    [names[i], names[j]] = [names[j], names[i]];
    setTpl((t) => ({ ...t, order: [...names, ...t.order.filter((n) => !names.includes(n))] }));
  }

  /** Applies a template's look to this report. The report's own column settings stay as they are. */
  function apply(found) {
    setTpl((t) => ({ ...t, ...templateStyle(found), name: found.name }));
    setChosen(found.name);
    setMessage(`Applied “${found.name || DEFAULT_NAME}”.`);
  }

  return (
    <div className="tpl-grid">
      <div className="panel">
        <div className="group">
          <h3>Templates</h3>
          <div className="row" style={{ marginBottom: 10 }}>
            <select className="sel" style={{ flex: 1, minWidth: 160 }} value={chosen} onChange={(e) => setChosen(e.target.value)} aria-label="Template">
              <option value="">{DEFAULT_NAME}</option>
              {templates.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <button className="btn btn-sm" onClick={() => apply(saved || DEFAULT_TPL)}>Apply</button>
          </div>
          <p className="fld-hint">
            {message || "Changes below apply to this report only."}{" "}
            <a href="#/templates">Create or edit templates</a> in the template designer.
          </p>
        </div>

        <TemplateSettings tpl={tpl} patch={patch} />

        <div className="group">
          <h3>Columns ({effCols.length})</h3>
          {ec && (
            <>
              <select className="sel colset-pick" value={ec.key} onChange={(e) => setEditKey(e.target.value)} aria-label="Column to edit">
                {effCols.map((c, i) => <option key={c.key} value={c.key}>{i + 1}. {c.label}</option>)}
              </select>
              <div className="colset">
                <div className="kv">
                  <label htmlFor="col-head">Heading</label>
                  <input id="col-head" className="inp" value={ec.label} onChange={(e) => patchCol(ec.name, { label: e.target.value })} />
                  <span>Type</span>
                  <span><TypeBadge type={ec.type} showType /></span>
                  <label htmlFor="col-align">Align</label>
                  <select id="col-align" className="sel" value={ec.align} onChange={(e) => patchCol(ec.name, { align: e.target.value })}>
                    <option value="auto">Auto</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                  </select>
                  <label htmlFor="col-width">Width</label>
                  <select id="col-width" className="sel" value={ec.width} onChange={(e) => patchCol(ec.name, { width: e.target.value })}>
                    <option value="auto">Auto</option><option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option>
                  </select>
                  <span>Position</span>
                  <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <button className="btn btn-sm" onClick={() => move(ec.name, -1)} disabled={editIdx === 0} aria-label="Move column left">← Left</button>
                    <button className="btn btn-sm" onClick={() => move(ec.name, 1)} disabled={editIdx === effCols.length - 1} aria-label="Move column right">Right →</button>
                  </span>
                </div>
                <label className="check"><input type="checkbox" checked={ec.wrap} onChange={(e) => patchCol(ec.name, { wrap: e.target.checked })} />Wrap long text</label>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="tpl-preview">
        <ReportDocument {...previewProps} limit={10} />
      </div>
    </div>
  );
}
