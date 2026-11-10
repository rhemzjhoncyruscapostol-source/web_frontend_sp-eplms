import { useState } from 'react';
import { api } from '../api.js';
import { money, num } from '../format.js';
import { BarList, BudgetBars, ChartPanel, Columns } from '../components/charts.jsx';
import { ErrorBox, Loading, StatStrip, useLoad } from '../components/ui.jsx';

// 
export default function AnalyticsDashboard() {
  const thisYear = new Date().getFullYear();
  const [office, setOffice] = useState('');
  const [year, setYear] = useState(thisYear);
  const offices = useLoad(() => api.get('/directory?per=1', { auth: false }));
  const { data, error, loading, reload } = useLoad(
    () => api.get(`/analytics/accounting?year=${year}${office ? `&office=${encodeURIComponent(office)}` : ''}`),
    [office, year]
  );

  return (
    <>
      <div className="toolbar">
        <label className="inline-label">
          Office
          <select className="input" value={office} onChange={(e) => setOffice(e.target.value)}>
            <option value="">All</option>
            {(offices.data ? offices.data.offices : []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="inline-label">
          Period
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y === thisYear ? `This year (${y})` : y}</option>)}
          </select>
        </label>
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && (
        <>
          <StatStrip
            items={[
              { label: 'Total budget', value: money(data.kpis.total_budget) },
              { label: 'Total expenses', value: money(data.kpis.total_expenses) },
              { label: 'Budget used', value: data.kpis.used_percent === null ? 'No budget' : `${data.kpis.used_percent}%` },
              { label: 'Flagged expenses', value: num(data.kpis.flagged), note: 'Rule-based checks' },
            ]}
          />
          <div className="grid-2 block">
            <ChartPanel title="Budget vs expense by department"><BudgetBars rows={data.by_office} /></ChartPanel>
            <ChartPanel title="Spending by category">
              <BarList rows={data.by_category.map((c) => ({ label: c.category, value: c.total }))} format={money} empty="No expenses recorded." />
            </ChartPanel>
            <ChartPanel title="Monthly expense trend"><Columns values={data.by_month} format={money} /></ChartPanel>
            <ChartPanel title="Leave and headcount summary">
              <Columns values={data.leave_days_by_month} />
              <p className="muted small-print">Approved leave days per month this year</p>
              <BarList rows={data.headcount.map((h) => ({ label: h.office, value: h.total }))} />
            </ChartPanel>
          </div>
        </>
      )}
    </>
  );
}
