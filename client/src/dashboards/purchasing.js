import { inPeriod, withPrior, isCurrent, step, money, whole, percent, num, change, versus, bars, share, timeline } from "./helpers.js";

/**
 * The Purchasing department's overview, read from the AdventureWorks Purchasing tables, for the slicer's period; the
 * headline tiles compare it with the period before. Spend is the order subtotal: before tax and freight.
 */

const SPEND = money("spend", "Spend");

const headline = {
  id: "headline",
  sql: (p) => `WITH po AS (
  SELECT h.PurchaseOrderID, h.VendorID, h.SubTotal, ${isCurrent("h.OrderDate", p)} AS IsCurrent
  FROM Purchasing.PurchaseOrderHeader h
  WHERE ${withPrior("h.OrderDate", p)}
), received AS (
  SELECT po.IsCurrent, SUM(d.RejectedQty) / NULLIF(SUM(d.ReceivedQty), 0) AS RejectedShare
  FROM po
  JOIN Purchasing.PurchaseOrderDetail d ON d.PurchaseOrderID = po.PurchaseOrderID
  GROUP BY po.IsCurrent
)
SELECT
  SUM(CASE WHEN IsCurrent = 1 THEN SubTotal ELSE 0 END) AS Spend,
  SUM(CASE WHEN IsCurrent = 0 THEN SubTotal ELSE 0 END) AS PriorSpend,
  SUM(IsCurrent) AS Orders,
  SUM(1 - IsCurrent) AS PriorOrders,
  COUNT(DISTINCT CASE WHEN IsCurrent = 1 THEN VendorID END) AS Vendors,
  COUNT(DISTINCT CASE WHEN IsCurrent = 0 THEN VendorID END) AS PriorVendors,
  (SELECT RejectedShare FROM received WHERE IsCurrent = 1) AS RejectedShare,
  (SELECT RejectedShare FROM received WHERE IsCurrent = 0) AS PriorRejectedShare
FROM po`,
  build(rows, p) {
    const [spend, priorSpend, orders, priorOrders, vendors, priorVendors, rejected] = (rows[0] || []).map(num);
    const priorRejected = rows[0]?.[7];
    const vs = versus(p);
    return {
      tiles: [
        { col: SPEND, label: "Spend", value: spend, change: change(spend, priorSpend), vs },
        { col: whole("orders", "Purchase orders"), label: "Purchase orders", value: orders, change: change(orders, priorOrders), vs },
        { col: whole("vendors", "Vendors"), label: "Vendors ordered from", value: vendors, change: change(vendors, priorVendors), vs },
        // A rate's change is told in points, so it's a note rather than an up/down percentage of a percentage
        { col: percent("rejected", "Units rejected"), label: "Units rejected on receipt", value: rejected,
          note: p.compare && priorRejected !== null && priorRejected !== undefined ? `${(num(priorRejected) * 100).toFixed(1)}% in ${p.prevLabel}` : "" },
      ],
    };
  },
};

const charts = [
  {
    id: "trend",
    kind: "line",
    title: "Spend over time",
    why: "Purchase orders by the date they were placed.",
    sql: (p) => `SELECT ${step("h.OrderDate", p)} AS Period, SUM(h.SubTotal) AS Spend
FROM Purchasing.PurchaseOrderHeader h
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY ${step("h.OrderDate", p)}
ORDER BY Period`,
    build: (rows, p) => timeline(rows, p, SPEND, ["Spend"]),
  },
  {
    id: "vendors",
    kind: "bar",
    title: "Top 10 vendors",
    why: "By spend.",
    sql: (p) => `SELECT TOP 10 v.Name AS Vendor, SUM(h.SubTotal) AS Spend
FROM Purchasing.PurchaseOrderHeader h
JOIN Purchasing.Vendor v ON v.BusinessEntityID = h.VendorID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY v.BusinessEntityID, v.Name
ORDER BY Spend DESC`,
    build: (rows) => rows.length && { x: { label: "Vendor" }, measure: SPEND, bars: bars(rows) },
  },
  {
    id: "status",
    kind: "share",
    title: "Purchase orders by status",
    why: "Orders placed in the period, by where they are now.",
    sql: (p) => `SELECT CASE h.Status WHEN 1 THEN 'Pending' WHEN 2 THEN 'Approved' WHEN 3 THEN 'Rejected' WHEN 4 THEN 'Complete' ELSE 'Other' END AS Status,
  COUNT(*) AS Orders
FROM Purchasing.PurchaseOrderHeader h
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY h.Status
ORDER BY Orders DESC`,
    build: (rows) => share(rows, whole("orders", "Purchase orders")),
  },
  {
    id: "products",
    kind: "bar",
    title: "Top 10 products bought",
    why: "By spend, from the order lines.",
    sql: (p) => `SELECT TOP 10 pr.Name AS Product, SUM(d.LineTotal) AS Spend
FROM Purchasing.PurchaseOrderHeader h
JOIN Purchasing.PurchaseOrderDetail d ON d.PurchaseOrderID = h.PurchaseOrderID
JOIN Production.Product pr ON pr.ProductID = d.ProductID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY pr.ProductID, pr.Name
ORDER BY Spend DESC`,
    build: (rows) => rows.length && { x: { label: "Product" }, measure: SPEND, bars: bars(rows) },
  },
  {
    id: "rejected",
    kind: "bar",
    title: "Most units rejected",
    why: "Products with the most units rejected on receipt.",
    sql: (p) => `SELECT TOP 10 pr.Name AS Product, SUM(d.RejectedQty) AS Rejected
FROM Purchasing.PurchaseOrderHeader h
JOIN Purchasing.PurchaseOrderDetail d ON d.PurchaseOrderID = h.PurchaseOrderID
JOIN Production.Product pr ON pr.ProductID = d.ProductID
WHERE ${inPeriod("h.OrderDate", p)}
GROUP BY pr.ProductID, pr.Name
HAVING SUM(d.RejectedQty) > 0
ORDER BY Rejected DESC`,
    build: (rows) => rows.length && { x: { label: "Product" }, measure: whole("rejected", "Units rejected"), bars: bars(rows) },
  },
];

export default {
  id: "purchasing",
  name: "Purchasing",
  summary: "Spend, vendors, order status and what gets rejected on receipt.",
  tables: "Purchasing.PurchaseOrderHeader, Purchasing.PurchaseOrderDetail, Purchasing.Vendor and Production.Product",
  dates: { table: "Purchasing.PurchaseOrderHeader", column: "OrderDate", what: "order date" },
  headline,
  charts,
};
