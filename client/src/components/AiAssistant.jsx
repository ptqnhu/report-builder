import { useState } from "react";
import { api } from "../api.js";

/**
 * Describe the report in plain English and the AI writes the query into the editor.
 * Follow-up messages ("only last month", "add the customer's email") refine the query in the editor.
 */
export default function AiAssistant({ connection, sql, setSql, chat, setChat, onExpired }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const content = text.trim();
    if (!content || busy) return;
    const messages = [...chat, { role: "user", content }];
    setChat(messages);
    setText("");
    setError("");
    setBusy(true);
    try {
      const answer = await api.aiQuery(connection.connectionId, messages, sql);
      setChat([...messages, { role: "assistant", ...answer }]);
      if (answer.sql) setSql(answer.sql);
    } catch (e) {
      if (e.status === 410) return onExpired(e);
      setChat(chat); // drop the unanswered message so the conversation stays in order
      setText(content);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel ai">
      <div className="ai-head">
        <label className="fld-label" htmlFor="ai-ask">Ask AI to write the query</label>
        {chat.length > 0 && <button className="btn btn-quiet btn-sm" onClick={() => { setChat([]); setError(""); }} disabled={busy}>New conversation</button>}
      </div>

      {chat.length > 0 && (
        <div className="ai-chat">
          {chat.map((m, i) => m.role === "user" ? (
            <div key={i} className="ai-msg ai-user">{m.content}</div>
          ) : (
            <div key={i} className="ai-msg ai-answer">
              {m.explanation && <p>{m.explanation}</p>}
              {m.sql && (
                <>
                  <pre className="ai-sql">{m.sql}</pre>
                  {m.sql !== sql
                    ? <button className="btn btn-quiet btn-sm" onClick={() => setSql(m.sql)}>Use this query</button>
                    : <span className="muted">In the editor below.</span>}
                </>
              )}
            </div>
          ))}
          {busy && <div className="ai-msg ai-answer muted">Writing the query…</div>}
        </div>
      )}

      <textarea id="ai-ask" className="ta" rows={3} value={text} onChange={(e) => setText(e.target.value)} disabled={busy}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
        placeholder={chat.length ? "Ask for a change, e.g. “only active loans” or “add the customer's phone number”"
          : "Describe the report, e.g. “Loans funded last month with the customer name, amount and branch”"} />
      <div className="panel-foot">
        <span className="muted">Only table and column names are sent to the AI, never your data. Check the query before you use it.</span>
        <button className="btn btn-primary btn-sm" onClick={send} disabled={busy || !text.trim()}>{busy ? "Writing…" : "Send"}</button>
      </div>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
