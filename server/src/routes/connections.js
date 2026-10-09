import { Router } from "express";
import { asyncHandler } from "../lib/errors.js";
import { buildConfig } from "../services/db/connectionConfig.js";
import { listLocalInstances } from "../services/db/localInstances.js";
import { settings } from "../lib/config.js";

/** True when the browser runs on the same computer as this app (so "sign in as this computer" is the user's own account). */
const fromThisComputer = (req) => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);

/** Connection routes. The password is used once to open the pool and never sent back. */
export default function connectionRoutes(connections) {
  const router = Router();

  /** GET /api/local-servers -> [{ server, running }] SQL Server instances on this computer, for local browsers only */
  router.get("/local-servers", asyncHandler(async (req, res) => {
    // Skip the lookup when ALLOWED_SERVERS would block localhost anyway.
    const allowed = !settings.allowedServers.length || settings.allowedServers.includes("localhost");
    res.json(allowed && fromThisComputer(req) ? await listLocalInstances() : []);
  }));

  /** POST /api/databases { server, authType, user, password, ... } -> ["Sales", ...] databases the login can open */
  router.post("/databases", asyncHandler(async (req, res) => {
    const { config } = buildConfig({ ...req.body, database: "master" }, { fromThisComputer: fromThisComputer(req) });
    res.json(await connections.listDatabases(config));
  }));

  /** POST /api/connections { server, database, authType, user, password, encrypt, trustServerCertificate } */
  router.post("/connections", asyncHandler(async (req, res) => {
    const { config, summary } = buildConfig(req.body, { fromThisComputer: fromThisComputer(req) });
    const { id, info } = await connections.open(config, summary);
    res.status(201).json({ connectionId: id, ...info });
  }));

  /** GET /api/connections/:id -> connection details (no secrets) */
  router.get("/connections/:id", asyncHandler(async (req, res) => {
    const s = connections.get(req.params.id);
    res.json({ connectionId: req.params.id, ...s.info });
  }));

  /** DELETE /api/connections/:id */
  router.delete("/connections/:id", asyncHandler(async (req, res) => {
    await connections.close(req.params.id);
    res.status(204).end();
  }));

  return router;
}
