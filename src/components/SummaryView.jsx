import { api } from '../api.js';
import { num } from '../format.js';
import { BarList, ChartPanel, Columns } from './charts.jsx';
import { ErrorBox, Loading, StatStrip, useLoad } from './ui.jsx';

/** Totals only. No employee, salary or expense records. */
export default function SummaryView() {
  const { data, error, loading, reload } = useLoad(() => api.get('/public/summary', { auth: false }));
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <>
      <StatStrip
        items={[
          { label: 'Employees', value: num(data.employees) },
          { label: 'Offices', value: num(data.offices) },
          { label: 'On leave today', value: num(data.on_leave_today) },
        ]}
      />
      <div className="grid-2">
        <ChartPanel title="Headcount per office">
          <BarList rows={data.headcount.map((h) => ({ label: h.office, value: h.total }))} />
        </ChartPanel>
        <ChartPanel title={`Approved leave days by month, ${data.year}`}>
          <Columns values={data.leave_days_by_month} />
        </ChartPanel>
      </div>
    </>
  );
}
