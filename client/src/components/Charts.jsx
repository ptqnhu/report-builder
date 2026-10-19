import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_TPL, formatValue } from "@report-builder/shared";
import Segmented from "./Segmented.jsx";

/**
 * Chart colours, in this fixed order, for series that must be told apart (checked for colour blindness with the
 * dataviz palette validator against the white card). Brand green first; one series always uses it.
 * The light green (4th) is under 3:1 on white, so every chart has a legend or labels and a table view.
 */
const SERIES = ["#1E7A4C", "#C08A1E", "#2272A0", "#5FB585", "#B04A30", "#7B5EA7"];
const OTHER = "#C9CCC6"; // the share bar's folded "Other" part, always grey
const colorOf = (i) => SERIES[i % SERIES.length];
const partColor = (p, i) => (p.other ? OTHER : colorOf(i));

/** A value in full, as the report would show it: $1,234.50, 12.5%. */
const full = (v, col) => (v === null || v === undefined ? "–" : formatValue(v, col, DEFAULT_TPL));

/** A value for an axis tick or a tile: $1.2M, 3.4K, 12%. */
function compact(v, col) {
  if (col.type === "Percentage") return `${+(v * 100).toFixed(1)}%`;
  const t = Math.abs(v).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: Math.abs(v) < 10 ? 2 : 1 });
  return `${v < 0 ? "-" : ""}${col.type === "Currency" ? DEFAULT_TPL.currency : ""}${t}`;
}

/** Round tick values covering lo…hi (always including 0): 0, 250, 500, 750. */
function niceTicks(lo, hi, count = 4) {
  lo = Math.min(0, lo); hi = Math.max(0, hi);
  if (hi === lo) hi = lo + 1;
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw);
  const ticks = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step * 1e-9; t += step) ticks.push(+t.toPrecision(12));
  if (ticks.at(-1) < hi) ticks.push(+(ticks.at(-1) + step).toPrecision(12));
  return ticks;
}

/** The element's width, kept up to date as the window resizes. */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Headline numbers: one tile per measure. */
export function StatTiles({ tiles }) {
  return (
    <div className="ch-tiles">
      {tiles.map((t) => (
        <div key={t.col.key} className="ch-card ch-tile" title={full(t.value, t.col)}>
          <p className="ch-tile-label">{t.label}</p>
          <p className="ch-tile-value">{compact(t.value, t.col)}</p>
          {t.note && <p className="ch-tile-note">{t.note}</p>}
        </div>
      ))}
    </div>
  );
}

/** One suggested chart: title, why it was suggested, and the chart or its numbers as a table. */
export function ChartCard({ chart }) {
  const [view, setView] = useState("chart");
  const Chart = { line: LineChart, bar: BarChart, share: ShareBar }[chart.kind];
  return (
    <figure className={`ch-card${chart.kind === "line" ? " wide" : ""}`}>
      <figcaption className="ch-head">
        <div>
          <h3>{chart.title}</h3>
          <p className="muted">{chart.why}</p>
        </div>
        <Segmented label="Show as" value={view} onChange={setView} options={[["chart", "Chart"], ["table", "Table"]]} />
      </figcaption>
      {view === "chart" ? <Chart chart={chart} /> : <ChartTable chart={chart} />}
    </figure>
  );
}

/** The chart's numbers as a table: the accessible view, and the way to read exact values. */
function ChartTable({ chart }) {
  const m = chart.measure;
  let head, body;
  if (chart.kind === "line") {
    head = [chart.x.label, ...chart.series.map((s) => s.name)];
    body = chart.x.values.map((x, i) => [x, ...chart.series.map((s) => full(s.values[i], m))]);
  } else if (chart.kind === "bar") {
    head = [chart.x.label, m.label];
    body = chart.bars.map((b) => [b.name, full(b.value, m)]);
  } else {
    head = ["", m.label, "Share"];
    body = chart.parts.map((p) => [p.name, full(p.value, m), pct(p.value / chart.total)]);
  }
  return (
    <div className="ch-table-wrap">
      <table className="ch-table">
        <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
        <tbody>{body.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const pct = (f) => `${(f * 100).toFixed(f < 0.1 ? 1 : 0)}%`;

/** Ranked horizontal bars, value at each bar's tip. Negative values grow left from the zero line. */
function BarChart({ chart }) {
  const m = chart.measure;
  const vals = chart.bars.map((b) => b.value);
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals), span = hi - lo || 1;
  const [tip, setTip] = useState(null);
  return (
    <div className="ch-bars" onMouseLeave={() => setTip(null)}>
      {chart.bars.map((b, i) => {
        const left = (Math.min(0, b.value) - lo) / span, width = Math.abs(b.value) / span;
        return (
          <div key={i} className={`ch-bar-row${tip === i ? " on" : ""}`} onMouseEnter={() => setTip(i)}>
            <span className="ch-bar-name" title={b.name}>{b.name}</span>
            <span className="ch-bar-track">
              <span className="ch-bar-gap" style={{ width: `calc((100% - 76px) * ${left})` }} />
              <span className={`ch-bar${b.value < 0 ? " neg" : ""}`} style={{ width: `calc((100% - 76px) * ${width})`, background: SERIES[0] }} />
              <span className="ch-bar-value" title={full(b.value, m)}>{compact(b.value, m)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** A single 100% bar split into parts, with the legend (name, share, value) underneath. */
function ShareBar({ chart }) {
  const m = chart.measure;
  const [tip, setTip] = useState(null);
  return (
    <div className="ch-share" onMouseLeave={() => setTip(null)}>
      <div className="ch-share-bar">
        {chart.parts.map((p, i) => (
          <span key={p.name} className={tip === null || tip === i ? "" : "dim"} onMouseEnter={() => setTip(i)}
            style={{ flexGrow: p.value, background: partColor(p, i) }} title={`${p.name}: ${full(p.value, m)} (${pct(p.value / chart.total)})`} />
        ))}
      </div>
      <ul className="ch-legend ch-share-legend">
        {chart.parts.map((p, i) => (
          <li key={p.name} className={tip === i ? "on" : ""} onMouseEnter={() => setTip(i)}>
            <span className="ch-swatch" style={{ background: partColor(p, i) }} />
            <span className="ch-legend-name" title={p.name}>{p.name}</span>
            <strong>{pct(p.value / chart.total)}</strong>
            <span className="muted">{compact(p.value, m)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const H = 260, PAD = { top: 16, right: 16, bottom: 30, left: 56 };

/** Lines over time on one axis, with a crosshair and a tooltip listing each line's value. */
function LineChart({ chart }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const m = chart.measure, n = chart.x.values.length, multi = chart.series.length > 1;

  // Everything but the hover layer depends only on the data and the width, not on where the pointer is
  const { ticks, w, iw, ih, x, y, paths, xTicks, ends } = useMemo(() => {
    const all = chart.series.flatMap((s) => s.values).filter((v) => v !== null);
    const ticks = niceTicks(Math.min(...all), Math.max(...all));
    const lo = ticks[0], hi = ticks.at(-1);
    const w = Math.max(width, 200), iw = w - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
    const x = (i) => PAD.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => PAD.top + ih - ((v - lo) / (hi - lo)) * ih;
    const paths = chart.series.map((s) => s.values.reduce((d, v, i) => (v === null ? d : `${d}${d && s.values[i - 1] !== null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`), ""));
    // As many x labels as fit (about 90px each), always the first and last
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 90))));
    const xTicks = chart.x.values.map((_, i) => i).filter((i) => i % every === 0 && (n - 1 - i >= every / 2 || i === n - 1));
    if (xTicks.at(-1) !== n - 1) xTicks.push(n - 1);
    const ends = chart.series.map((s) => s.values.findLastIndex((v) => v !== null)); // each line's last point
    return { ticks, w, iw, ih, x, y, paths, xTicks, ends };
  }, [chart, width, n]);

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left - PAD.left) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const end = chart.series[0].values[ends[0]];

  return (
    <div className="ch-line" ref={ref}>
      {multi && (
        <ul className="ch-legend">
          {chart.series.map((s, i) => (
            <li key={s.name}><span className="ch-key" style={{ background: colorOf(i) }} /><span className="ch-legend-name" title={s.name}>{s.name}</span></li>
          ))}
        </ul>
      )}
      {width > 0 && (
        <svg width={w} height={H} role="img" aria-label={chart.title} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? "ch-zero" : "ch-gridline"} x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} />
              <text className="ch-tick" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{compact(t, m)}</text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} className="ch-tick" x={x(i)} y={H - 8} textAnchor={i === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}>{chart.x.values[i]}</text>
          ))}
          {paths.map((d, i) => (
            <path key={chart.series[i].name} d={d} fill="none" stroke={colorOf(i)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hover !== null && <line className="ch-cross" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} />}
          {/* A dot on each line: at its end, or at the hovered point. Ringed in white so it stays clear where lines cross. */}
          {chart.series.map((s, i) => {
            const j = hover ?? ends[i];
            return j >= 0 && s.values[j] !== null && (
              <circle key={s.name} cx={x(j)} cy={y(s.values[j])} r={hover === null ? 4 : 4.5} fill={colorOf(i)} stroke="#fff" strokeWidth="2" />
            );
          })}
          {!multi && hover === null && ends[0] >= 0 && (
            <text className="ch-end" x={x(ends[0])} y={y(end) - 12} textAnchor="end">{compact(end, m)}</text>
          )}
        </svg>
      )}
      {hover !== null && (
        <div className="ch-tip" style={{ left: Math.min(x(hover) + 12, w - 200), top: PAD.top }}>
          <p className="ch-tip-head">{chart.x.values[hover]}</p>
          {chart.series.map((s, i) => ({ s, i })).sort((a, b) => (b.s.values[hover] ?? -Infinity) - (a.s.values[hover] ?? -Infinity)).map(({ s, i }) => (
            <p key={s.name}><span className="ch-key" style={{ background: colorOf(i) }} />{s.name}<strong>{full(s.values[hover], m)}</strong></p>
          ))}
        </div>
      )}
    </div>
  );
}
