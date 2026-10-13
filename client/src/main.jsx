import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Landing from "./Landing.jsx";
import TemplatesPage from "./TemplatesPage.jsx";
import OptionsPage from "./OptionsPage.jsx";
import "./styles.css";

/** "#/build/ssrs" or "#/build/adhoc" -> the report kind; anything else is the landing page. */
function kindOf(hash) {
  const m = hash.match(/^#\/build(?:\/(ssrs|adhoc))?$/);
  return m ? m[1] || "ssrs" : null;
}

/** Pages outside the builder: "#/templates" the template designer, "#/options" everything the app can do. */
const PAGES = { "#/templates": "templates", "#/options": "options" };
const pageOf = (hash) => PAGES[hash] || null;
const TITLES = { templates: "Templates · Report builder", options: "What you can do · Report builder" };

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
    const onHash = () => { setKind(kindOf(location.hash)); setPage(pageOf(location.hash)); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (!building) document.title = TITLES[page] || "Report builder"; }, [building, page]);
  const start = (k) => { location.hash = `#/build/${k}`; window.scrollTo(0, 0); };

  return (
    <>
      {page === "templates" && <TemplatesPage />}
      {page === "options" && <div className="rb lp-dark"><OptionsPage onStart={start} /></div>}
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
