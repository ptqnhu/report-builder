/**
 * Every step, by id. `next` is the label of the button that moves on; a function gets the report kind.
 * `previewBar` shows the "Previewing the first N rows" bar above the step once the query has been read.
 */
export const STEPS = {
  connect: { title: "Connect", heading: "Connect to your database", help: "Connect to the SQL Server database the report will read from. The app uses this connection to check your query, read its columns and preview real rows.", next: "Continue" },
  query: { title: "Query", heading: "Write your query", help: "Enter a SELECT statement. SQL Server reports the exact columns and data types it returns.", next: "Read columns" },
  columns: { title: "Columns", heading: "Choose columns and how they show", help: "Every column the query returns is selected; clear the ones you don't want. Each type comes from the column's SQL Server type. Then pick how each column's values are shown.", previewBar: true, next: (kind) => (kind === "adhoc" ? "Review export" : "Design template") },
  template: { title: "Template", heading: "Shape the template", help: "The style controls how the report looks. Pick a built-in style or one of your templates from the template designer. Changes here, including each column's heading and width, apply to this report only.", previewBar: true, next: "Add title & filters" },
  details: { title: "Title & filters", heading: "Name the report and filter it", help: "Give the report a title, then choose the filters readers can use in SSRS to slice the data themselves.", previewBar: true, next: "Build report" },
  report: { title: "Report & export", heading: "Review and export to SSRS", help: "Check the report, then download it as an .rdl file you can upload to your SSRS server. The current sort order is carried into the file.", previewBar: true, next: null },
  chart: { title: "Ask & chart", heading: "See your data in charts", help: "Describe what you want to see. AI writes a query that sums up your data, the app runs it, and charts that suit the result are suggested below. Ask follow-ups to change them.", next: null },
  export: { title: "Export", heading: "Download your data", help: "Name the file and pick a format. The download runs the whole query, so it has every row, not just the preview. Click a column heading to sort the file.", previewBar: true, next: null },
};

/** Steps every report kind shares. The kind is chosen from a link into the builder. Charts ask AI in their own step. */
const COMMON = ["connect", "query", "columns"];
export const FLOWS = {
  adhoc: [...COMMON, "export"],
  ssrs: [...COMMON, "template", "details", "report"],
  charts: ["connect", "chart"],
};

/** How many steps two flows share from the start: what a switch between them keeps. */
export const sharedSteps = (a, b) => {
  let n = 0;
  while (n < a.length && a[n] === b[n]) n++;
  return n;
};

export const KIND_NAMES = { adhoc: "Ad hoc export", ssrs: "SSRS report", charts: "Charts" };

export const EXAMPLE_SQL =
`SELECT TOP 10
    p.Name               AS ProductName,
    pc.Name              AS Category,
    SUM(sod.OrderQty)    AS TotalQuantitySold,
    SUM(sod.LineTotal)   AS TotalRevenue
FROM Sales.SalesOrderDetail AS sod
JOIN Production.Product AS p
    ON sod.ProductID = p.ProductID
JOIN Production.ProductSubcategory AS psc
    ON p.ProductSubcategoryID = psc.ProductSubcategoryID
JOIN Production.ProductCategory AS pc
    ON psc.ProductCategoryID = pc.ProductCategoryID
GROUP BY
  p.Name, pc.Name
ORDER BY
  TotalRevenue DESC
;`;