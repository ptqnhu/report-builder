import { STEPS } from "../steps/steps.js";

export default function StepRail({ step, reached, onGo, sql, connection }) {
  return (
    <aside className="rb-rail">
      <p className="rb-brand"><a href="#" title="Back to the home page">Report builder</a></p>
      <p className="rb-brand-sub">From SQL query to SSRS report</p>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              className={`step-btn ${i === step ? "current" : i <= reached ? "done" : ""}`}
              disabled={i > reached}
              onClick={() => onGo(i)}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="step-dot">{i < reached && i !== step ? "✓" : i + 1}</span>
              <span className="step-label">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>
      {connection && (
        <div className="rail-query">
          <p>Database</p>
          <p className="rail-conn">{connection.database}<br /><span>{connection.server}</span></p>
        </div>
      )}
      {step > 1 && sql && (
        <div className="rail-query">
          <p>Query</p>
          <pre>{sql.trim()}</pre>
        </div>
      )}
    </aside>
  );
}
