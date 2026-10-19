import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Landing from "./Landing.jsx";
import TemplatesPage from "./TemplatesPage.jsx";
import OptionsPage from "./OptionsPage.jsx";
import "./styles.css";

/** "#/build/ssrs", "#/build/adhoc" or "#/build/charts" -> the report kind; anything else is the landing page. */
function kindOf(hash) {
  const m = hash.match(/^#\/build(?:\/(ssrs|adhoc|charts))?$/);
  return m ? m[1] || "ssrs" : null;
}

/** Pages outside the builder: "#/templates" the template designer, "#/options" everything the app can do. */
const PAGES = { "#/templates": "templates", "#/options": "options" };
const pageOf = (hash) => PAGES[hash] || null;
const TITLES = { templates: "Templates · LoanMart Insights", options: "What you can do · LoanMart Insights" };

/**
 * "/" shows the landing page, "#/build/<kind>" the builder, and the PAGES their own page.
 * The builder stays mounted so Back (or a visit to another page) doesn't lose work.
 */
function Root() {
  const [kind, setKind] = useState(kindOf(location.hash));
  const [page, setPage] = useState(pageOf(location.hash));
  const building = !!kind;
  const [lastKind, setLastKind] = useState(kind || "ssrs"); // the builder keeps its kind while the landing page shows
  useEffect(() => { if (kind) setLastKind(kind); }, [kind]);
  useEffect(() => {
    // Opening the builder (from any link or button) starts at the top of the page
    const onHash = () => {
      const k = kindOf(location.hash);
      if (k) window.scrollTo(0, 0);
      setKind(k);
      setPage(pageOf(location.hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (!building) document.title = TITLES[page] || "LoanMart Insights"; }, [building, page]);
  const start = (k) => { location.hash = `#/build/${k}`; };

  return (
    <>
      {page === "templates" && <TemplatesPage />}
      {page === "options" && <div className="rb lp-dark"><OptionsPage /></div>}
      {!building && !page && <div className="rb lp-dark"><Landing onStart={start} /></div>}
      <div hidden={!building}><App kind={kind || lastKind} /></div>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
