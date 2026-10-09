import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Landing from "./Landing.jsx";
import "./styles.css";

const BUILD_HASH = "#/build";

/** "/" shows the landing page, "#/build" the builder. The builder stays mounted so Back doesn't lose work. */
function Root() {
  const [building, setBuilding] = useState(location.hash === BUILD_HASH);
  useEffect(() => {
    const onHash = () => setBuilding(location.hash === BUILD_HASH);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { if (!building) document.title = "Report builder"; }, [building]);

  return (
    <>
      {!building && <div className="rb lp-dark"><Landing onStart={() => { location.hash = BUILD_HASH; window.scrollTo(0, 0); }} /></div>}
      <div hidden={!building}><App /></div>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
