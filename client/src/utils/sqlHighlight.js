// T-SQL syntax colouring in the style of SQL Server Management Studio: keywords and data types blue, built-in
// functions magenta, strings red, comments green, and operators (including AND, OR, JOIN, IS NULL…) grey.

const words = (s) => new Set(s.split(/\s+/));

const KEYWORDS = words(`
  ADD ALTER APPLY AS ASC BEGIN BREAK BY CASCADE CASE CHECK CLOSE CLUSTERED COLLATE COLUMN COMMIT CONSTRAINT CONTINUE
  CREATE CURRENT CURSOR DEALLOCATE DECLARE DEFAULT DELETE DESC DISTINCT DROP ELSE END EXCEPT EXEC EXECUTE FETCH
  FIRST FOLLOWING FOR FOREIGN FROM FUNCTION GO GOTO GROUP HAVING IDENTITY IF INDEX INSERT INTERSECT INTO ISOLATION
  KEY LEVEL MATCHED MERGE NEXT NOCOUNT NOLOCK NONCLUSTERED OF OFF OFFSET ON ONLY OPEN OPTION ORDER OUTPUT OVER
  PARTITION PERCENT PIVOT PRECEDING PRIMARY PRINT PROC PROCEDURE RANGE READ RECOMPILE REFERENCES RETURN RETURNS
  ROLLBACK ROW ROWS SCHEMA SELECT SET TABLE THEN TIES TOP TRAN TRANSACTION TRIGGER TRUNCATE UNBOUNDED UNCOMMITTED
  UNION UNIQUE UNPIVOT UPDATE USE USING VALUES VIEW WHEN WHERE WHILE WITH
  BIGINT BINARY BIT CHAR DATE DATETIME DATETIME2 DATETIMEOFFSET DECIMAL FLOAT IMAGE INT MAX MONEY NCHAR NTEXT NUMERIC
  NVARCHAR REAL SMALLDATETIME SMALLINT SMALLMONEY SQL_VARIANT SYSNAME TEXT TIME TIMESTAMP TINYINT UNIQUEIDENTIFIER
  VARBINARY VARCHAR XML`);

const OPERATORS = words("ALL AND ANY BETWEEN CROSS EXISTS FULL IN INNER IS JOIN LEFT LIKE NOT NULL OR OUTER RIGHT SOME");

const FUNCTIONS = words(`
  ABS AVG CAST CEILING CHARINDEX CHECKSUM CHOOSE COALESCE CONCAT CONCAT_WS CONVERT COUNT COUNT_BIG CUME_DIST
  CURRENT_TIMESTAMP CURRENT_USER DATALENGTH DATEADD DATEDIFF DATEDIFF_BIG DATEFROMPARTS DATENAME DATEPART DAY DB_ID
  DB_NAME DENSE_RANK EOMONTH ERROR_MESSAGE ERROR_NUMBER FIRST_VALUE FLOOR FORMAT GETDATE GETUTCDATE GROUPING HASHBYTES
  IIF ISDATE ISNULL ISNUMERIC JSON_VALUE LAG LAST_VALUE LEAD LEN LOG LOWER LTRIM MIN MAX MONTH NEWID NTILE NULLIF
  OBJECT_ID OBJECT_NAME PARSE PATINDEX PERCENT_RANK POWER QUOTENAME RANK REPLACE REPLICATE REVERSE ROUND ROW_NUMBER
  RTRIM SCHEMA_NAME SCOPE_IDENTITY SESSION_USER SIGN SPACE SQRT STDEV STR STRING_AGG STRING_SPLIT STUFF SUBSTRING SUM
  SUSER_SNAME SYSDATETIME SYSTEM_USER TRANSLATE TRIM TRY_CAST TRY_CONVERT TRY_PARSE UPPER USER_NAME VAR YEAR`);

// One alternative per kind of token, tried in order at each position.
const TOKEN = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|(N?'(?:[^']|'')*'?)|(\[[^\]]*\]?|"[^"]*"?)|(@@\w+)|(@\w+|#{1,2}\w+|[A-Za-z_][\w$]*)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([=<>!+\-*/%,.;()~&|^]+)|(\s+|.)/g;

function wordKind(word, rest) {
  const w = word.toUpperCase();
  // LEFT( and RIGHT( are functions; LEFT JOIN and RIGHT JOIN are operators
  if ((w === "LEFT" || w === "RIGHT") && /^\s*\(/.test(rest)) return "function";
  if (OPERATORS.has(w)) return "operator";
  if (KEYWORDS.has(w) && !FUNCTIONS.has(w)) return "keyword";
  if (FUNCTIONS.has(w)) return /^\s*\(/.test(rest) || !KEYWORDS.has(w) ? "function" : "keyword";
  return null;
}

/**
 * Splits SQL into coloured pieces: [{ kind, text }], kind one of keyword, function, string, comment, operator or
 * null (plain text). Joining every text gives back the input exactly.
 */
export function highlightSql(sql) {
  const out = [];
  const push = (kind, text) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  for (const m of String(sql ?? "").matchAll(TOKEN)) {
    const [text, comment, string, quoted, sysvar, word, , op] = m;
    if (comment) push("comment", text);
    else if (string) push("string", text);
    else if (quoted) push(null, text);
    else if (sysvar) push("function", text);
    else if (word) push(word[0] === "@" || word[0] === "#" ? null : wordKind(word, sql.slice(m.index + text.length)), text);
    else if (op) push("operator", text);
    else push(null, text);
  }
  return out;
}
