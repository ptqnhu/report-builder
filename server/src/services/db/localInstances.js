import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const INSTANCES_KEY = "HKLM\\SOFTWARE\\Microsoft\\Microsoft SQL Server\\Instance Names\\SQL";

/** Instance names from `reg query` output, e.g. "    SQLEXPRESS    REG_SZ    MSSQL16.SQLEXPRESS". */
export function parseInstanceNames(regOutput) {
  return [...String(regOutput).matchAll(/^\s+(\S+)\s+REG_SZ\s+/gm)].map((m) => m[1]);
}

/** The default instance is reached as "localhost"; named ones as "localhost\NAME". */
export const serverNameFor = (instance) => (instance.toUpperCase() === "MSSQLSERVER" ? "localhost" : `localhost\\${instance}`);
const serviceNameFor = (instance) => (instance.toUpperCase() === "MSSQLSERVER" ? "MSSQLSERVER" : `MSSQL$${instance}`);

async function isRunning(instance) {
  try {
    const { stdout } = await run("sc", ["query", serviceNameFor(instance)], { windowsHide: true });
    return /STATE\s*:\s*\d+\s+RUNNING/.test(stdout);
  } catch { return false; }
}

/**
 * SQL Server instances installed on the computer this app's server runs on.
 * Returns [{ server, running }], or [] when not on Windows or nothing is installed.
 */
export async function listLocalInstances() {
  if (process.platform !== "win32") return [];
  let stdout;
  try { ({ stdout } = await run("reg", ["query", INSTANCES_KEY], { windowsHide: true })); }
  catch { return []; } // key missing: SQL Server isn't installed
  const names = parseInstanceNames(stdout);
  const running = await Promise.all(names.map(isRunning));
  return names
    .map((name, i) => ({ server: serverNameFor(name), running: running[i] }))
    .sort((a, b) => b.running - a.running || (a.server === "localhost" ? -1 : b.server === "localhost" ? 1 : a.server.localeCompare(b.server)));
}
