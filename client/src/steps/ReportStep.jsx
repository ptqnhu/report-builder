import ExportPanel from "../components/ExportPanel.jsx";
import ReportDocument from "../components/ReportDocument.jsx";
import { downloadCSV } from "../utils/download.js";

export default function ReportStep({ exp, setExp, rdlResult, previewProps, onEditTemplate, onEditFilters }) {
  const { cols, rows, tpl, title } = previewProps;
  return (
    <>
      <ExportPanel exp={exp} onChange={(p) => setExp((e) => ({ ...e, ...p }))} result={rdlResult} />
      <div className="report-bar no-print">
        <button className="btn" onClick={() => downloadCSV(cols, rows, tpl, title)}>Download CSV</button>
        <button className="btn" onClick={() => window.print()}>Print</button>
        <button className="btn" onClick={onEditTemplate}>Edit template</button>
        <button className="btn" onClick={onEditFilters}>Edit title & filters</button>
      </div>
      <ReportDocument {...previewProps} />
    </>
  );
}
