import { THEME_COLORS } from "@report-builder/shared";

/**
 * The styles ad hoc Excel and PDF files can have: every built-in report style, plus plain. LoanMart also gets its
 * header band; the others a title and run date above the table.
 */
export const FILE_STYLES = ["loanmart", "ledger", "clean", "contrast", "plain"];

const INK = "#18233A";

/**
 * Table colours for a file style, from the same table as the report preview and the .rdl (shared/look.js).
 * headBg / zebra / totalBg are null when the style has none; headLine is the rule under the headings.
 */
export function tablePalette(style) {
  if (!THEME_COLORS[style]) {
    return { ink: INK, headBg: null, headColor: INK, headLine: INK, zebra: null, rowLine: "#E6EAF0", totalBg: null, totalLine: INK };
  }
  const t = THEME_COLORS[style];
  return {
    ink: t.ink || INK, headBg: t.headBg, headColor: t.headColor, headLine: t.headBorder, zebra: t.zebra,
    rowLine: t.rowLine || "#E6EAF0", totalBg: t.totalBg || "#EEF1F6", totalLine: t.totalLine || INK,
  };
}
