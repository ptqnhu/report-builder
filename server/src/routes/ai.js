import { Router } from "express";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireString, optionalString } from "../lib/validate.js";
import { settings } from "../lib/config.js";
import { loadSchema } from "../services/ai/schema.js";
import { writeQuery } from "../services/ai/queryWriter.js";
import { noActivityLog } from "../services/activityLog.js";

/**
 * Added to the user's latest message when the answer will be charted (the "See data in charts" flow), so the query
 * returns a few summarised rows rather than every detail row. Kept out of the system prompt, which is cached.
 */
const CHART_NOTE = `The result will be shown as charts, not a table. Return a summarised result that charts well:
- One label column (a category, or a date or month for trends over time) and one to three numeric measures, with GROUP BY.
- At most about 50 rows. Use TOP with ORDER BY on the main measure (descending) for rankings, or ORDER BY the date for trends.
- For trends, group dates by month or day as a date column (e.g. DATEFROMPARTS(YEAR(d), MONTH(d), 1) AS [Month]).`;

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

export default function aiRoutes(connections, activityLog = noActivityLog) {
  const router = Router();

  /**
   * POST /api/ai/query { connectionId, messages: [{role: "user", content} | {role: "assistant", sql, explanation}], sql?, purpose? }
   * -> { sql, explanation }. `sql` is what's in the editor now, so "add a filter for…" works on it.
   * `purpose: "charts"` asks for a summarised query that charts well.
   */
  router.post("/ai/query", asyncHandler(async (req, res) => {
    const connectionId = requireString(req.body?.connectionId, "connectionId", { max: 64, allowEmpty: false });
    const { pool, info } = connections.get(connectionId);
    const messages = readMessages(req.body?.messages);
    if (messages.at(-1).role !== "user") throw new HttpError(400, "The conversation is out of order.");
    const request = messages.at(-1).content;
    const current = optionalString(req.body?.sql, "sql", 200_000).trim();
    if (current) messages.at(-1).content += `\n\nThe query in the editor right now:\n\`\`\`sql\n${current}\n\`\`\``;
    if (req.body?.purpose === "charts") messages.at(-1).content += `\n\n${CHART_NOTE}`;

    const started = Date.now();
    const entry = {
      ConnectionId: connectionId, ServerName: info.server, DatabaseName: info.database, LoginName: info.user, ClientIp: req.ip,
      Turn: Math.ceil(messages.length / 2), Request: request, EditorSql: current || null,
      Backend: settings.aiBackend, Model: settings.aiModel, Effort: settings.aiEffort,
    };
    try {
      const schema = await loadSchema(pool, { maxChars: settings.aiSchemaMaxChars, database: info.database });
      Object.assign(entry, { SchemaSource: schema.source, SchemaChars: schema.text.length });
      const answer = await writeQuery({ schema: schema.text, database: info.database, messages },
        { backend: settings.aiBackend, model: settings.aiModel, effort: settings.aiEffort, timeoutMs: settings.aiTimeoutMs });
      activityLog.aiRequest({ ...entry, ResultSql: answer.sql, Explanation: answer.explanation, DurationMs: Date.now() - started, Succeeded: true });
      res.json(answer);
    } catch (e) {
      activityLog.aiRequest({ ...entry, DurationMs: Date.now() - started, Succeeded: false, ErrorStatus: e.status || 500, ErrorMessage: String(e.message).slice(0, 4000) });
      throw e;
    }
  }));

  return router;
}
