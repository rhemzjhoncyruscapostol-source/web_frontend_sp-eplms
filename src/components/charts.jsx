import { MONTHS, money, num } from '../format.js';

/** Horizontal bars.  rows: [{ label, value }] */
export function BarList({ rows, format = num, empty = 'No data yet.' }) {
  if (!rows.length) return <p className="muted chart-empty">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
          <span className="bar-value">{format(r.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Budget (track) against actual spending (fill). Over budget turns red. rows: [{ office, budget, actual }] */
export function BudgetBars({ rows }) {
  if (!rows.length) return <p className="muted chart-empty">No budgets or expenses for this selection.</p>;
  const max = Math.max(...rows.map((r) => Math.max(r.budget, r.actual)), 1);
  return (
    <ul className="bars budget">
      {rows.map((r) => {
        const over = r.budget > 0 && r.actual > r.budget;
        return (
          <li key={r.office}>
            <span className="bar-label">{r.office}</span>
            <span className="bar-track" title={`Budget ${money(r.budget)}`}>
              <span className="bar-budget" style={{ width: `${(r.budget / max) * 100}%` }} />
              <span className={`bar-fill actual${over ? ' over' : ''}`} style={{ width: `${Math.max(r.actual > 0 ? 2 : 0, (r.actual / max) * 100)}%` }} />
            </span>
            <span className="bar-value">{money(r.actual)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Twelve month columns (or any labelled series). */
export function Columns({ values, labels = MONTHS, format = num, height = 150 }) {
  const max = Math.max(...values, 1);
  const w = 100 / values.length;
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return <p className="muted chart-empty">No data yet.</p>;
  return (
    <svg className="columns" viewBox={`0 0 100 ${height / 3 + 12}`} preserveAspectRatio="none" role="img" aria-label={labels.map((l, i) => `${l}: ${format(values[i])}`).join(', ')}>
      {values.map((v, i) => {
        const h = (v / max) * (height / 3);
        return (
          <g key={labels[i]}>
            <rect x={i * w + w * 0.18} y={height / 3 - h + 2} width={w * 0.64} height={Math.max(h, v > 0 ? 0.6 : 0)} rx="0.8" className="col" />
            <text x={i * w + w / 2} y={height / 3 + 9} textAnchor="middle" className="col-label">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChartPanel({ title, children }) {
  return (
    <section className="panel chart-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
