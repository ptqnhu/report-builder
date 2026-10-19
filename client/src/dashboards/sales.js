import { inPeriod, withPrior, step, money, whole, num, change, versus, bars, share, timeline } from "./helpers.js";

/**
 * The Sales department's overview, read from the AdventureWorks Sales tables, for the slicer's period; the headline
 * tiles compare it with the period before. Revenue is the order subtotal: before tax and freight.
 */

const REVENUE = money("revenue", "Revenue");

const headline = {
  id: "headline",
  sql: (p) => `SELECT
  SUM(CASE WHEN ${inPeriod("h.OrderDate", p)} THEN h.SubTotal ELSE 0 END) AS Revenue,
  SUM(CASE WHEN ${inPeriod("h.OrderDate", p)} THEN 0 ELSE h.SubTotal END) AS PriorRevenue,
  SUM(CASE WHEN ${inPeriod("h.OrderDate", p)} THEN 1 ELSE 0 END) AS Orders,
  SUM(CASE WHEN ${inPeriod("h.OrderDate", p)} THEN 0 ELSE 1 END) AS PriorOrders,
  COUNT(DISTINCT CASE WHEN ${inPeriod("h.OrderDate", p)} THEN h.CustomerID END) AS Customers,
  COUNT(DISTINCT CASE WHEN ${inPeriod("h.OrderDate", p)} THEN NULL ELSE h.CustomerID END) AS PriorCustomers
FROM Sales.SalesOrderHeader h
WHERE ${withPrior("h.OrderDate", p)}`,
  build(rows, p) {
    const [revenue, priorRevenue, orders, priorOrders, customers, priorCustomers] = (rows[0] || []).map(num);
    const aov = orders ? revenue / orders : 0, priorAov = priorOrders ? priorRevenue / priorOrders : 0;
    const vs = versus(p);
    return {
      tiles: [
        { col: REVENUE, label: "Revenue", value: revenue, change: change(revenue, priorRevenue), vs },
        { col: whole("orders", "Orders"), label: "Orders", value: orders, change: change(orders, priorOrders), vs },
        { col: money("aov", "Average order"), label: "Average order", value: aov, change: change(aov, priorAov), vs },
        { col: whole("customers", "Customers"), label: "Customers who ordered", value: customers, change: change(customers, priorCustomers), vs },
      ],
    };
  },
};

const charts = [
  {
    id: "trend",
    kind: "line",
    title: "Revenue over time",
    why: "Online orders and reseller orders as separate lines.",
    sql: (p) => `SELECT ${step("h.OrderDate", p)} AS Period,
  SUM(CASE WHEN h.OnlineOrderFlag = 1 THEN h.SubTotal ELSE 0 END) AS Online,
  SUM(CASE WHEN h.OnlineOrderFlag = 0 THEN h.SubTotal ELSE 0 END) AS Reseller
FROM Sales.SalesOrderHeader h
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY ${step("h.OrderDate", p)}
ORDER BY Period`,
    build: (rows, p) => timeline(rows, p, REVENUE, ["Online", "Reseller"]),
  },
  {
    id: "territory",
    kind: "bar",
    title: "Revenue by territory",
    why: "Largest first.",
    sql: (p) => `SELECT t.Name AS Territory, SUM(h.SubTotal) AS Revenue
FROM Sales.SalesOrderHeader h
JOIN Sales.SalesTerritory t ON t.TerritoryID = h.TerritoryID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY t.Name
ORDER BY Revenue DESC`,
    build: (rows) => rows.length && { x: { label: "Territory" }, measure: REVENUE, bars: bars(rows) },
  },
  {
    id: "category",
    kind: "share",
    title: "Revenue by product category",
    why: "From the order lines.",
    sql: (p) => `SELECT COALESCE(c.Name, 'Uncategorized') AS Category, SUM(d.LineTotal) AS Revenue
FROM Sales.SalesOrderHeader h
JOIN Sales.SalesOrderDetail d ON d.SalesOrderID = h.SalesOrderID
JOIN Production.Product pr ON pr.ProductID = d.ProductID
LEFT JOIN Production.ProductSubcategory s ON s.ProductSubcategoryID = pr.ProductSubcategoryID
LEFT JOIN Production.ProductCategory c ON c.ProductCategoryID = s.ProductCategoryID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY COALESCE(c.Name, 'Uncategorized')
ORDER BY Revenue DESC`,
    build: (rows) => share(rows, REVENUE),
  },
  {
    id: "people",
    kind: "bar",
    title: "Top 10 salespeople",
    why: "By revenue. Online orders have no salesperson, so they aren't counted here.",
    sql: (p) => `SELECT TOP 10 pe.FirstName + ' ' + pe.LastName AS SalesPerson, SUM(h.SubTotal) AS Revenue
FROM Sales.SalesOrderHeader h
JOIN Person.Person pe ON pe.BusinessEntityID = h.SalesPersonID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY pe.BusinessEntityID, pe.FirstName, pe.LastName
ORDER BY Revenue DESC`,
    build: (rows) => rows.length && { x: { label: "Salesperson" }, measure: REVENUE, bars: bars(rows) },
  },
  {
    id: "products",
    kind: "bar",
    title: "Top 10 products",
    why: "By revenue, from the order lines.",
    sql: (p) => `SELECT TOP 10 pr.Name AS Product, SUM(d.LineTotal) AS Revenue
FROM Sales.SalesOrderHeader h
JOIN Sales.SalesOrderDetail d ON d.SalesOrderID = h.SalesOrderID
JOIN Production.Product pr ON pr.ProductID = d.ProductID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY pr.ProductID, pr.Name
ORDER BY Revenue DESC`,
    build: (rows) => rows.length && { x: { label: "Product" }, measure: REVENUE, bars: bars(rows) },
  },
];

export default {
  id: "sales",
  name: "Sales",
  summary: "Revenue, orders, customers and who and what drives them.",
  tables: "Sales.SalesOrderHeader, Sales.SalesOrderDetail, Sales.SalesTerritory and the Production product tables",
  dates: { table: "Sales.SalesOrderHeader", column: "OrderDate", what: "order date" },
  headline,
  charts,
};
