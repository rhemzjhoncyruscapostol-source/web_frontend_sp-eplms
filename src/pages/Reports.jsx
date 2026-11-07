import { useState } from 'react';
import { api } from '../api.js';
import { money, MONTHS, num } from '../format.js';
import { ErrorBox, Loading, PageHeader, useLoad } from '../components/ui.jsx';

export default function Reports() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { data, error, loading, reload } = useLoad(() => api.get(`/analytics/accounting?year=${year}`), [year]);

  return (
    <>
      <PageHeader
        title="Reports"
        sub="Printable yearly summary. Use Print, then choose Save as PDF if you need a file."
        actions={
          <>
            <label className="inline-label no-print">Year
              <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <button className="btn primary no-print" onClick={() => window.print()}>Print</button>
          </>
        }
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <article className="report">
          <h2>Budget and expenses, {data.year}</h2>
          <table className="table">
            <thead><tr><th>Office</th><th className="num">Budget</th><th className="num">Actual</th><th className="num">Variance</th><th>Status</th></tr></thead>
            <tbody>
              {data.by_office.map((o) => {
                const v = o.budget - o.actual;
                return (
                  <tr key={o.office}>
                    <td>{o.office}</td>
                    <td className="num">{money(o.budget)}</td>
                    <td className="num">{money(o.actual)}</td>
                    <td className="num">{money(v)}</td>
                    <td>{o.budget === 0 ? 'No budget set' : v < 0 ? 'Over budget' : 'Within budget'}</td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td>Total</td>
                <td className="num">{money(data.kpis.total_budget)}</td>
                <td className="num">{money(data.kpis.total_expenses)}</td>
                <td className="num">{money(data.kpis.variance)}</td>
                <td>{data.kpis.used_percent === null ? '' : `${data.kpis.used_percent}% used`}</td>
              </tr>
            </tbody>
          </table>

          <h2>Spending by category</h2>
          <table className="table">
            <thead><tr><th>Category</th><th className="num">Total</th></tr></thead>
            <tbody>{data.by_category.map((c) => <tr key={c.category}><td>{c.category}</td><td className="num">{money(c.total)}</td></tr>)}</tbody>
          </table>

          <h2>Month by month</h2>
          <table className="table">
            <thead><tr><th>Month</th><th className="num">Expenses</th><th className="num">Approved leave days</th></tr></thead>
            <tbody>
              {MONTHS.map((m, i) => (
                <tr key={m}><td>{m}</td><td className="num">{money(data.by_month[i])}</td><td className="num">{num(data.leave_days_by_month[i])}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted small-print">{data.kpis.flagged} expense(s) were flagged for review this year.</p>
        </article>
      )}
    </>
  );
}
