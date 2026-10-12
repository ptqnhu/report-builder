import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "../../lib/errors.js";

const INSTRUCTIONS = `You write T-SQL queries for a report builder that runs on Microsoft SQL Server.
The user describes the report they need in plain English; you reply with one query that returns exactly those rows and columns.

Rules for the query:
- A single SELECT statement (a WITH ... SELECT is fine). Never modify data, create objects, use temp tables, or run more than one statement. The app rejects anything else.
- Use only the tables, views and columns listed in the schema below, with schema-qualified names (dbo.Orders).
- Give every column a clear, readable alias, because the aliases become the report's column headings.
- Don't add ORDER BY unless the user asks for an order; the report sorts itself.
- Prefer sargable date filters (OrderDate >= '2026-01-01' AND OrderDate < '2026-02-01').

If the user's request is ambiguous in a way that changes the result (for example, which date column defines "this month"), make the most reasonable choice and say what you assumed.
If it can't be answered from this schema, leave sql empty and explain what's missing or ask the question you need answered.

In explanation, say in two or three plain sentences what the query returns and any assumptions. Don't repeat the SQL there.
When the user asks for a change, return the whole updated query, not just the changed part.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    sql: { type: "string", description: "The complete T-SQL query, or empty if it can't be written yet." },
    explanation: { type: "string", description: "What the query returns and any assumptions, or the question to ask." },
  },
  required: ["sql", "explanation"],
  additionalProperties: false,
};

let defaultClient;
const getClient = () => (defaultClient ??= new Anthropic());

/** Turns SDK errors into messages the person using the app can act on. */
function friendlyError(e) {
  if (e instanceof HttpError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return new HttpError(503, "The AI assistant's API key was rejected. Check ANTHROPIC_API_KEY on the app's server.");
  }
  if (e instanceof Anthropic.RateLimitError) return new HttpError(429, "The AI assistant is busy. Try again in a minute.");
  if (e instanceof Anthropic.BadRequestError) return new HttpError(422, `The AI assistant couldn't take that request: ${e.message}`);
  if (e instanceof Anthropic.APIError) return new HttpError(502, "The AI assistant isn't responding right now. Try again shortly.");
  // Anything else failed before reaching the API: local setup, most often no API key at all.
  console.error("AI assistant:", e.message);
  return new HttpError(503, "The AI assistant isn't set up. Set ANTHROPIC_API_KEY on the app's server and restart it.");
}

/**
 * Asks Claude for a query.
 * @param {{schema: string, database: string, messages: {role: "user"|"assistant", content: string}[]}} input
 * @returns {Promise<{sql: string, explanation: string}>}
 */
export async function writeQuery({ schema, database, messages }, { model, effort, client } = {}) {
  let response;
  try {
    response = await (client ?? getClient()).beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort, format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      system: [
        { type: "text", text: INSTRUCTIONS },
        // The schema is the large, unchanging part, so it's cached between questions about the same database.
        { type: "text", text: `Database: ${database}\n\nSchema:\n${schema}`, cache_control: { type: "ephemeral" } },
      ],
      messages,
    });
  } catch (e) {
    throw friendlyError(e);
  }

  if (response.stop_reason === "refusal") throw new HttpError(422, "The AI assistant declined this request. Try rewording it.");
  if (response.stop_reason === "max_tokens") throw new HttpError(502, "The AI assistant's answer was cut off. Try a narrower request.");
  const text = response.content.find((b) => b.type === "text")?.text;
  try {
    const out = JSON.parse(text);
    return { sql: String(out.sql || "").trim(), explanation: String(out.explanation || "").trim() };
  } catch {
    throw new HttpError(502, "The AI assistant sent an answer the app couldn't read. Try again.");
  }
}
