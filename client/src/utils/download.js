import { formatValue, fileSlug } from "@report-builder/shared";

export function downloadText(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCSV(cols, rows, tpl, title) {
  const esc = (s) => { s = s == null ? "" : String(s); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [cols.map((c) => esc(c.label)).join(",")];
  rows.forEach((r) => lines.push(cols.map((c) => esc(formatValue(r[c.key], c, tpl))).join(",")));
  downloadText(lines.join("\n"), fileSlug(title) + ".csv", "text/csv");
}
