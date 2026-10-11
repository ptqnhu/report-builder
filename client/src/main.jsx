import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Landing from "./Landing.jsx";
import "./styles.css";

/** "#/build/ssrs" or "#/build/adhoc" -> the report kind; anything else is the landing page. */
function kindOf(hash) {
  const m = hash.match(/^#\/build(?:\/(ssrs|adhoc))?$/);
  return m ? m[1] || "ssrs" : null;
}

/** "/" shows the landing page, "#/build/<kind>" the builder. The builder stays mounted so Back doesn't lose work. */
function Root() {
  const [kind, setKind] = useState(kindOf(location.hash));
  const building = !!kind;
  const [lastKind, setLastKind] = useState(kind || "ssrs"); // the builder keeps its kind while the landing page shows
  useEffect(() => { if (kind) setLastKind(kind); }, [kind]);
  useEffect(() => {
    const onHash = () => setKind(kindOf(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (!building) document.title = "Report builder"; }, [building]);

  return (
    <>
      {!building && <div className="rb lp-dark"><Landing onStart={(k) => { location.hash = `#/build/${k}`; window.scrollTo(0, 0); }} /></div>}
      <div hidden={!building}><App kind={kind || lastKind} /></div>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
