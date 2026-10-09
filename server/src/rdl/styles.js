import { idLike } from "@report-builder/shared";

export const NET_TYPE = {
  Text: "System.String", Integer: "System.Int32", Decimal: "System.Decimal", Currency: "System.Decimal",
  Percentage: "System.Decimal", Date: "System.DateTime", DateTime: "System.DateTime", Boolean: "System.Boolean",
};
export const NET_DATE = { "D MMM YYYY": "d MMM yyyy", "YYYY-MM-DD": "yyyy-MM-dd", "MM/DD/YYYY": "MM'/'dd'/'yyyy", "DD/MM/YYYY": "dd'/'MM'/'yyyy" };

export const THEME_RDL = {
  ledger: { headBg: "#18233A", headColor: "White", zebra: "#F3F5F9", headBorder: null },
  clean: { headBg: null, headColor: "#18233A", zebra: "#F7F8FA", headBorder: "#18233A" },
  contrast: { headBg: "#2D4FD6", headColor: "White", zebra: "#EEF2FE", headBorder: null },
};
export const DENSITY_RDL = {
  compact: { pad: 2, size: 9, h: 0.22 },
  normal: { pad: 4, size: 10, h: 0.28 },
  comfortable: { pad: 7, size: 10, h: 0.36 },
};

/** .NET format string matching the app's display format for a column. */
export function netFormat(c, tpl) {
  const d = Number(tpl.decimals);
  const frac = d > 0 ? "." + "0".repeat(d) : "";
  switch (c.type) {
    case "Integer": return idLike(c.name) ? "0" : "#,0";
    case "Decimal": return "#,0" + frac;
    case "Currency": {
      const sym = (tpl.currency || "").replace(/'/g, "");
      const q = sym ? `'${sym}'` : "";
      return `${q}#,0${frac};-${q}#,0${frac}`;
    }
    case "Percentage": { const pd = Math.min(d, 2); return "0" + (pd ? "." + "0".repeat(pd) : "") + "%"; }
    case "Date": return NET_DATE[tpl.dateFormat];
    case "DateTime": return NET_DATE[tpl.dateFormat] + " HH:mm";
    default: return null;
  }
}

/** Column width in inches from the template setting, or a guess from type and heading length. */
export function colWidth(c) {
  const fixed = { narrow: 0.9, medium: 1.6, wide: 2.6 }[c.width];
  if (fixed) return fixed;
  const base = { Text: 1.6, Integer: 0.9, Decimal: 1.1, Currency: 1.2, Percentage: 0.9, Date: 1.1, DateTime: 1.5, Boolean: 0.8 }[c.type] || 1.2;
  return Math.max(base, Math.min(3, c.label.length * 0.085 + 0.35));
}
