import { createApp } from "./app.js";
import { settings } from "./lib/config.js";
import { createConnectionManager } from "./services/db/connectionManager.js";
import { connectMssql } from "./services/db/mssqlDriver.js";

const connections = createConnectionManager({ connect: connectMssql, idleMs: settings.idleMs, max: settings.maxConnections });
connections.startSweeping();

const server = createApp({ connections }).listen(settings.port, () => {
  console.log(`Report builder API listening on http://localhost:${settings.port}`);
});

async function shutdown() {
  server.close();
  await connections.closeAll();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
