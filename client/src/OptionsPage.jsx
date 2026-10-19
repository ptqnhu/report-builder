import { useEffect } from "react";
import Logo from "./components/Logo.jsx";
import { Icon } from "./components/Icon.jsx";
import "./landing.css";

/** Everything the app offers, each with the link into it. */
const OPTIONS = [
  {
    icon: "file",
    title: "SSRS report",
    lead: "A formatted report for your SSRS or Power BI Report Server, built from your own query.",
    gets: [
      "A ready-to-upload .rdl file: no Report Builder or Visual Studio",
      "Your template's style, header, footer and number and date formats",
      "Filters readers can change in SSRS, with the defaults you pick",
      "Previewed on real rows from your database as you build it",
    ],
    needs: "A SQL Server connection and a SELECT query (or ask AI to write it).",
    action: "Create SSRS report",
    href: "#/build/ssrs",
  },
  {
    icon: "columns",
    title: "Ad hoc export",
    lead: "Every row your query returns, downloaded as a file to share or work on.",
    gets: [
      "Excel (.xlsx), PDF or CSV",
      "Every row, not just the preview: up to 500,000 (PDF up to 20,000)",
      "Excel and PDF in any built-in style (LoanMart, Ledger, Clean, Contrast) or plain, with an optional totals row",
      "Can be turned into an SSRS report later without starting over",
    ],
    needs: "A SQL Server connection and a SELECT query (or ask AI to write it).",
    action: "Create ad hoc export",
    href: "#/build/adhoc",
  },
  {
    icon: "eye",
    title: "See data in charts",
    lead: "Ask a question in plain English and see the answer as charts, suggested from the rows that come back.",
    gets: [
      "AI writes a query that sums up your data (by month, by branch, top 10…)",
      "Totals at a glance, plus trend, ranking and share charts that suit the result",
      "Follow-ups like “split it by state” redraw the charts",
      "Every chart can be read as a table, and turned into an SSRS report",
    ],
    needs: "A SQL Server connection. Only table and column names are sent to the AI, never your data.",
    action: "See data in charts",
    href: "#/build/charts",
  },
  {
    icon: "layers",
    title: "Template designer",
    lead: "Design a report look once and reuse it on any SSRS report.",
    gets: [
      "Style, row height and column layout",
      "Organisation name, footer note, currency, decimals and date format",
      "Designed on sample loan data, previewed as you change it",
      "Shared with everyone using this app, picked in the Template step",
    ],
    needs: "Nothing: no database connection needed.",
    action: "Open the template designer",
    href: "#/templates",
  },
  {
    icon: "spark",
    title: "Ask AI to write the query",
    lead: "Describe the report in plain English and Claude writes the SELECT statement for you.",
    gets: [
      "A query that uses your database's real tables and columns",
      "A short explanation of what it returns and any assumptions",
      "Follow-ups like “only active loans” update the query",
      "Only table and column names are sent, never your data",
    ],
    needs: "Part of the Query step in both SSRS reports and ad hoc exports.",
    action: "Start a report with AI",
    href: "#/build/ssrs",
  },
];

/** The two report kinds side by side, to help pick one. */
const COMPARE = [
  ["You get", "An .rdl file for your report server", "An Excel, PDF or CSV file"],
  ["Rows", "Every row, each time the report runs", "Every row at the moment you download"],
  ["Look", "A built-in style or your own template", "A built-in style or plain (Excel and PDF)"],
  ["Readers can filter", "Yes, with filters you choose", "No: filter in Excel instead"],
  ["Best for", "Reports people open again and again", "One-off pulls and quick checks"],
];

/** "Explore" page (#/options): every way to use the app, with a way into each. */
export default function OptionsPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []); // opened from partway down another page

  return (
    <>
      <div className="lp-page">
        <header className="lp-bar">
          <div className="lp lp-top">
            <p className="lp-brand"><a href="#" title="Back to the home page"><Logo size={30} />LoanMart Insights</a></p>
            <div className="rail-end">
              <a className="btn btn-sm" href="#"><Icon name="back" size={14} /> Dashboards</a>
            </div>
          </div>
        </header>

        <section className="lp lp-section">
          <h1 className="lp-opt-title">What you can do</h1>
          <p className="lp-lead">
            Build a report for your report server, download your data as a file, see it in charts, or design a
            template to reuse.
            Pick where to start. You can come back here any time from All tools in the top bar of the dashboards.
          </p>

          <ul className="lp-options">
            {OPTIONS.map((o) => (
              <li key={o.title} className="lp-card lp-option">
                <span className="lp-tile sm"><Icon name={o.icon} size={16} /></span>
                <h2>{o.title}</h2>
                <p className="lp-copy">{o.lead}</p>
                <ul className="lp-gets">
                  {o.gets.map((g) => <li key={g}>{g}</li>)}
                </ul>
                <p className="lp-needs"><strong>You'll need:</strong> {o.needs}</p>
                <a className="btn lp-cta" href={o.href}>{o.action} <Icon name="arrow" size={15} /></a>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp lp-section">
          <h2>SSRS report or ad hoc export?</h2>
          <div className="lp-card lp-compare-wrap">
            <table className="lp-compare">
              <thead>
                <tr><th /><th>SSRS report</th><th>Ad hoc export</th></tr>
              </thead>
              <tbody>
                {COMPARE.map(([what, ssrs, adhoc]) => (
                  <tr key={what}><th scope="row">{what}</th><td>{ssrs}</td><td>{adhoc}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="lp lp-foot">
          <p className="lp-brand sm"><Logo size={20} />LoanMart Insights</p>
          <span>From a simple requirement to a ready-to-share report</span>
        </footer>
      </div>
    </>
  );
}
