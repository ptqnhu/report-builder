import { useState } from "react";
import { fileSlug } from "@report-builder/shared";
import { api } from "../api.js";
import Segmented from "../components/Segmented.jsx";
import ReportTable from "../components/ReportTable.jsx";
import ReportDocument from "../components/ReportDocument.jsx";
import PreviewNote from "../components/PreviewNote.jsx";
import { downloadBlob } from "../utils/download.js";

/** [id, menu label, button label] */
const FORMATS = [["xlsx", "Excel (.xlsx)", "Excel"], ["pdf", "PDF (.pdf)", "PDF"], ["csv", "CSV (.csv)", "CSV"]];
/** Every built-in report style, plus plain (server/src/export/palette.js) */
const STYLES = [["loanmart", "LoanMart"], ["ledger", "Ledger"], ["clean", "Clean"], ["contrast", "Contrast"], ["plain", "Plain"]];
const TOTALS = [["show", "Show"], ["hide", "Hide"]];
const PREVIEW_ROWS = 10; // rows shown in the preview below; the file itself has every row

/**
 * Ad hoc export: name the file, pick Excel, PDF or CSV (Excel and PDF in any built-in report style, or plain),
 * and download.
 * The server runs the whole query, so the file has every row (up to its export limit), in the sort order picked
 * on the preview.
 */
export default function ExportStep({ title, setTitle, payload, previewProps, onExpired, onConvert }) {
  const [format, setFormat] = useState("xlsx");
  const [style, setStyle] = useState("loanmart");
  const [totals, setTotals] = useState("show"); // a totals row at the end of Excel and PDF files (CSV has none)
  const styled = format !== "csv";
  const themed = styled && style !== "plain"; // the preview shows the report style; plain and CSV a bare table
  const [, , formatName] = FORMATS.find((f) => f[0] === format);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", error: false });
  const { cols, rows, sort, onSort, onMove } = previewProps;
  const tpl = { ...previewProps.tpl, totals: styled && totals === "show" };

  async function download() {
    setBusy(true);
    setMsg({ text: "", error: false });
    try {
      const r = await api.exportFile({ ...payload, tpl, title, format, style });
      downloadBlob(r.blob, r.fileName);
      setMsg({
        text: r.truncated
          ? `Downloaded ${r.fileName} with the first ${r.rows.toLocaleString()} rows. The query returns more than the export limit; narrow it with a WHERE clause to get the rest.`
          : `Downloaded ${r.fileName} with ${r.rows.toLocaleString()} row${r.rows === 1 ? "" : "s"}.`,
        error: false,
      });
    } catch (e) {
      if (e.status === 410) return onExpired(e);
      setMsg({ text: e.message, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel export no-print" aria-labelledby="adhoc-title">
        <h2 id="adhoc-title">Export the data</h2>
        <div className="export-row">
          <label className="fld">
            <span className="fld-label">File name</span>
            <input className="inp" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Orders report" />
          </label>
          <div className="fld">
            <label className="fld-label" htmlFor="adhoc-format">Format</label>
            <select id="adhoc-format" className="sel" value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMATS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          {styled && (
            <div className="fld">
              <label className="fld-label" htmlFor="adhoc-style">Style</label>
              <select id="adhoc-style" className="sel" value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>
          )}
          {styled && (
            <div className="fld">
              <span className="fld-label">Totals</span>
              <Segmented label="Totals row" value={totals} onChange={setTotals} options={TOTALS} />
            </div>
          )}
        </div>
        <div className="export-actions">
          <button className="btn btn-primary" onClick={download} disabled={busy || !cols.length}>
            {busy ? "Running the query…" : `Download ${formatName}`}
          </button>
          {msg.text && <span className={msg.error ? "error" : "muted"} role={msg.error ? "alert" : "status"}>{msg.text}</span>}
        </div>
        <div className="convert-row">
          <span className="muted">Need a formatted report on your SSRS server, with filters readers can change? Keep this query and these columns and carry on as an SSRS report.</span>
          <button className="btn btn-sm" onClick={onConvert}>Convert to SSRS report →</button>
        </div>
      </section>
      {themed ? (
        <ReportDocument {...previewProps} tpl={{ ...tpl, theme: style, rowNumbers: false }} title={title} desc="" filters={[]} limit={PREVIEW_ROWS} />
      ) : (
        <div className="panel" style={{ padding: 0, marginTop: 16 }}>
          <ReportTable cols={cols} rows={rows} tpl={{ ...tpl, theme: "clean", zebra: false, rowNumbers: false }} sort={sort} onSort={onSort} onMove={onMove} limit={PREVIEW_ROWS} />
        </div>
      )}
      {!themed && <PreviewNote {...previewProps} limit={PREVIEW_ROWS} />}
    </>
  );
}
