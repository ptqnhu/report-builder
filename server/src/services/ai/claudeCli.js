import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const exe = process.platform === "win32" ? "claude.exe" : "claude";

/**
 * Where the Claude Code CLI is: CLAUDE_CLI_PATH, else the copy bundled with the newest
 * Claude Code extension for VS Code, else plain "claude" from the PATH.
 */
export function findClaudeCli() {
  if (process.env.CLAUDE_CLI_PATH) return process.env.CLAUDE_CLI_PATH;
  const root = path.join(homedir(), ".vscode", "extensions");
  try {
    const bundled = readdirSync(root)
      .filter((d) => d.startsWith("anthropic.claude-code-"))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((d) => path.join(root, d, "resources", "native-binary", exe))
      .find((f) => existsSync(f));
    if (bundled) return bundled;
  } catch { /* no VS Code extensions folder */ }
  return "claude";
}
