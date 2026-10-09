import { useEffect, useState } from "react";
import { api } from "./api.js";

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

const SAMPLE = [
  ["Northwind Traders", "Seattle", 42, 18_420.5, true],
  ["Contoso Ltd", "Chicago", 37, 15_975.0, true],
  ["Fabrikam Inc", "Denver", 29, 12_310.25, false],
  ["Adventure Works", "Portland", 24, 9_880.75, true],
  ["Tailspin Toys", "Austin", 18, 7_402.0, true],
];
const money = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Front page: what the app does, and the way into the builder. */
export default function Landing({ onStart }) {
  const [local, setLocal] = useState(null);
  useEffect(() => {
    api.localServers().then((list) => setLocal(list.find((i) => i.running) || null)).catch(() => {});
  }, []);

  const start = (
    <button className="btn btn-primary lp-cta" onClick={onStart}>Start building a report</button>
  );

  return (
    <div className="lp">
      <header className="lp-top">
        <p className="lp-brand">Report builder</p>
        <button className="btn btn-sm" onClick={onStart}>Open the builder</button>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-kicker">For SQL Server and SSRS</p>
          <h1>Turn a SQL query into an SSRS report in minutes</h1>
          <p className="lp-lead">
            Write a SELECT statement, shape the result on real data, and download a ready-to-upload .rdl file.
            No Report Builder, no Visual Studio, no hand-editing XML.
          </p>
          <div className="row" style={{ marginTop: 24 }}>
            {start}
            <a className="btn btn-quiet" href="#how">See how it works</a>
          </div>
          {local && (
            <p className="lp-local">
              <span className="conn-dot" aria-hidden="true" />
              SQL Server found on this computer at <strong>{local.server}</strong>. You can connect without a login.
            </p>
          )}
        </div>

        <figure className="lp-shot" aria-label="Example report">
          <div className="doc doc-ledger">
            <div className="doc-head">
              <p className="doc-org">Sales team</p>
              <p className="doc-title">Revenue by customer</p>
              <div className="doc-meta"><span>5 rows</span><span>Sorted by revenue, highest first</span></div>
              <ul className="chips"><li>Year is 2026</li></ul>
            </div>
            <div className="rt-wrap rt-fit">
              <table className="rt rt-ledger rt-normal rt-zebra">
                <thead>
                  <tr><th>Customer</th><th>City</th><th style={{ textAlign: "right" }}>Orders</th><th style={{ textAlign: "right" }}>Revenue</th><th>Paid</th></tr>
                </thead>
                <tbody>
                  {SAMPLE.map(([c, city, orders, rev, paid]) => (
                    <tr key={c}>
                      <td>{c}</td><td>{city}</td><td style={{ textAlign: "right" }}>{orders}</td>
                      <td style={{ textAlign: "right" }}>{money(rev)}</td><td>{paid ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td><td /><td style={{ textAlign: "right" }}>{SAMPLE.reduce((s, r) => s + r[2], 0)}</td>
                    <td style={{ textAlign: "right" }}>{money(SAMPLE.reduce((s, r) => s + r[3], 0))}</td><td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </figure>
      </section>

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

      <section className="lp-section">
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
        {start}
      </section>

      <footer className="lp-foot">Report builder · From SQL query to SSRS report</footer>
    </div>
  );
}
