import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireString, optionalString } from "../lib/validate.js";
import { settings } from "../lib/config.js";
import { loadSchema } from "../services/ai/schema.js";
import { writeQuery } from "../services/ai/queryWriter.js";

/** Checks the conversation: alternating turns, starting and ending with the user. */
function readMessages(list) {
  if (!Array.isArray(list) || !list.length) throw new HttpError(400, "Describe the report you need.");
  if (list.length > 40) throw new HttpError(413, "The conversation is too long. Start a new one.");
  return list.map((m, i) => {
    const role = i % 2 === 0 ? "user" : "assistant";
    if (m?.role !== role) throw new HttpError(400, "The conversation is out of order.");
    if (role === "user") return { role, content: requireString(m.content, "message", { max: 20_000, allowEmpty: false }) };
    // Earlier answers go back in the same JSON shape the assistant replies in.
    return { role, content: JSON.stringify({ sql: optionalString(m.sql, "sql", 200_000), explanation: optionalString(m.explanation, "explanation", 20_000) }) };
  });
}

export default function aiRoutes(connections) {
  const router = Router();

  /**
   * POST /api/ai/query { connectionId, messages: [{role: "user", content} | {role: "assistant", sql, explanation}], sql? }
   * -> { sql, explanation }. `sql` is what's in the editor now, so "add a filter for…" works on it.
   */
  router.post("/ai/query", asyncHandler(async (req, res) => {
    const { pool, info } = connections.get(requireString(req.body?.connectionId, "connectionId", { max: 64, allowEmpty: false }));
    const messages = readMessages(req.body?.messages);
    if (messages.at(-1).role !== "user") throw new HttpError(400, "The conversation is out of order.");
    const current = optionalString(req.body?.sql, "sql", 200_000).trim();
    if (current) messages.at(-1).content += `\n\nThe query in the editor right now:\n\`\`\`sql\n${current}\n\`\`\``;

    const schema = await loadSchema(pool, { maxChars: settings.aiSchemaMaxChars });
    res.json(await writeQuery({ schema, database: info.database, messages }, { backend: settings.aiBackend, model: settings.aiModel, effort: settings.aiEffort, timeoutMs: settings.aiTimeoutMs }));
  }));

  return router;
}
