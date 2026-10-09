// Thin wrapper around the server API. Every call returns parsed JSON or throws an Error
// carrying the server's message and HTTP status (410 means the database connection expired).
async function request(path, { method = "GET", body, keepalive } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      keepalive,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error("Can't reach the app's server. Check that it's running."), { status: 0 });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status}).`), { status: res.status });
  return data;
}

export const api = {
  localServers: () => request("/local-servers"),
  listDatabases: (details) => request("/databases", { method: "POST", body: details }),
  connect: (details) => request("/connections", { method: "POST", body: details }),
  disconnect: (id, { keepalive = false } = {}) => request(`/connections/${encodeURIComponent(id)}`, { method: "DELETE", keepalive }),
  analyze: (connectionId, sql) => request("/analyze", { method: "POST", body: { connectionId, sql } }),
  preview: (connectionId, sql) => request("/preview", { method: "POST", body: { connectionId, sql } }),
  rdl: (payload) => request("/rdl", { method: "POST", body: payload }),
  listTemplates: () => request("/templates"),
  saveTemplate: (tpl) => request(`/templates/${encodeURIComponent(tpl.name)}`, { method: "PUT", body: tpl }),
  deleteTemplate: (name) => request(`/templates/${encodeURIComponent(name)}`, { method: "DELETE" }),
};
