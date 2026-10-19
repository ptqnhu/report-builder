import { money, whole, decimal, num, bars, share } from "./helpers.js";

/**
 * The Human Resources overview, read from the AdventureWorks HumanResources tables.
 * A snapshot of the current employees (CurrentFlag = 1) in their current department (no EndDate), so there's no
 * period to compare: years of service are counted to today, and pay is each employee's latest rate.
 */

const PEOPLE = whole("employees", "Employees");
const RATE = money("rate", "Average hourly rate");

/** Current employees with their current department; opens every HR query (and the business overview's). */
export const STAFF = `WITH staff AS (
  SELECT e.BusinessEntityID, e.JobTitle, e.HireDate, e.SalariedFlag, d.Name AS Department, d.GroupName
  FROM HumanResources.Employee e
  JOIN HumanResources.EmployeeDepartmentHistory h ON h.BusinessEntityID = e.BusinessEntityID AND h.EndDate IS NULL
  JOIN HumanResources.Department d ON d.DepartmentID = h.DepartmentID
  WHERE e.CurrentFlag = 1
)`;

/** Each employee's latest pay rate; follows STAFF. */
const PAY = `, pay AS (
  SELECT BusinessEntityID, Rate, ROW_NUMBER() OVER (PARTITION BY BusinessEntityID ORDER BY RateChangeDate DESC) AS Latest
  FROM HumanResources.EmployeePayHistory
)`;

const headline = {
  id: "headline",
  sql: `${STAFF}${PAY}
SELECT
  COUNT(DISTINCT s.BusinessEntityID) AS Employees,
  COUNT(DISTINCT s.Department) AS Departments,
  SUM(CASE WHEN s.SalariedFlag = 1 THEN 1 ELSE 0 END) AS Salaried,
  AVG(DATEDIFF(day, s.HireDate, GETDATE()) / 365.25) AS AvgYears,
  AVG(p.Rate) AS AvgRate
FROM staff s
LEFT JOIN pay p ON p.BusinessEntityID = s.BusinessEntityID AND p.Latest = 1`,
  build(rows) {
    if (!rows.length || !num(rows[0][0])) return null;
    const [employees, departments, salaried, years, rate] = rows[0].map(num);
    return {
      tiles: [
        { col: PEOPLE, label: "Employees", value: employees, note: `In ${departments} departments` },
        { col: whole("salaried", "Salaried"), label: "Salaried", value: salaried, note: `${Math.round((salaried / employees) * 100)}% of employees; the rest are paid hourly` },
        { col: decimal("years", "Years of service"), label: "Average years of service", value: years, note: "From hire date to today" },
        { col: RATE, label: "Average hourly rate", value: rate, note: "Each employee's latest rate" },
      ],
    };
  },
};

const charts = [
  {
    id: "hires",
    kind: "line",
    title: "Hires by year",
    why: "Current employees by the year they were hired.",
    sql: `${STAFF}
SELECT YEAR(HireDate) AS HireYear, COUNT(*) AS Hires
FROM staff
GROUP BY YEAR(HireDate)
ORDER BY HireYear`,
    build(rows) {
      if (rows.length < 2) return null;
      // Every year from the first hire to the last, so a year with no hires shows as 0
      const byYear = new Map(rows.map(([y, n]) => [num(y), num(n)]));
      const first = Math.min(...byYear.keys()), last = Math.max(...byYear.keys());
      const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
      return {
        x: { label: "Year", values: years.map(String) },
        measure: whole("hires", "Hires"),
        series: [{ name: "Hires", values: years.map((y) => byYear.get(y) ?? 0) }],
      };
    },
  },
  {
    id: "departments",
    kind: "bar",
    title: "Headcount by department",
    why: "Current employees, largest department first.",
    sql: `${STAFF}
SELECT Department, COUNT(*) AS Employees
FROM staff
GROUP BY Department
ORDER BY Employees DESC`,
    build: (rows) => rows.length && { x: { label: "Department" }, measure: PEOPLE, bars: bars(rows) },
  },
  {
    id: "groups",
    kind: "share",
    title: "Headcount by department group",
    why: "How the company's people split across its groups of departments.",
    sql: `${STAFF}
SELECT GroupName, COUNT(*) AS Employees
FROM staff
GROUP BY GroupName
ORDER BY Employees DESC`,
    build: (rows) => share(rows, PEOPLE),
  },
  {
    id: "pay",
    kind: "bar",
    title: "Average hourly rate by department",
    why: "Each employee's latest rate, averaged per department, highest first.",
    sql: `${STAFF}${PAY}
SELECT s.Department, AVG(p.Rate) AS AvgRate
FROM staff s
JOIN pay p ON p.BusinessEntityID = s.BusinessEntityID AND p.Latest = 1
GROUP BY s.Department
ORDER BY AvgRate DESC`,
    build: (rows) => rows.length && { x: { label: "Department" }, measure: RATE, bars: bars(rows) },
  },
  {
    id: "titles",
    kind: "bar",
    title: "Most common job titles",
    why: "The 10 job titles held by the most current employees.",
    sql: `${STAFF}
SELECT TOP 10 JobTitle, COUNT(*) AS Employees
FROM staff
GROUP BY JobTitle
ORDER BY Employees DESC, JobTitle`,
    build: (rows) => rows.length && { x: { label: "Job title" }, measure: PEOPLE, bars: bars(rows) },
  },
];

export default {
  id: "hr",
  name: "Human Resources",
  summary: "Today's headcount, where people work, how long they've been here and what they're paid.",
  tables: "HumanResources.Employee, HumanResources.EmployeeDepartmentHistory, HumanResources.Department and HumanResources.EmployeePayHistory",
  headline,
  charts,
};
