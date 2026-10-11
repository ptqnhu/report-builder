import { useState } from "react";
import { DEFAULT_TPL, DATE_FORMATS, fmtDate } from "@report-builder/shared";
import Segmented from "../components/Segmented.jsx";
import TypeBadge from "../components/TypeBadge.jsx";
import ReportDocument from "../components/ReportDocument.jsx";
import { useTemplates } from "../hooks/useTemplates.js";

export default function TemplateStep({ tpl, setTpl, effCols, previewProps }) {
  const { templates, message, setMessage, save, remove } = useTemplates();
  const [chosen, setChosen] = useState("");
  const [saveName, setSaveName] = useState(tpl.name || "");
  // Column settings show one column at a time, picked from a dropdown
  const [editKey, setEditKey] = useState(null);
  const editIdx = Math.max(0, effCols.findIndex((c) => c.key === editKey));
  const ec = effCols[editIdx];

  const patch = (p) => setTpl((t) => ({ ...t, ...p }));
  const patchCol = (name, p) => setTpl((t) => ({ ...t, cols: { ...t.cols, [name]: { ...(t.cols[name] || {}), ...p } } }));
  function move(name, dir) {
    const names = effCols.map((c) => c.name);
    const i = names.indexOf(name), j = i + dir;
    if (j < 0 || j >= names.length) return;
    [names[i], names[j]] = [names[j], names[i]];
    setTpl((t) => ({ ...t, order: [...names, ...t.order.filter((n) => !names.includes(n))] }));
  }

  async function onSave() {
    const name = saveName.trim();
    if (!name) { setMessage("Name the template before saving it."); return; }
    const t = { ...tpl, name };
    if (await save(t)) { setTpl(t); setChosen(name); }
  }
  function onApply() {
    const found = templates.find((s) => s.name === chosen);
    if (!found) return;
    setTpl({ ...DEFAULT_TPL, ...found });
    setSaveName(found.name);
    setMessage(`Applied “${found.name}”. Columns it hasn't seen use default settings.`);
  }
  async function onDelete() {
    if (!chosen) return;
    await remove(chosen);
    setChosen("");
  }

  return (
    <div className="tpl-grid">
      <div className="panel">
        <div className="group">
          <h3>Saved templates</h3>
          {templates.length > 0 && (
            <div className="row" style={{ marginBottom: 10 }}>
              <select className="sel" value={chosen} onChange={(e) => setChosen(e.target.value)} aria-label="Saved template">
                <option value="">Choose a template</option>
                {templates.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <button className="btn btn-sm" onClick={onApply} disabled={!chosen}>Apply</button>
              <button className="btn btn-sm" onClick={onDelete} disabled={!chosen}>Delete</button>
            </div>
          )}
          <div className="row">
            <input className="inp" style={{ flex: 1, minWidth: 140 }} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Template name" aria-label="Template name" />
            <button className="btn btn-sm" onClick={onSave}>Save template</button>
          </div>
          {message && <p className="fld-hint">{message}</p>}
        </div>

        <div className="group">
          <h3>Column layout</h3>
          <label className="radio">
            <input type="radio" name="layout" checked={tpl.layout === "expand"} onChange={() => patch({ layout: "expand" })} />
            <span>Expand for every column<br /><span className="muted">The table grows sideways and scrolls, so any number of columns stays readable.</span></span>
          </label>
          <label className="radio">
            <input type="radio" name="layout" checked={tpl.layout === "fit"} onChange={() => patch({ layout: "fit" })} />
            <span>Fit to page width<br /><span className="muted">Columns share the width and text wraps.</span></span>
          </label>
          {tpl.layout === "expand" && (
            <label className="check" style={{ marginTop: 6 }}>
              <input type="checkbox" checked={tpl.stickyFirst} onChange={(e) => patch({ stickyFirst: e.target.checked })} />
              Keep the first column visible while scrolling
            </label>
          )}
        </div>

        <div className="group">
          <h3>Look</h3>
          <div className="kv">
            <label htmlFor="theme">Style</label>
            <select id="theme" className="sel" value={tpl.theme} onChange={(e) => patch({ theme: e.target.value })}>
              <option value="loanmart">LoanMart</option>
              <option value="ledger">Ledger</option>
              <option value="clean">Clean</option>
              <option value="contrast">Contrast</option>
            </select>
            <span>Row height</span>
            <Segmented label="Row height" value={tpl.density} onChange={(v) => patch({ density: v })}
              options={[["compact", "Compact"], ["normal", "Normal"], ["comfortable", "Roomy"]]} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="check"><input type="checkbox" checked={tpl.zebra} onChange={(e) => patch({ zebra: e.target.checked })} />Shade alternate rows</label>
            <label className="check"><input type="checkbox" checked={tpl.rowNumbers} onChange={(e) => patch({ rowNumbers: e.target.checked })} />Show row numbers</label>
            <label className="check"><input type="checkbox" checked={tpl.totals} onChange={(e) => patch({ totals: e.target.checked })} />Show a totals row for number columns</label>
            {tpl.theme === "loanmart" && (
              <>
                <label className="check"><input type="checkbox" checked={tpl.logo} onChange={(e) => patch({ logo: e.target.checked })} />Show the LoanMart logo</label>
              </>
            )}
          </div>
        </div>

        <div className="group">
          <h3>Header and footer</h3>
          <div className="kv">
            <label htmlFor="org">Organisation</label>
            <input id="org" className="inp" value={tpl.org} onChange={(e) => patch({ org: e.target.value })} placeholder="Shown above the title" />
            <label htmlFor="foot">Footer note</label>
            <input id="foot" className="inp" value={tpl.footer} onChange={(e) => patch({ footer: e.target.value })} placeholder="e.g. Internal use only" />
          </div>
        </div>

        <div className="group">
          <h3>Formats</h3>
          <div className="kv">
            <label htmlFor="cur">Currency</label>
            <input id="cur" className="inp" style={{ width: 80 }} value={tpl.currency} onChange={(e) => patch({ currency: e.target.value })} />
            <label htmlFor="dec">Decimals</label>
            <select id="dec" className="sel" value={tpl.decimals} onChange={(e) => patch({ decimals: Number(e.target.value) })}>
              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <label htmlFor="df">Dates</label>
            <select id="df" className="sel" value={tpl.dateFormat} onChange={(e) => patch({ dateFormat: e.target.value })}>
              {DATE_FORMATS.map((f) => <option key={f} value={f}>{fmtDate(new Date(2026, 2, 14), f)}</option>)}
            </select>
          </div>
        </div>

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
