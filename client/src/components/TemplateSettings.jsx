import Segmented from "./Segmented.jsx";

/** One group of settings: a titled block, or with `collapsible` a closed dropdown section. */
function Group({ title, collapsible, children }) {
  if (collapsible) return <details className="acc"><summary>{title}</summary><div className="acc-body">{children}</div></details>;
  return <div className="group"><h3>{title}</h3>{children}</div>;
}

/**
 * The report-wide template settings: column layout, look, header and footer, formats.
 * Used by the Template step and by the template designer (where `collapsible` makes each group a dropdown section).
 * `sections` picks what shows: "layout", "look", "rowHeight" (inside Look), "header", "formats". `patch` merges changes
 * into the template.
 * With `templates` (the saved ones), the Style list offers them next to the built-in styles; picking one calls
 * onTemplate(template), and picking a built-in style drops the last template's own changes.
 */
export default function TemplateSettings({ tpl, patch, collapsible = false, sections = ["layout", "look", "rowHeight", "header", "formats"], templates, onTemplate }) {
  const has = (s) => sections.includes(s);
  const current = templates?.find((t) => t.name === tpl.name);
  function pickStyle(v) {
    if (v.startsWith("tpl:")) return onTemplate(templates.find((t) => `tpl:${t.name}` === v));
    patch(templates ? { theme: v, name: "", look: {}, types: {} } : { theme: v });
  }
  return (
    <>
      {has("layout") && <Group title="Column layout" collapsible={collapsible}>
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
      </Group>}

      {has("look") && <Group title="Look" collapsible={collapsible}>
        <div className="kv">
          <label htmlFor="theme">Style</label>
          <select id="theme" className="sel" value={current ? `tpl:${current.name}` : tpl.theme} onChange={(e) => pickStyle(e.target.value)}>
            <optgroup label="Built-in styles">
              <option value="loanmart">LoanMart</option>
              <option value="ledger">Ledger</option>
              <option value="clean">Clean</option>
              <option value="contrast">Contrast</option>
            </optgroup>
            {templates?.length > 0 && (
              <optgroup label="Your templates">
                {templates.map((t) => <option key={t.name} value={`tpl:${t.name}`}>{t.name}</option>)}
              </optgroup>
            )}
          </select>
          {has("rowHeight") && (
            <>
              <span>Row height</span>
              <Segmented label="Row height" value={tpl.density} onChange={(v) => patch({ density: v })}
                options={[["compact", "Compact"], ["normal", "Normal"], ["comfortable", "Roomy"]]} />
            </>
          )}
        </div>
        <div style={{ marginTop: 10 }}>
          <label className="check"><input type="checkbox" checked={tpl.zebra} onChange={(e) => patch({ zebra: e.target.checked })} />Shade alternate rows</label>
          <label className="check"><input type="checkbox" checked={tpl.rowNumbers} onChange={(e) => patch({ rowNumbers: e.target.checked })} />Show row numbers</label>
          <label className="check"><input type="checkbox" checked={tpl.totals} onChange={(e) => patch({ totals: e.target.checked })} />Show a totals row for number columns</label>
          {tpl.theme === "loanmart" && (
            <label className="check"><input type="checkbox" checked={tpl.logo} onChange={(e) => patch({ logo: e.target.checked })} />Show the LoanMart logo</label>
          )}
        </div>
      </Group>}

      {has("header") && <Group title="Header and footer" collapsible={collapsible}>
        <div className="kv">
          <label htmlFor="org">Organisation</label>
          <input id="org" className="inp" value={tpl.org} onChange={(e) => patch({ org: e.target.value })} placeholder="Shown above the title" />
          <label htmlFor="foot">Footer note</label>
          <input id="foot" className="inp" value={tpl.footer} onChange={(e) => patch({ footer: e.target.value })} placeholder="e.g. Internal use only" />
        </div>
      </Group>}

      {has("formats") && <Group title="Formats" collapsible={collapsible}>
        <div className="kv">
          <label htmlFor="cur">Currency</label>
          <input id="cur" className="inp" style={{ width: 80 }} value={tpl.currency} onChange={(e) => patch({ currency: e.target.value })} />
          <label htmlFor="dec">Decimals</label>
          <select id="dec" className="sel" value={tpl.decimals} onChange={(e) => patch({ decimals: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </Group>}
    </>
  );
}
