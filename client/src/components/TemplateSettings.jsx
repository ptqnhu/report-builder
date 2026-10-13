import { DATE_FORMATS, fmtDate } from "@report-builder/shared";
import Segmented from "./Segmented.jsx";

/**
 * The report-wide template settings: column layout, look, header and footer, formats.
 * Used by the Template step and by the template designer. `patch` merges changes into the template.
 */
export default function TemplateSettings({ tpl, patch }) {
  return (
    <>
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
            <label className="check"><input type="checkbox" checked={tpl.logo} onChange={(e) => patch({ logo: e.target.checked })} />Show the LoanMart logo</label>
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
    </>
  );
}
