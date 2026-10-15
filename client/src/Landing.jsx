import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "./api.js";
import Logo from "./components/Logo.jsx";
import Orbs from "./components/Orbs.jsx";
import "./landing.css";

/** Small line icons (24×24, drawn with strokes). */
const ICONS = {
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4",
  columns: "M4 5h16v14H4zM10 5v14M16 5v14",
  type: "M5 7V5h14v2M12 5v14M9 19h6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  layers: "M12 3l9 5-9 5-9-5 9-5Zm-9 9l9 5 9-5M3 16l9 5 9-5",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3Zm-3 9l2 2 4-4",
  monitor: "M3 4h18v12H3zM8 20h8M12 16v4",
  filter: "M4 5h16l-6 8v5l-4 2v-7L4 5Z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4",
  chevron: "M6 9l6 6 6-6",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z",
  back: "M19 12H5M11 6l-6 6 6 6",
};
export const Icon = ({ name, size = 16 }) => (
  <svg className="lp-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

const STAGES = [
  { title: "Connect and query", text: "Pick a SQL Server, choose a database and paste a SELECT statement. SQL Server tells the app exactly which columns and types come back." },
  { title: "Shape the report", text: "Choose columns, confirm data types, pick a template, then add a title and filters. Every change shows up on real rows straight away." },
  { title: "Export to SSRS or a file", text: "Download an .rdl file and upload it to your report server, or skip the report and download every row as a CSV or Excel file." },
];

const FEATURES = [
  { icon: "type", title: "Types from SQL Server", text: "Numbers, dates, money and percentages are read from the column's SQL type, so formatting and totals are right from the start." },
  { icon: "eye", title: "Live preview", text: "See the first 200 rows of your real data as you work, sorted and filtered the way the finished report will be." },
  { icon: "layers", title: "Reusable templates", text: "Design a template once on sample data, save it, and apply it to any report: layout, style, header, footer and formats."},
  { icon: "shield", title: "Read-only by design", text: "Only SELECT queries are allowed, previews run in a transaction that is always rolled back, and passwords are never stored." },
  { icon: "monitor", title: "No login on this computer", text: "A SQL Server on your own machine opens with your Windows account. No user name or password to type." },
  { icon: "filter", title: "Filters and sort carried over", text: "The readers' filters and the sort order you set in the preview are written into the .rdl file, so the report opens the same way." },
];

const WORKS_WITH = [
  ["database", "SQL Server"],
  ["file", "SSRS 2008 R2+"],
  ["layers", "Power BI Report Server"],
  ["monitor", "Windows sign-in"],
  ["code", "ODBC Driver 18"],
];

/** Columns shown in the hero illustration, like the builder's Columns and Data types steps. */
const COLUMNS = [
  { name: "OrderID", type: "Integer", sql: "int" },
  { name: "Customer", type: "Text", sql: "nvarchar(100)" },
  { name: "Revenue", type: "Currency", sql: "decimal(19,4)", selected: true },
  { name: "OrderDate", type: "Date", sql: "date" },
  { name: "IsPaid", type: "Yes/No", sql: "bit" },
];

/** Smooth S-curve between two points, leaving and entering horizontally. */
const curve = ([x1, y1], [x2, y2]) => {
  const dx = (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

/**
 * Measures the illustration and returns its connector lines: a spine between the source tiles, a branch from
 * each tile into the Columns card, a link from the selected Revenue row to its detail card, and a drop to the
 * .rdl output chip. Points come from the real elements, so the lines stay attached whatever the fonts or width.
 * Called from Diagram, whose layout effect runs after every ref in it is attached.
 */
function useWires(rootRef, parts) {
  const [wires, setWires] = useState({ paths: [], nodes: [] });

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const box = root.getBoundingClientRect();
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
      };
      const { tiles, list, selected, detail, detailTitle, output } = parts.current;
      if (!list || !detail || !output || tiles.some((t) => !t)) return;
      const t = tiles.map(rect), L = rect(list), S = rect(selected), D = rect(detail), DT = rect(detailTitle), O = rect(output);
      const paths = [], nodes = [];
      // Spine down the source tiles
      for (let i = 0; i < t.length - 1; i++) paths.push(`M ${t[i].cx} ${t[i].y + t[i].h} L ${t[i + 1].cx} ${t[i + 1].y}`);
      // Each source feeds the Columns card
      for (const tile of t) {
        const end = [L.x, tile.cy];
        paths.push(curve([tile.x + tile.w, tile.cy], end));
        nodes.push(end);
      }
      // Selected column → its settings
      const from = [L.x + L.w, S.cy], to = [D.x, DT.cy];
      paths.push(curve(from, to));
      nodes.push(from, to);
      // Settings → report file
      const down = [D.cx, D.y + D.h], chip = [O.cx, O.y];
      paths.push(`M ${down[0]} ${down[1]} L ${chip[0]} ${chip[1]}`);
      nodes.push(down, chip);
      setWires({ paths, nodes });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [rootRef, parts]);

  return wires;
}

/** Draws the connector lines: resting line, travelling light pulses, and dots where lines meet a card. */
function Wires({ wires }) {
  return (
    <svg className="lp-wires" aria-hidden="true">
      {wires.paths.map((d, i) => <path key={`w${i}`} className="lp-wire" d={d} />)}
      {wires.paths.map((d, i) => <path key={`f${i}`} className="lp-flow" d={d} style={{ animationDelay: `${-i * 0.35}s` }} />)}
      {wires.nodes.map(([x, y], i) => <circle key={`n${i}`} className="lp-node" cx={x} cy={y} r="3.5" />)}
    </svg>
  );
}

/** Hero illustration: data sources → a query's columns → one column's settings → the report file. */
function Diagram() {
  const rootRef = useRef(null);
  const parts = useRef({ tiles: [] });
  const tile = (i) => (el) => { parts.current.tiles[i] = el; };
  const part = (name) => (el) => { parts.current[name] = el; };
  const wires = useWires(rootRef, parts);

  return (
    <section ref={rootRef} className="lp lp-diagram" aria-label="Example: a query's columns in the builder">
      <Wires wires={wires} />

      <div className="lp-rail">
        <span ref={tile(0)} className="lp-tile" title="SQL Server"><Icon name="database" size={18} /></span>
        <span ref={tile(1)} className="lp-tile" title="Signed in on this computer"><Icon name="monitor" size={18} /></span>
        <span ref={tile(2)} className="lp-tile" title="Your SELECT query"><Icon name="code" size={18} /></span>
      </div>

      <div ref={part("list")} className="lp-card lp-list">
        <p className="lp-card-title"><Icon name="columns" size={14} /> Columns</p>
        {COLUMNS.map((c) => (
          <div key={c.name} ref={c.selected ? part("selected") : undefined} className={`lp-item${c.selected ? " on" : ""}`}>
            <p className="lp-item-name"><span className="lp-badge">{c.type[0]}</span>{c.name}</p>
            <p className="lp-item-meta">Type: {c.type}<br />SQL type: {c.sql}</p>
          </div>
        ))}
      </div>

      <div className="lp-col3">
        <div ref={part("detail")} className="lp-card lp-detail">
          <p ref={part("detailTitle")} className="lp-card-title"><span className="lp-badge">C</span> Revenue</p>
          <dl className="lp-kv">
            <div><dt>SQL type</dt><dd>decimal(19,4)</dd></div>
            <div><dt>Shown as</dt><dd className="hi">Currency</dd></div>
            <div><dt>Total</dt><dd>Sum</dd></div>
            <div><dt>Decimals</dt><dd>2</dd></div>
          </dl>
          <p className="lp-sub"><Icon name="filter" size={13} /> Filter</p>
          <div className="lp-row">Revenue is at least <strong>$1,000</strong></div>
          <p className="lp-sub"><Icon name="search" size={13} /> Sort</p>
          <div className="lp-row">Revenue, highest first</div>
        </div>
        <div ref={part("output")} className="lp-card lp-output">
          <Icon name="file" size={15} /> Revenue report.rdl <small>Ready for SSRS</small>
        </div>
      </div>
    </section>
  );
}

/** "Get started" in the top bar: opens a small menu with the two ways into the builder. */
function StartMenu({ onStart }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // While open, a click outside the menu or the Escape key closes it
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => { if (!ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lp-menu" ref={ref}>
      <button className="btn btn-primary btn-sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Get started <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div className="lp-menu-list" role="menu">
          <button role="menuitem" onClick={() => onStart("ssrs")}>
            <Icon name="file" size={18} />
            <span><strong>SSRS report</strong><small>A formatted .rdl file for your report server</small></span>
          </button>
          <button role="menuitem" onClick={() => onStart("adhoc")}>
            <Icon name="columns" size={18} />
            <span><strong>Ad hoc export</strong><small>Every row as CSV, Excel or PDF</small></span>
          </button>
          <a role="menuitem" href="#/templates">
            <Icon name="layers" size={18} />
            <span><strong>Template designer</strong><small>Design report templates on sample data</small></span>
          </a>
        </div>
      )}
    </div>
  );
}

/** Front page: what the app does, and the way into the builder. */
export default function Landing({ onStart }) {
  const [local, setLocal] = useState(null);
  useEffect(() => {
    api.localServers().then((list) => setLocal(list.find((i) => i.running) || null)).catch(() => {});
  }, []);

  /** The two ways into the builder: a formatted SSRS report, or a plain CSV / Excel export of the rows. */
  const getStarted = () => (
    <div className="lp-start">
      <button className="btn btn-primary lp-cta" onClick={() => onStart("ssrs")}>Create SSRS report <Icon name="arrow" size={15} /></button>
      <button className="btn lp-cta" onClick={() => onStart("adhoc")}>Create ad hoc export <Icon name="arrow" size={15} /></button>
    </div>
  );

  return (
    <>
    <Orbs />
    <div className="lp-page">
      <header className="lp-bar">
        <div className="lp lp-top">
          <p className="lp-brand"><Logo size={30} />Report builder</p>
          <nav className="lp-links" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <StartMenu onStart={onStart} />
          </nav>
        </div>
      </header>

      <div className="lp-hero-wrap">

        <section className="lp lp-hero">
          <h1>From a question about your data to a finished report</h1>
          <p className="lp-lead">
            Describe what you need and let AI write the query, or paste your own SELECT. Shape the result on real
            data, then publish it as an SSRS report or download every row as Excel, PDF or CSV. Design a template
            once and reuse it on every report.
            No Report Builder, no Visual Studio, no hand-editing XML.
          </p>
          <div className="lp-actions">
            {getStarted()}
            <a className="btn lp-cta" href="#/options">Learn more</a>
          </div>
          {local && (
            <p className="lp-local">
              <span className="conn-dot" aria-hidden="true" />
              <span>SQL Server found on this computer at <strong>{local.server}</strong>. You can connect without a login.</span>
            </p>
          )}
        </section>

        <Diagram />
      </div>

      <section className="lp lp-works">
        <p className="lp-eyebrow">From your database to your report server</p>
        <p className="lp-works-sub">Works with the tools you already use</p>
        <ul className="lp-logos">
          {WORKS_WITH.map(([icon, name]) => <li key={name}><Icon name={icon} size={17} />{name}</li>)}
        </ul>
      </section>

      <section id="how" className="lp lp-split">
        <div>
          <h2>How it works</h2>
          <ol className="lp-steps">
            {STAGES.map((s, i) => (
              <li key={s.title}>
                <span className="lp-step-n">{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="lp-card lp-why">
          <h2>Why Report builder</h2>
          <p>
            Report Builder and Visual Studio make you design SSRS reports by hand. This app starts from the query you
            already have, reads the real column types from SQL Server, and writes the report file for you.
          </p>
          <ul className="lp-chips">
            {FEATURES.map((f) => <li key={f.title}><Icon name={f.icon} size={14} />{f.title}</li>)}
          </ul>
        </div>
      </section>

      <section id="features" className="lp lp-section">
        <h2>Built for real report work</h2>
        <ul className="lp-features">
          {FEATURES.map((f) => (
            <li key={f.title} className="lp-card">
              <span className="lp-tile sm"><Icon name={f.icon} size={16} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="templates" className="lp lp-split lp-split-rev">
        <div className="lp-card lp-template">
          <p className="lp-card-title"><Icon name="layers" size={14} /> Template · Sales ledger</p>
          <div className="lp-field">
            <span>Look</span>
            <code>Ledger · zebra rows · first column pinned</code>
          </div>
          <div className="lp-field">
            <span>Formats</span>
            <code>$ · 2 decimals · 03/14/2026</code>
          </div>
          <div className="lp-field">
            <span>Header and footer</span>
            <code>LoanMart Collections · Internal use only</code>
          </div>
        </div>
        <div>
          <h2>Flexible templates – no XML required</h2>
          <p className="lp-copy">
            Design a template in the template designer, on sample data, with no database needed. Pick the style, row
            height, layout, header, footer and number and date formats, and save it.
          </p>
          <p className="lp-copy">
            Then apply it to any SSRS report in the Template step. Each report can still adjust its own column
            headings and widths. The .rdl file is written for you.
          </p>
          <a className="btn btn-primary lp-cta" style={{ marginTop: 22 }} href="#/templates">Open the template designer <Icon name="arrow" size={15} /></a>
        </div>
      </section>

      <section className="lp lp-end">
        <div className="lp-card lp-end-card">
          <div>
            <h2>Ready when you are</h2>
            <p>SSRS reports for 2008 R2 and later, including Power BI Report Server, plus Excel, PDF and CSV files.</p>
          </div>
          {getStarted()}
        </div>
      </section>

      <footer className="lp lp-foot">
        <p className="lp-brand sm"><Logo size={20} />Report builder</p>
        <span>From question to finished report</span>
      </footer>
    </div>
    </>
  );
}
