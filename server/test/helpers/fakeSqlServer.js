import { EventEmitter } from "node:events";

/** A streaming request that behaves like mssql's: recordset, row..., (error on cancel), done. */
class FakeStreamRequest extends EventEmitter {
  constructor(script) { super(); this.script = script; this.cancelled = false; }
  cancel() { this.cancelled = true; }
  query() {
    setImmediate(() => {
      const { columns = [], rows = [], error, hang } = this.script;
      if (hang) {
        // Never finishes on its own; finishes only when cancelled.
        const t = setInterval(() => { if (this.cancelled) { clearInterval(t); this.emit("error", Object.assign(new Error("Canceled."), { code: "ECANCEL" })); this.emit("done", {}); } }, 5);
        return;
      }
      if (error) { this.emit("error", error); this.emit("done", {}); return; }
      this.emit("recordset", columns.map((name, index) => ({ name, index })));
      for (const r of rows) {
        if (this.cancelled) break;
        this.emit("row", r);
      }
      if (this.cancelled) this.emit("error", Object.assign(new Error("Canceled."), { code: "ECANCEL" }));
      this.emit("done", {});
    });
  }
}

/**
 * A fake connection pool.
 * describe: rows for sp_describe_first_result_set (or an Error to throw)
 * stream:   script for preview queries
 */
export function fakePool({ describe = [], stream = {}, version = "16.0.1000.6" } = {}) {
  const log = { inputs: [], queries: [], begun: 0, rolledBack: 0, closed: false };
  const pool = {
    log,
    request() {
      const req = {
        input(name, value) { log.inputs.push([name, value]); return req; },
        async query(q) {
          log.queries.push(q);
          if (/SERVERPROPERTY/.test(q)) return { recordset: [{ version }] };
          if (describe instanceof Error) throw describe;
          return { recordset: describe };
        },
      };
      return req;
    },
    transaction() {
      return {
        async begin() { log.begun++; },
        request() { return new FakeStreamRequest(stream); },
        async rollback() { log.rolledBack++; },
      };
    },
    async close() { log.closed = true; },
  };
  return pool;
}

export const describeRow = (ordinal, name, type, extra = {}) =>
  ({ is_hidden: false, column_ordinal: ordinal, name, system_type_name: type, is_nullable: true, ...extra });
