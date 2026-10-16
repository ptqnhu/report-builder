import "./lib/loadEnv.js"; // first, so settings see the .env values
import { createApp } from "./app.js";
import { settings } from "./lib/config.js";
import { createConnectionManager } from "./services/db/connectionManager.js";
import { connectMssql } from "./services/db/mssqlDriver.js";
import { createActivityLog, logConfig, noActivityLog } from "./services/activityLog.js";

const connections = createConnectionManager({ connect: connectMssql, idleMs: settings.idleMs, max: settings.maxConnections });
connections.startSweeping();

// LOG_DATABASE turns on the sign-in and AI request log; a bad setting is reported once and logging stays off.
let activityLog = noActivityLog;
if (process.env.LOG_DATABASE) {
  try { activityLog = createActivityLog({ connect: connectMssql, config: logConfig() }); }
  catch (e) { console.error("Activity log is off:", e.message); }
}

const server = createApp({ connections, activityLog }).listen(settings.port, () => {
  console.log(`Report builder API listening on http://localhost:${settings.port}`);
});

async function shutdown() {
  server.close();
  await connections.closeAll();
  await activityLog.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
