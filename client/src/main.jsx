import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import TemplatesPage from "./TemplatesPage.jsx";
import OptionsPage from "./OptionsPage.jsx";
import DashboardPage from "./DashboardPage.jsx";
import "./styles.css";

/** "#/build/ssrs", "#/build/adhoc" or "#/build/charts" -> the report kind; null for every other page. */
function kindOf(hash) {
  const m = hash.match(/^#\/build(?:\/(ssrs|adhoc|charts))?$/);
  return m ? m[1] || "ssrs" : null;
}

/**
 * Pages outside the builder: "#/templates" the template designer, "#/options" everything the app can do,
 * "#/dashboards/<id>" the dashboards. Anything else is the home page: the first dashboard, the business overview.
 */
const PAGES = { "#/templates": "templates", "#/options": "options" };
const pageOf = (hash) => PAGES[hash] || (kindOf(hash) ? null : "dashboards");
/** "#/dashboards/sales" -> "sales" (undefined for the first dashboard). */
const departmentIn = (hash) => hash.match(/^#\/dashboards\/([\w-]+)/)?.[1];
const TITLES = { templates: "Templates · LoanMart Insights", options: "What you can do · LoanMart Insights", dashboards: "Dashboards · LoanMart Insights" };

/**
 * "/" shows the business overview, "#/build/<kind>" the builder, and the PAGES their own page.
 * The builder stays mounted so Back (or a visit to another page) doesn't lose work, and so do the dashboards once
 * opened, keeping their database connection.
 */
function Root() {
  const [kind, setKind] = useState(kindOf(location.hash));
  const [page, setPage] = useState(pageOf(location.hash));
  const [department, setDepartment] = useState(departmentIn(location.hash));
  const [dashboardsOpened, setDashboardsOpened] = useState(false);
  useEffect(() => { if (page === "dashboards") setDashboardsOpened(true); }, [page]);
  const building = !!kind;
  const [lastKind, setLastKind] = useState(kind || "ssrs"); // the builder keeps its kind while another page shows
  useEffect(() => { if (kind) setLastKind(kind); }, [kind]);
  useEffect(() => {
    // Opening the builder (from any link or button) starts at the top of the page
    const onHash = () => {
      const k = kindOf(location.hash);
      if (k) window.scrollTo(0, 0);
      setKind(k);
      setPage(pageOf(location.hash));
      if (pageOf(location.hash) === "dashboards") setDepartment(departmentIn(location.hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (!building) document.title = TITLES[page] || "LoanMart Insights"; }, [building, page]);

  return (
    <>
      {page === "templates" && <TemplatesPage />}
      {page === "options" && <div className="rb lp-dark"><OptionsPage /></div>}
      {(dashboardsOpened || page === "dashboards") && <div hidden={page !== "dashboards"}><DashboardPage departmentId={department} /></div>}
      <div hidden={!building}><App kind={kind || lastKind} /></div>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
