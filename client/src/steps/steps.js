export const STEPS = [
  { title: "Connect", heading: "Connect to your database", help: "Connect to the SQL Server database the report will read from. The app uses this connection to check your query, read its columns and preview real rows.", next: "Continue" },
  { title: "Query", heading: "Write your query", help: "Enter a SELECT statement. SQL Server reports the exact columns and data types it returns.", next: "Read columns" },
  { title: "Columns", heading: "Choose columns", help: "Every column the query returns is selected. Clear the ones you don't want in the report.", next: "Set data types" },
  { title: "Data types", heading: "Confirm data types", help: "Each type comes from the column's SQL Server type. Change any that should display differently. The type controls formatting, totals and the filters you can use.", next: "Design template" },
  { title: "Template", heading: "Shape the template", help: "The template controls how every column looks. It adapts to any number of columns: columns it hasn't seen get default settings, and you can save it to reuse with other queries.", next: "Add title & filters" },
  { title: "Title & filters", heading: "Name the report and filter it", help: "Give the report a title, then add filters to narrow the rows. A row has to match every filter to appear.", next: "Build report" },
  { title: "Report & export", heading: "Review and export to SSRS", help: "Check the report, then download it as an .rdl file you can upload to your SSRS server. The current sort order is carried into the file.", next: null },
];

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
