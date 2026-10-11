import ExportPanel from "../components/ExportPanel.jsx";
import ReportDocument from "../components/ReportDocument.jsx";
import SlicerBar from "../components/SlicerBar.jsx";
import { downloadCSV } from "../utils/download.js";

export default function ReportStep({ exp, setExp, rdlResult, previewProps, slicerProps, onEditTemplate, onEditFilters }) {
  const { cols, rows, tpl, title } = previewProps;
  return (
    <>
      <ExportPanel exp={exp} onChange={(p) => setExp((e) => ({ ...e, ...p }))} result={rdlResult}
        slicerLabels={slicerProps.slicers.map((s) => slicerProps.colsByKey[s.col].label)} />
      <div className="report-bar no-print">
        <button className="btn" onClick={() => downloadCSV(cols, rows, tpl, title)}>Download CSV</button>
        <button className="btn" onClick={() => window.print()}>Print</button>
        <button className="btn" onClick={onEditTemplate}>Edit template</button>
        <button className="btn" onClick={onEditFilters}>Edit title & filters</button>
      </div>
      <ReportDocument {...previewProps} filterBar={slicerProps.slicers.length > 0 && <SlicerBar {...slicerProps} />} />
    </>
  );
}
