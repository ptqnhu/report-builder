export const TYPES = ["Text", "Integer", "Decimal", "Currency", "Percentage", "Date", "DateTime", "Boolean"];
export const NUMERIC = new Set(["Integer", "Decimal", "Currency", "Percentage"]);

/** Groups types into the four families that share formatting and filter rules. */
export const family = (t) =>
  NUMERIC.has(t) ? "Number" : t === "Date" || t === "DateTime" ? "Date" : t === "Boolean" ? "Boolean" : "Text";

export const OPS = {
  Text: [["contains", "contains"], ["notcontains", "does not contain"], ["equals", "is"], ["starts", "starts with"], ["empty", "is empty"], ["notempty", "is not empty"]],
  Number: [["eq", "="], ["neq", "≠"], ["gt", ">"], ["gte", "≥"], ["lt", "<"], ["lte", "≤"], ["between", "between"], ["empty", "is empty"], ["notempty", "is not empty"]],
  Date: [["on", "is on"], ["before", "is before"], ["after", "is after"], ["between", "is between"], ["empty", "is empty"], ["notempty", "is not empty"]],
  Boolean: [["true", "is yes"], ["false", "is no"], ["empty", "is empty"]],
};
export const NO_VALUE_OPS = new Set(["empty", "notempty", "true", "false"]);

export const DATE_FORMATS = ["D MMM YYYY", "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"];

export const DEFAULT_TPL = {
  name: "",
  theme: "ledger",
  density: "normal",
  zebra: true,
  rowNumbers: false,
  totals: true,
  layout: "expand",
  stickyFirst: true,
  org: "",
  footer: "",
  currency: "$",
  decimals: 2,
  dateFormat: "D MMM YYYY",
  order: [],
  cols: {},
};

export const DEFAULT_EXPORT = {
  dsMode: "embedded", // "embedded" connection string or "shared" data source on the report server
  dsRef: "",
  server: "",
  database: "",
  dsAuth: "windows", // "windows" (readers' own login) or "sql" (stored SQL login, set on the server)
  filterMode: "fixed",
  orientation: "landscape",
  schema: "2016",
};
