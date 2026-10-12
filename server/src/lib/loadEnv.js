import { fileURLToPath } from "node:url";

// Settings such as ANTHROPIC_API_KEY can live in a .env file at the project root (Node 20.12+).
// Variables already set in the environment win.
try { process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url))); } catch { /* no .env file */ }
