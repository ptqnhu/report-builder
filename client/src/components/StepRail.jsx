import { STEPS } from "../steps/steps.js";
import Logo from "./Logo.jsx";

/**
 * Sticky top bar (logo and connected database), with the progress bar of the steps in its own row below.
 * The progress bar scrolls away with the page, so long reports get the full height.
 */
export default function StepRail({ flow, step, reached, onGo, sql, connection }) {
  return (
    <>
      <header className="rb-rail">
        <p className="rb-brand"><a href="#" title="Back to the home page"><Logo size={24} />Report builder</a></p>
        {connection && (
          <p className="rail-conn" title={`${connection.database} on ${connection.server}`}>
            <span className="conn-dot" aria-hidden="true" />
            <strong>{connection.database}</strong>
            <span>{connection.server}</span>
          </p>
        )}
      </header>

      <nav className="rb-steps" aria-label="Progress">
        <ol className="steps">
          {flow.map((id, i) => (
            <li key={id} className={i <= reached ? "reached" : ""}>
              <button
                className={`step-btn ${id === step ? "current" : i <= reached ? "done" : ""}`}
                disabled={i > reached}
                onClick={() => onGo(id)}
                aria-current={id === step ? "step" : undefined}
                title={id === "query" && sql.trim() ? sql.trim() : STEPS[id].title}
              >
                <span className="step-dot">{i < reached && id !== step ? "✓" : i + 1}</span>
                <span className="step-label">{STEPS[id].title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
