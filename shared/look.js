import { BRAND } from "./brand.js";
import { TYPES } from "./constants.js";
import { DISPLAY_OPTIONS } from "./display.js";

// Fine-grained template styling, set by clicking parts of the report in the template designer.
// tpl.look holds changes per part of the report, tpl.types per data type. Anything not set keeps the style's own look.
// Both the preview (client) and the .rdl (server) read them, so the exported report matches the designer.

/** The parts of a report that can be styled, and which settings each has. band is the LoanMart style's header band. */
export const LOOK_PARTS = {
  band: { name: "Header band", props: ["bg", "stripe"] },
  org: { name: "Organisation", props: ["color", "size", "bold"] },
  title: { name: "Title", props: ["color", "size", "bold"] },
  desc: { name: "Description", props: ["color", "size", "bold"] },
  meta: { name: "Generated line", props: ["color", "size"] },
  head: { name: "Column headings", props: ["bg", "color", "size", "bold"] },
  rows: { name: "Rows", props: ["color", "size", "zebra", "line"] },
  totals: { name: "Totals row", props: ["bg", "color", "line"] },
  footer: { name: "Footer note", props: ["color", "size"] },
};

/** Settings each data type can have. display: one of DISPLAY_OPTIONS[type]. */
export const TYPE_PROPS = ["align", "color", "bold", "display"];

export const PROP_NAMES = {
  bg: "Background", color: "Text colour", size: "Text size", bold: "Bold", stripe: "Stripe colour",
  zebra: "Alternate row colour", line: "Line colour", align: "Alignment", display: "Shown as",
};

/** Table colours per style, as the .rdl draws them. rowLine, totalBg and totalLine fall back to the ledger values. */
export const THEME_COLORS = {
  ledger: { headBg: "#18233A", headColor: "#FFFFFF", zebra: "#F3F5F9", headBorder: null, rowLine: "#E6EAF0", totalBg: "#EEF1F6", totalLine: "#18233A" },
  clean: { headBg: null, headColor: "#18233A", zebra: "#F7F8FA", headBorder: "#18233A" },
  contrast: { headBg: "#2D4FD6", headColor: "#FFFFFF", zebra: "#EEF2FE", headBorder: null },
  loanmart: {
    headBg: BRAND.green, headColor: "#FFFFFF", zebra: BRAND.greenTint, headBorder: null,
    rowLine: BRAND.greenLine, totalBg: "#E2EEE6", totalLine: BRAND.green, ink: BRAND.ink, band: true,
  },
};

/** Table text size (points) per row height. */
export const DENSITY_SIZE = { compact: 9, normal: 10, comfortable: 10 };

/**
 * What every part looks like when the template doesn't change it, for the designer to show as the starting values.
 * Sizes in points.
 */
export function lookDefaults(tpl) {
  const th = THEME_COLORS[tpl.theme] || THEME_COLORS.ledger;
  const size = DENSITY_SIZE[tpl.density] || 10;
  const band = !!th.band;
  return {
    band: { bg: BRAND.green, stripe: BRAND.gold },
    org: band ? { color: BRAND.gold, size: 8, bold: true } : { color: "#4A566E", size: 10, bold: true },
    title: band ? { color: "#FFFFFF", size: 20, bold: true } : { color: "#18233A", size: 18, bold: true },
    desc: band ? { color: "#CFE3D6", size: 9.5, bold: false } : { color: "#4A566E", size: 10, bold: false },
    meta: band ? { color: "#9CC3AC", size: 8.5 } : { color: "#7A859A", size: 9 },
    head: { bg: th.headBg || "#FFFFFF", color: th.headColor, size, bold: true },
    rows: { color: th.ink || "#18233A", size, zebra: th.zebra, line: th.rowLine || "#E6EAF0" },
    totals: { bg: th.totalBg || "#EEF1F6", color: th.ink || "#18233A", line: th.totalLine || "#18233A" },
    footer: { color: "#4A566E", size: 8 },
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
const ALIGNS = ["left", "center", "right"];

/** One setting's value if it's valid, else undefined (so bad input from a saved file or request is dropped). */
function cleanProp(prop, v, type) {
  if (["bg", "color", "stripe", "zebra", "line"].includes(prop)) return typeof v === "string" && HEX.test(v) ? v.toUpperCase() : undefined;
  if (prop === "size") { const n = Number(v); return Number.isFinite(n) && n >= 6 && n <= 40 ? Math.round(n * 2) / 2 : undefined; }
  if (prop === "bold") return typeof v === "boolean" ? v : undefined;
  if (prop === "align") return ALIGNS.includes(v) ? v : undefined;
  if (prop === "display") return (DISPLAY_OPTIONS[type] || []).some((o) => o[0] === v) ? v : undefined;
  return undefined;
}

function cleanGroup(obj, props, type) {
  const out = {};
  for (const p of props) {
    const v = cleanProp(p, obj?.[p], type);
    if (v !== undefined) out[p] = v;
  }
  return out;
}

/** tpl.look with only known parts, settings and valid values. */
export function cleanLook(look) {
  const out = {};
  for (const [part, def] of Object.entries(LOOK_PARTS)) {
    const g = cleanGroup(look?.[part], def.props);
    if (Object.keys(g).length) out[part] = g;
  }
  return out;
}

/** tpl.types with only known types, settings and valid values. */
export function cleanTypes(types) {
  const out = {};
  for (const t of TYPES) {
    const g = cleanGroup(types?.[t], TYPE_PROPS, t);
    if (Object.keys(g).length) out[t] = g;
  }
  return out;
}

/** The template's change to one part's setting, or undefined when it keeps the style's own. */
export const lookOf = (tpl, part, prop) => tpl?.look?.[part]?.[prop];
