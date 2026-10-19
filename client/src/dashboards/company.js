import { inPeriod, withPrior, isCurrent, step, money, whole, num, change, versus, bars, share, timeline } from "./helpers.js";
import { STAFF } from "./humanResources.js";

/**
 * The whole business at a glance, the app's home page: sales, profit and purchasing for the slicer's period against
 * the period before, and where the people work (today, whatever the period).
 * Gross profit is revenue less what the products cost when they were sold (the product's standard cost then, from
 * Production.ProductCostHistory, or its current standard cost where there's no history).
 */

const REVENUE = money("revenue", "Revenue");
const PROFIT = money("profit", "Gross profit");

/** Order lines with what they cost: follows a FROM Sales.SalesOrderHeader h. */
const LINES = `JOIN Sales.SalesOrderDetail d ON d.SalesOrderID = h.SalesOrderID
JOIN Production.Product pr ON pr.ProductID = d.ProductID
LEFT JOIN Production.ProductCostHistory ch ON ch.ProductID = d.ProductID
  AND h.OrderDate >= ch.StartDate AND (ch.EndDate IS NULL OR h.OrderDate <= ch.EndDate)`;
const COST = "d.OrderQty * COALESCE(ch.StandardCost, pr.StandardCost)";

const headline = {
  id: "headline",
  sql: (p) => `WITH lines AS (
  SELECT ${isCurrent("h.OrderDate", p)} AS IsCurrent, h.SalesOrderID,
         d.LineTotal AS Revenue, d.LineTotal - ${COST} AS Profit
  FROM Sales.SalesOrderHeader h
  ${LINES.replace(/\n/g, "\n  ")}
  WHERE ${withPrior("h.OrderDate", p)}
), spend AS (
  SELECT ${isCurrent("po.OrderDate", p)} AS IsCurrent, po.SubTotal
  FROM Purchasing.PurchaseOrderHeader po
  WHERE ${withPrior("po.OrderDate", p)}
)
SELECT
  SUM(CASE WHEN IsCurrent = 1 THEN Revenue ELSE 0 END) AS Revenue,
  SUM(CASE WHEN IsCurrent = 0 THEN Revenue ELSE 0 END) AS PriorRevenue,
  SUM(CASE WHEN IsCurrent = 1 THEN Profit ELSE 0 END) AS Profit,
  SUM(CASE WHEN IsCurrent = 0 THEN Profit ELSE 0 END) AS PriorProfit,
  COUNT(DISTINCT CASE WHEN IsCurrent = 1 THEN SalesOrderID END) AS Orders,
  COUNT(DISTINCT CASE WHEN IsCurrent = 0 THEN SalesOrderID END) AS PriorOrders,
  (SELECT SUM(SubTotal) FROM spend WHERE IsCurrent = 1) AS Spend,
  (SELECT SUM(SubTotal) FROM spend WHERE IsCurrent = 0) AS PriorSpend
FROM lines`,
  build(rows, p) {
    const [revenue, priorRevenue, profit, priorProfit, orders, priorOrders, spend, priorSpend] = (rows[0] || []).map(num);
    const vs = versus(p);
    const margin = (pr, r) => `${((pr / r) * 100).toFixed(1)}%`;
    return {
      tiles: [
        { col: REVENUE, label: "Revenue", value: revenue, change: change(revenue, priorRevenue), vs },
        { col: PROFIT, label: "Gross profit", value: profit, change: change(profit, priorProfit), vs,
          note: revenue ? `${margin(profit, revenue)} margin${priorRevenue ? `, from ${margin(priorProfit, priorRevenue)}` : ""}` : "" },
        { col: whole("orders", "Sales orders"), label: "Sales orders", value: orders, change: change(orders, priorOrders), vs },
        { col: money("spend", "Purchasing spend"), label: "Purchasing spend", value: spend, change: change(spend, priorSpend), vs },
      ],
    };
  },
};

const charts = [
  {
    id: "trend",
    kind: "line",
    title: "Revenue and gross profit over time",
    why: "The gap between the lines is what the products cost.",
    sql: (p) => `SELECT ${step("h.OrderDate", p)} AS Period,
  SUM(d.LineTotal) AS Revenue, SUM(d.LineTotal - ${COST}) AS GrossProfit
FROM Sales.SalesOrderHeader h
${LINES}
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY ${step("h.OrderDate", p)}
ORDER BY Period`,
    build: (rows, p) => timeline(rows, p, REVENUE, ["Revenue", "Gross profit"]),
  },
  {
    id: "region",
    kind: "share",
    title: "Revenue by region",
    why: "By sales territory group.",
    sql: (p) => `SELECT t.[Group] AS Region, SUM(h.SubTotal) AS Revenue
FROM Sales.SalesOrderHeader h
JOIN Sales.SalesTerritory t ON t.TerritoryID = h.TerritoryID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY t.[Group]
ORDER BY Revenue DESC`,
    build: (rows) => share(rows, REVENUE),
  },
  {
    id: "channel",
    kind: "share",
    title: "Revenue by channel",
    why: "Orders placed online against orders through resellers.",
    sql: (p) => `SELECT CASE WHEN h.OnlineOrderFlag = 1 THEN 'Online' ELSE 'Reseller' END AS Channel, SUM(h.SubTotal) AS Revenue
FROM Sales.SalesOrderHeader h
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY h.OnlineOrderFlag
ORDER BY Revenue DESC`,
    build: (rows) => share(rows, REVENUE),
  },
  {
    id: "profit",
    kind: "bar",
    title: "Gross profit by product category",
    why: "Largest first.",
    sql: (p) => `SELECT COALESCE(c.Name, 'Uncategorized') AS Category, SUM(d.LineTotal - ${COST}) AS GrossProfit
FROM Sales.SalesOrderHeader h
${LINES}
LEFT JOIN Production.ProductSubcategory s ON s.ProductSubcategoryID = pr.ProductSubcategoryID
LEFT JOIN Production.ProductCategory c ON c.ProductCategoryID = s.ProductCategoryID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY COALESCE(c.Name, 'Uncategorized')
ORDER BY GrossProfit DESC`,
    build: (rows) => rows.length && { x: { label: "Category" }, measure: PROFIT, bars: bars(rows) },
  },
  {
    id: "people",
    kind: "bar",
    title: "Where the people work",
    why: "Current employees by department group, largest first. Today's headcount, whatever the dates.",
    sql: () => `${STAFF}
SELECT GroupName, COUNT(*) AS Employees
FROM staff
GROUP BY GroupName
ORDER BY Employees DESC`,
    build: (rows) => rows.length && { x: { label: "Department group" }, measure: whole("employees", "Employees"), bars: bars(rows) },
  },
];

export default {
  id: "company",
  name: "Business overview",
  heading: "Business performance",
  summary: "Sales, profit, purchasing and people across the whole business.",
  tables: "the Sales, Purchasing, Production and HumanResources tables",
  dates: { table: "Sales.SalesOrderHeader", column: "OrderDate", what: "sales order date" },
  headline,
  charts,
};
