import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import Logo from "./components/Logo.jsx";
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

/**
 * "What you can do" section: the four things the app does. `art` picks the line drawing in <CanArt>, `soon` marks a
 * feature that is not in the app yet.
 */
const CAN_DO = [
  {
    art: "ssrs",
    title: "Create an SSRS report",
    items: ["Your own SELECT or AI-written", "Columns, types and totals", "Filters and sort", "Ready-to-upload .rdl file", "SSRS and Power BI Report Server"],
  },
  {
    art: "adhoc",
    title: "Create an ad hoc export",
    items: ["Excel, PDF or CSV", "Every row, up to 500,000", "Built-in styles", "Optional totals row", "Turn it into an SSRS report later"],
  },
  {
    art: "template",
    title: "Build a template",
    items: ["Style, row height and layout", "Header and footer", "Currency, decimals and dates", "Designed on sample data", "Reused on every report"],
  },
  {
    art: "chart",
    title: "See data in charts",
    items: ["Bar, line and pie charts", "Built from your query's rows", "Totals at a glance"],
    soon: true,
  },
];

/** Line drawings for the "What you can do" features: thin ink strokes, 100×100. */
function CanArt({ name }) {
  const art = {
    // A report page with a folded corner and rows of data
    ssrs: (
      <>
        <path d="M22 6h40l18 18v70H22z M62 6v18h18" />
        <path d="M32 40h38 M32 54h38 M32 68h24" />
      </>
    ),
    // A table of rows with an arrow down out of it: the rows downloaded as a file
    adhoc: (
      <>
        <path d="M10 10h80v52H10z M10 27h80 M10 44h80 M37 10v52 M63 10v52" />
        <path d="M50 70v24 M41 85l9 9 9-9" />
      </>
    ),
    // Two stacked pages, the front one with a header bar and footer line: a reusable look
    template: (
      <>
        <path d="M30 6h62v70" />
        <path d="M8 18h70v76H8z M8 34h70 M18 84h50" />
        <path d="M18 48h50 M18 60h34" />
      </>
    ),
    // Axes with bars and a line through the tops
    chart: (
      <>
        <path d="M10 6v84h84" />
        <path d="M24 90V62 M42 90V44 M60 90V54 M78 90V26" strokeWidth="9" strokeLinecap="butt" opacity=".16" />
        <path d="M24 62 42 44 60 54 78 26" />
      </>
    ),
  }[name];
  return (
    <svg className="lp-can-art" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      {art}
    </svg>
  );
}

/** "What you can do": a corner label, then the four features in a 2 × 2 grid. */
function CanDo() {
  return (
    <section id="what" className="lp lp-can">
      <p className="lp-can-eyebrow" data-line>What LoanMart Insights can do</p>
      <div className="lp-can-grid">
        {CAN_DO.map((f) => (
          <article key={f.title} className="lp-can-item">
            <CanArt name={f.art} />
            <h3>{f.title}{f.soon && <span className="lp-can-soon">Coming soon</span>}</h3>
            <ul className="lp-can-list">
              {f.items.map((i) => <li key={i}>{i}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Columns shown in the hero illustration, like the builder's Columns and Data types steps. */
const COLUMNS = [
  { name: "LoanNumber", type: "Integer", sql: "int" },
  { name: "Borrower", type: "Text", sql: "nvarchar(100)" },
  { name: "TotalBalance", type: "Currency", sql: "decimal(19,4)", selected: true },
  { name: "OpenDate", type: "Date", sql: "date" },
  { name: "IsPrimaryBorrower", type: "Yes/No", sql: "bit" },
];

/** Smooth S-curve between two points, leaving and entering horizontally. */
const curve = ([x1, y1], [x2, y2]) => {
  const dx = (x2 - x1) / 2;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
};

/**
 * Measures the illustration and returns its connector lines: a spine down the source tiles (a column at the
 * Columns card's lower left), a branch from each tile into the card, a link from the selected TotalBalance row to
 * its detail card, and a drop to the .rdl output chip. Points come from the real elements, so the lines stay attached whatever the fonts or width.
 * Tiles that are hidden (narrow screens) are left out, with their lines.
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
      const { tiles, list, selected, detail, output } = parts.current;
      if (!list || !detail || !output || tiles.some((t) => !t)) return;
      const t = tiles.filter((el) => el.offsetParent !== null).map(rect), L = rect(list), S = rect(selected), D = rect(detail), O = rect(output);
      const paths = [], nodes = [];
      // Spine down the source tiles
      for (let i = 0; i < t.length - 1; i++) paths.push(`M ${t[i].cx} ${t[i].y + t[i].h} L ${t[i + 1].cx} ${t[i + 1].y}`);
      // Each source feeds the Columns card
      for (const tile of t) {
        const end = [L.x, tile.cy];
        paths.push(curve([tile.x + tile.w, tile.cy], end));
        nodes.push(end);
      }
      // Selected column → its settings: straight across into the detail card's edge, level with the selected row
      // (kept a little inside the card's corners if the row sits above or below it)
      const from = [L.x + L.w, S.cy], to = [D.x, Math.min(Math.max(S.cy, D.y + 24), D.y + D.h - 24)];
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
    <section ref={rootRef} className="lp-diagram" aria-label="Example: a query's columns in the builder">
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
          <p className="lp-card-title"><span className="lp-badge">C</span> TotalBalance</p>
          <dl className="lp-kv">
            <div><dt>SQL type</dt><dd>decimal(19,4)</dd></div>
            <div><dt>Shown as</dt><dd className="hi">Currency</dd></div>
            <div><dt>Total</dt><dd>Sum</dd></div>
            <div><dt>Decimals</dt><dd>2</dd></div>
          </dl>
          <p className="lp-sub"><Icon name="filter" size={13} /> Filter</p>
          <div className="lp-row">TotalBalance is at least <strong>$1,000</strong></div>
          <p className="lp-sub"><Icon name="search" size={13} /> Sort</p>
          <div className="lp-row">TotalBalance, highest first</div>
        </div>
        <div ref={part("output")} className="lp-card lp-output">
          <Icon name="file" size={15} /> Loan Balances.rdl <small>Ready for SSRS</small>
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
      <button className="btn btn-sm" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
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

/**
 * True once the loading screen (#boot in index.html) has gone, so the hero's opening animation plays where it can be
 * seen rather than behind the loading screen. True straight away when there is no loading screen (coming back from
 * another page).
 */
function useLoaded() {
  const [loaded, setLoaded] = useState(() => !document.getElementById("boot"));
  useEffect(() => {
    if (loaded) return;
    const mo = new MutationObserver(() => {
      if (!document.getElementById("boot")) { setLoaded(true); mo.disconnect(); }
    });
    mo.observe(document.body, { childList: true });
    return () => mo.disconnect();
  }, [loaded]);
  return loaded;
}

/**
 * Smooth (eased) scrolling with the mouse wheel while the landing page is open, using Lenis. Left off for people who
 * have asked their system for reduced motion. Returns a ref to the Lenis instance, or null when it is off.
 */
function useSmoothScroll() {
  const ref = useRef(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.1 });
    ref.current = lenis;
    return () => { lenis.destroy(); ref.current = null; };
  }, []);
  return ref;
}

/**
 * Draws the page's [data-line] lines as they scroll into view: adds .drawn when a line comes on screen (a little above
 * the bottom edge, so it is seen drawing), and takes it off once the line has gone back off the bottom, so it draws
 * again next time you scroll down to it. Lines scrolled past the top stay drawn. Waits for `enabled` (the loading
 * screen gone), so the hero line is not drawn behind it.
 */
function useLineReveal(rootRef, enabled) {
  useEffect(() => {
    if (!enabled || !rootRef.current) return;
    const lines = rootRef.current.querySelectorAll("[data-line]");
    const show = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) e.target.classList.add("drawn");
    }, { rootMargin: "0px 0px -12% 0px" });
    const reset = new IntersectionObserver((entries) => {
      for (const e of entries) if (!e.isIntersecting && e.boundingClientRect.top >= innerHeight) e.target.classList.remove("drawn");
    });
    lines.forEach((el) => { show.observe(el); reset.observe(el); });
    return () => { show.disconnect(); reset.disconnect(); };
  }, [rootRef, enabled]);
}

/** Front page: what the app does, and the way into the builder. */
export default function Landing({ onStart }) {
  const shown = useLoaded();
  const pageRef = useRef(null);
  const lenis = useSmoothScroll();
  useLineReveal(pageRef, shown);

  /** Top bar section links: glide to the section (stopping at its scroll-margin-top) instead of jumping. */
  const toSection = (e) => {
    const target = document.querySelector(e.currentTarget.getAttribute("href"));
    if (!lenis.current || !target) return; // no smooth scrolling (reduced motion): the browser jumps as usual
    e.preventDefault();
    lenis.current.scrollTo(target, { offset: -parseFloat(getComputedStyle(target).scrollMarginTop || 0) });
  };

  /** The two ways into the builder: a formatted SSRS report, or a plain CSV / Excel export of the rows. */
  const getStarted = () => (
    <div className="lp-start">
      <button className="btn btn-primary lp-cta" onClick={() => onStart("ssrs")}>Create SSRS report <Icon name="arrow" size={15} /></button>
      <button className="btn lp-cta" onClick={() => onStart("adhoc")}>Create ad hoc export <Icon name="arrow" size={15} /></button>
    </div>
  );

  return (
    <>
    <div className="lp-page" ref={pageRef}>
      <header className="lp-bar">
        <div className="lp lp-top">
          <p className="lp-brand"><Logo size={30} />LoanMart Insights</p>
          <nav className="lp-links" aria-label="Page sections">
            <a href="#how" onClick={toSection}>How it works</a>
            <a href="#what" onClick={toSection}>Features</a>
            <a href="#/templates">Templates</a>
            <StartMenu onStart={onStart} />
          </nav>
        </div>
      </header>

      <div className="lp-hero-wrap">
        <div className="lp lp-hero-grid">
        <section className="lp-hero">
          <h1>
            <span className="lp-hero-line">From a <span className="serif hl">simple</span> requirement</span>
            <span className="lp-hero-line">to a polished <span className="serif hl">report</span></span>
          </h1>
          <p className="lp-lead">
            Let AI write the query or paste your own, shape it on real data, and publish an SSRS report or export to
            Excel, PDF or CSV.
            <span className="lp-lead-line">No Report Builder, no XML.</span>
          </p>
          <Diagram />
          <div className="lp-actions" data-line>
            <span className="lp-lead-rule" aria-hidden="true" />
            <a className="btn lp-cta lp-explore" href="#/options">Explore <Icon name="arrow" size={18} /></a>
          </div>
        </section>
        </div>
      </div>

      <section id="how" className="lp lp-how">
        <p className="lp-can-eyebrow lp-how-label">How it works</p>
        <div className="lp-how-grid">
          <ol className="lp-steps">
            {STAGES.map((s, i) => (
              <li key={s.title}>
                <span className="lp-step-n">{i + 1}</span>
                <div><h3>{s.title}</h3><p>{s.text}</p></div>
              </li>
            ))}
          </ol>
        <div className="lp-card lp-why">
          <h2>Why LoanMart Insights</h2>
          <p>
            Report Builder and Visual Studio make you design SSRS reports by hand. This app starts from the query you
            already have, reads the real column types from SQL Server, and writes the report file for you.
          </p>
          <ul className="lp-chips">
            {FEATURES.map((f) => <li key={f.title}><Icon name={f.icon} size={14} />{f.title}</li>)}
          </ul>
        </div>
        </div>
      </section>

      <CanDo />

      <section className="lp lp-end">
        <div className="lp-card lp-end-card hero">
          <div>
            <h2>Ready when you are</h2>
            <p>SSRS reports for 2008 R2 and later, including Power BI Report Server, plus Excel, PDF and CSV files.</p>
          </div>
          {getStarted()}
        </div>
      </section>

      <footer className="lp lp-foot" data-line>
        <p className="lp-brand sm"><Logo size={20} />LoanMart Insights</p>
        <span>From a simple requirement to a ready-to-share report</span>
      </footer>
    </div>
    </>
  );
}
