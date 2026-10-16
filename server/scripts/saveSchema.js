// Saves a database's schema to server/schemas/<database>.txt, which the AI assistant then reads instead of querying.
// Signs in as the Windows account running it, so it only works for a SQL Server on this computer.
//   npm run schema:save -w server -- AdventureWorks2022
//   npm run schema:save -w server -- AdventureWorks2022 "localhost\SQLEXPRESS"
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import "../src/lib/loadEnv.js";
import { buildConfig } from "../src/services/db/connectionConfig.js";
import { connectMssql } from "../src/services/db/mssqlDriver.js";
import { querySchema, SCHEMA_DIR } from "../src/services/ai/schema.js";

const [database, server = "localhost"] = process.argv.slice(2);
if (!database) {
  console.error("Usage: npm run schema:save -w server -- <database> [server]");
  process.exit(1);
}

const { config } = buildConfig({ server, database, authType: "local", trustServerCertificate: true }, { fromThisComputer: true });
const pool = await connectMssql(config);
try {
  const { text, tables } = await querySchema(pool);
  await mkdir(SCHEMA_DIR, { recursive: true });
  const file = join(SCHEMA_DIR, `${database}.txt`);
  await writeFile(file, text + "\n", "utf8");
  console.log(`Saved ${tables} tables and views to ${file}`);
} finally {
  await pool.close();
}
