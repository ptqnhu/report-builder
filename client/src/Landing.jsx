import { useEffect, useState } from "react";
import { api } from "./api.js";
import "./landing.css";

const STAGES = [
  { n: "1", title: "Connect and query", text: "Pick a SQL Server, choose a database and paste a SELECT statement. SQL Server tells the app exactly which columns and types come back." },
  { n: "2", title: "Shape the report", text: "Choose columns, confirm data types, pick a template, then add a title and filters. Every change shows up on real rows straight away." },
  { n: "3", title: "Export to SSRS", text: "Download an .rdl file and upload it to your report server. It runs your query each time it opens and returns every row." },
];

const FEATURES = [
  { title: "Types from SQL Server", text: "Numbers, dates, money and percentages are read from the column's SQL type, so formatting and totals are right from the start." },
  { title: "Live preview", text: "See the first 200 rows of your real data as you work, sorted and filtered the way the finished report will be." },
  { title: "Reusable templates", text: "Save a look once and apply it to any query. Templates adapt to columns they haven't seen before." },
  { title: "Read-only by design", text: "Only SELECT queries are allowed, previews run in a transaction that is always rolled back, and passwords are never stored." },
  { title: "No login on this computer", text: "A SQL Server on your own machine opens with your Windows account. No user name or password to type." },
  { title: "Filters and sort carried over", text: "The filters and sort order you set in the preview are written into the .rdl file, so the report opens the same way." },
];

/** Facts about the app, shown as the stats row under the intro. */
const STATS = [
  ["7", "Guided steps"],
  ["200", "Live preview rows"],
  ["0", "Passwords stored"],
];

const SAMPLE = [
  ["Northwind Traders", 42, 18_420.5],
  ["Contoso Ltd", 37, 15_975.0],
  ["Fabrikam Inc", 29, 12_310.25],
  ["Adventure Works", 24, 9_880.75],
];
const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Front page: what the app does, and the way into the builder. */
export default function Landing({ onStart }) {
  const [local, setLocal] = useState(null);
  useEffect(() => {
    api.localServers().then((list) => setLocal(list.find((i) => i.running) || null)).catch(() => {});
  }, []);

  return (
    <div className="lp-page">
      <div className="lp-band">
        <header className="lp lp-top">
          <p className="lp-brand"><span className="lp-mark" aria-hidden="true">R</span>Report builder</p>
          <nav className="lp-links" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
          </nav>
          <button className="btn lp-pill" onClick={onStart}>Open the builder</button>
        </header>

        <section className="lp lp-hero">
          <div className="lp-hero-copy">
            <h1>
              Turn any SQL query into an
              <span className="lp-word">SSRS report</span>
            </h1>
            <p className="lp-lead">
              Write a <strong>SELECT statement</strong>, shape the result on <strong>real data</strong>, and download a
              ready-to-upload <strong>.rdl file</strong>. No Report Builder, no Visual Studio, no hand-editing XML.
            </p>

            <dl className="lp-stats">
              {STATS.map(([n, label]) => (
                <div key={label}><dt>{n}</dt><dd>{label}</dd></div>
              ))}
            </dl>

            <div className="lp-actions">
              <button className="btn btn-primary lp-cta" onClick={onStart}>Start building a report</button>
              <a className="btn lp-cta lp-ghost" href="#how">See how it works</a>
            </div>

            {local && (
              <p className="lp-local">
                <span className="conn-dot" aria-hidden="true" />
                <span>SQL Server found on this computer at <strong>{local.server}</strong>. You can connect without a login.</span>
              </p>
            )}
          </div>

          <div className="lp-device" aria-label="Example of the report builder">
            <div className="lp-screen">
              <div className="lp-screen-top">
                <span className="lp-mark sm" aria-hidden="true">R</span>
                <span>Step 7 of 7</span>
              </div>
              <p className="lp-screen-hi">Revenue by customer</p>
              <p className="lp-screen-sub">AdventureWorks · sorted by revenue</p>

              <div className="lp-screen-total">
                <span>Total revenue</span>
                <strong>{money(SAMPLE.reduce((s, r) => s + r[2], 0))}</strong>
              </div>

              <table className="lp-mini">
                <thead><tr><th>Customer</th><th>Orders</th><th>Revenue</th></tr></thead>
                <tbody>
                  {SAMPLE.map(([c, orders, rev]) => (
                    <tr key={c}><td>{c}</td><td>{orders}</td><td>{money(rev)}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="lp-action-card">
                <p className="lp-action-kicker">Ready to export</p>
                <p className="lp-action-title">Report file built</p>
                <p className="lp-action-big">.rdl</p>
                <div className="lp-action-pills">
                  <span>Download</span><span>View XML</span><span>Upload</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="lp">
        <section id="how" className="lp-section">
          <h2>How it works</h2>
          <ol className="lp-stages">
            {STAGES.map((s) => (
              <li key={s.n} className="panel">
                <span className="step-dot lp-dot">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="lp-section">
          <h2>Built for real report work</h2>
          <ul className="lp-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-section lp-end panel">
          <div>
            <h2>Ready when your query is</h2>
            <p className="muted">Exports for SSRS 2008 R2 and later, including Power BI Report Server.</p>
          </div>
          <button className="btn btn-primary lp-cta" onClick={onStart}>Start building a report</button>
        </section>

        <footer className="lp-foot">Report builder · From SQL query to SSRS report</footer>
      </div>
    </div>
  );
}
