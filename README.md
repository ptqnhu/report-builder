# Report builder

Connects to a SQL Server database, turns a query into a formatted report, and exports it as an `.rdl` file for SQL Server Reporting Services (SSRS).

The steps are: **Connect → Query → Columns → Data types → Template → Title & filters → Report & export**.

- **Connect.** Sign in with a SQL Server login or a Windows account (NTLM). The password is used once to open a connection pool on the app's server; the browser only keeps a random connection id, and the password is never stored or written into the report.
- **Query.** SQL Server describes the query with `sys.sp_describe_first_result_set`, which gives the exact column names and SQL types without running it. `SELECT *` works.
- **Preview.** The query runs for real, but streams only the first rows (200 by default) and is cancelled after that. It runs inside a transaction that is always rolled back.
- **Export.** The `.rdl` file's data source is filled in from the connection.

## Project layout

```
report-builder/
├── shared/                 Logic used by both sides (no dependencies)
│   ├── constants.js        Types, filter operators, default template and export settings
│   ├── text.js             Name helpers: tokens, prettify, idLike, fileSlug
│   ├── dates.js            Date parsing and formatting
│   ├── values.js           coerce (raw → typed value) and formatValue (typed value → display text)
│   ├── filters.js          filterActive, testFilter, applyFilters, describeFilter
│   └── columns.js          effectiveColumns (columns + template settings), alignOf, keyBy
│
├── server/                 Node + Express API
│   ├── src/
│   │   ├── index.js        Starts the server (PORT, default 4000)
│   │   ├── app.js          Express setup, routes, serves client/dist in production
│   │   ├── routes/         HTTP layer only: validate input, call a service, send JSON
│   │   │   ├── connections.js  POST / GET / DELETE /api/connections
│   │   │   ├── query.js        POST /api/analyze, POST /api/preview
│   │   │   ├── templates.js    GET / PUT / DELETE /api/templates
│   │   │   └── rdl.js          POST /api/rdl  (?download=1 returns the file)
│   │   ├── services/       Business logic, no Express code
│   │   │   ├── db/
│   │   │   │   ├── mssqlDriver.js       The only file that uses the mssql package
│   │   │   │   ├── connectionConfig.js  Validates the connect form → mssql config
│   │   │   │   ├── connectionManager.js One pool per session, idle timeout, cleanup
│   │   │   │   ├── describe.js          Columns and SQL types via sp_describe_first_result_set
│   │   │   │   ├── preview.js           First N rows, streamed, cancelled, rolled back
│   │   │   │   ├── serialize.js         Driver values → JSON
│   │   │   │   └── errors.js            Readable SQL Server error messages
│   │   │   ├── queryGuard.js   Allows only single SELECT / WITH statements
│   │   │   ├── analyze.js      Guard + describe → columns
│   │   │   ├── typeInference.js SQL Server type (+ column name) → display type
│   │   │   ├── sqlParser.js    Finds the main table for the default title
│   │   │   └── templateStore.js Saved templates (JSON file)
│   │   ├── rdl/            SSRS export
│   │   │   ├── buildRdl.js     Assembles the report definition
│   │   │   ├── filters.js      App filters → RDL filters / report parameters
│   │   │   ├── textbox.js      RDL <Textbox> builder
│   │   │   ├── styles.js       Themes, .NET formats, column widths
│   │   │   └── xml.js          Escaping, names, units
│   │   └── lib/            Settings (config.js), errors and input validation
│   ├── test/               node:test unit tests (a fake SQL Server is in test/helpers)
│   └── data/               templates.json is written here
│
└── client/                 React + Vite UI
    └── src/
        ├── App.jsx         Step navigation and report state
        ├── api.js          All calls to the server
        ├── steps/          One component per step
        ├── components/     Reusable UI (report table, export panel, …)
        ├── hooks/          usePreviewRows, useTemplates, useRdlExport
        └── utils/          Sorting, totals, downloads
```

**Where to change things**

| To change… | Edit |
|---|---|
| How SQL Server types map to display types | `server/src/services/typeInference.js` |
| Which queries are allowed | `server/src/services/queryGuard.js` |
| Connection options (timeouts, pool size, encryption) | `server/src/services/db/connectionConfig.js` |
| What the .rdl file contains | `server/src/rdl/` |
| Number or date formatting (preview) | `shared/values.js` (and `server/src/rdl/styles.js` for SSRS) |
| Filter behaviour | `shared/filters.js` (preview) and `server/src/rdl/filters.js` (SSRS) |
| Screens and wording | `client/src/steps/`, `client/src/components/` |
| Look and feel | `client/src/styles.css` |

## Getting started

Requires Node.js 18.18 or later.

```bash
npm install        # installs all three packages (npm workspaces)
npm run dev        # API on http://localhost:4000, UI on http://localhost:5173
```

Open http://localhost:5173. Vite forwards `/api` requests to the server.

## Production

```bash
npm run build      # builds the client into client/dist
npm start          # serves the API and the built client on one port
```

Environment variables (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | Server port |
| `ALLOWED_SERVERS` | any | Comma-separated SQL Server host names users may connect to. **Set this in production.** |
| `CONNECTION_IDLE_MINUTES` | `30` | Close database connections unused for this long |
| `MAX_CONNECTIONS` | `50` | Most open connections at once |
| `PREVIEW_ROW_LIMIT` | `200` | Rows shown in the preview (the SSRS report returns every row) |
| `QUERY_TIMEOUT_SECONDS` | `60` | Longest a preview query may run |
| `CLIENT_ORIGIN` | any | Allowed CORS origin if the UI is hosted elsewhere |
| `TEMPLATES_FILE` | `server/data/templates.json` | Where saved templates are stored |
| `BODY_LIMIT` | `2mb` | Largest request body |

## Tests

```bash
npm test
```

Covers connection settings and lifetime, the read-only query guard, SQL Server type mapping, describing queries, the streamed preview (row limit, cancel, timeout, rollback) and RDL generation. Database tests use a fake SQL Server, so no database is needed to run them.

## API

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/connections` | `{ server, database, authType: "sql"\|"windows", user, password, encrypt?, trustServerCertificate? }` | `{ connectionId, server, database, user, version }` |
| GET | `/api/connections/:id` | | connection details |
| DELETE | `/api/connections/:id` | | `204` |
| POST | `/api/analyze` | `{ connectionId, sql }` | `{ columns, table }` |
| POST | `/api/preview` | `{ connectionId, sql }` | `{ rows, truncated, limit }` |
| GET | `/api/templates` | | `{ templates }` |
| PUT | `/api/templates/:name` | template | `{ templates }` |
| DELETE | `/api/templates/:name` | | `{ templates }` |
| POST | `/api/rdl` | `{ sql, columns, tpl, title, desc, filters, sort, exp }` | `{ rdl, fileName, warnings, problem }` |
| POST | `/api/rdl?download=1` | same | the `.rdl` file |

An expired or unknown `connectionId` returns **410**; the UI then asks the user to connect again.

## Security

- **Use a read-only login.** Give report authors a SQL login or Windows group with only `db_datareader` (or `SELECT` on specific views). This is the real protection.
- The app adds two more guards: it refuses anything other than a single `SELECT`/`WITH` statement, and every preview runs in a transaction that is rolled back.
- **Set `ALLOWED_SERVERS`** so the app can only connect to your SQL Servers.
- **Serve the app over HTTPS**, since passwords are sent from the browser to the app's server when connecting.
- Passwords live only in the server's memory, inside the connection pool, and are dropped when the connection closes or goes idle. They're never logged, returned to the browser, or written into `.rdl` files.
- The app has no user accounts of its own. Run it on your internal network, or put it behind your existing single sign-on.

## Uploading to SSRS

In the SSRS web portal, open a folder and choose **Upload**, then pick the `.rdl` file.

- **Readers use their Windows login:** nothing else to do, as long as readers can read the database.
- **Stored SQL login:** open the report's **Manage** page, choose **Data sources**, select "Using the following credentials", and enter the login. The `.rdl` never contains a password.
- **Shared data source:** if it doesn't link automatically, choose it on the same **Data sources** page.
