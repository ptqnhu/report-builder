/** Every step, by id. `next` is the label of the button that moves on; a function gets the report kind. */
export const STEPS = {
  connect: { title: "Connect", heading: "Connect to your database", help: "Connect to the SQL Server database the report will read from. The app uses this connection to check your query, read its columns and preview real rows.", next: "Continue" },
  query: { title: "Query", heading: "Write your query", help: "Enter a SELECT statement. SQL Server reports the exact columns and data types it returns.", next: "Read columns" },
  columns: { title: "Columns", heading: "Choose columns and how they show", help: "Every column the query returns is selected; clear the ones you don't want. Each type comes from the column's SQL Server type. Then pick how each column's values are shown.", next: (kind) => (kind === "adhoc" ? "Review export" : "Design template") },
  template: { title: "Template", heading: "Shape the template", help: "The template controls how every column looks. It adapts to any number of columns: columns it hasn't seen get default settings, and you can save it to reuse with other queries.", next: "Add title & filters" },
  details: { title: "Title & filters", heading: "Name the report and filter it", help: "Give the report a title and add any filters to narrow the rows. Then choose the filters readers can use in SSRS to slice the data themselves.", next: "Build report" },
  report: { title: "Report & export", heading: "Review and export to SSRS", help: "Check the report, then download it as an .rdl file you can upload to your SSRS server. The current sort order is carried into the file.", next: null },
  export: { title: "Export", heading: "Download your data", help: "Name the file and pick a format. The download runs the whole query, so it has every row, not just the preview. Click a column heading to sort the file.", next: null },
};

/** Steps every report kind shares. The kind is chosen on the landing page. */
const COMMON = ["connect", "query", "columns"];
export const FLOWS = {
  adhoc: [...COMMON, "export"],
  ssrs: [...COMMON, "template", "details", "report"],
};
export const SHARED_STEPS = COMMON.length;

export const KIND_NAMES = { adhoc: "Ad hoc export", ssrs: "SSRS report" };

export const EXAMPLE_SQL = `SELECT
  o.order_id,
  c.customer_name AS customer,
  c.email,
  c.city,
  o.order_date,
  o.status,
  o.is_paid,
  SUM(oi.quantity) AS total_qty,
  SUM(oi.quantity * oi.unit_price) AS revenue,
  AVG(oi.discount_rate) AS avg_discount
FROM orders o
JOIN customers c ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
GROUP BY o.order_id, c.customer_name, c.email, c.city,
         o.order_date, o.status, o.is_paid`;
