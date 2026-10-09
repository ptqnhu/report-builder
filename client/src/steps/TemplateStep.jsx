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
            <span>Style</span>
            <Segmented label="Style" value={tpl.theme} onChange={(v) => patch({ theme: v })}
              options={[["ledger", "Ledger"], ["clean", "Clean"], ["contrast", "Contrast"]]} />
            <span>Row height</span>
            <Segmented label="Row height" value={tpl.density} onChange={(v) => patch({ density: v })}
              options={[["compact", "Compact"], ["normal", "Normal"], ["comfortable", "Roomy"]]} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label className="check"><input type="checkbox" checked={tpl.zebra} onChange={(e) => patch({ zebra: e.target.checked })} />Shade alternate rows</label>
            <label className="check"><input type="checkbox" checked={tpl.rowNumbers} onChange={(e) => patch({ rowNumbers: e.target.checked })} />Show row numbers</label>
            <label className="check"><input type="checkbox" checked={tpl.totals} onChange={(e) => patch({ totals: e.target.checked })} />Show a totals row for number columns</label>
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
          {effCols.map((c, i) => (
            <div className="colset" key={c.key}>
              <div className="colset-top">
                <input className="inp" value={c.label} onChange={(e) => patchCol(c.name, { label: e.target.value })} aria-label={`Heading for ${c.name}`} />
                <button className="icon-btn" onClick={() => move(c.name, -1)} disabled={i === 0} aria-label={`Move ${c.label} left`}>↑</button>
                <button className="icon-btn" onClick={() => move(c.name, 1)} disabled={i === effCols.length - 1} aria-label={`Move ${c.label} right`}>↓</button>
              </div>
              <div className="colset-opts">
                <TypeBadge type={c.type} showType />
                <select className="sel" value={c.align} onChange={(e) => patchCol(c.name, { align: e.target.value })} aria-label={`Alignment for ${c.label}`}>
                  <option value="auto">Auto align</option><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                </select>
                <select className="sel" value={c.width} onChange={(e) => patchCol(c.name, { width: e.target.value })} aria-label={`Width for ${c.label}`}>
                  <option value="auto">Auto width</option><option value="narrow">Narrow</option><option value="medium">Medium</option><option value="wide">Wide</option>
                </select>
                <label className="check"><input type="checkbox" checked={c.wrap} onChange={(e) => patchCol(c.name, { wrap: e.target.checked })} />Wrap</label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="tpl-preview">
        <ReportDocument {...previewProps} limit={10} />
      </div>
    </div>
  );
}
