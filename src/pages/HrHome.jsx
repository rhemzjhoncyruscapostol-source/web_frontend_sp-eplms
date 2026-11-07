import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { fmtRange, num } from '../format.js';
import { leaveLabel } from '../roles.js';
import { BarList, ChartPanel, Columns } from '../components/charts.jsx';
import { useLeaveReview } from '../components/LeaveActions.jsx';
import { Empty, ErrorBox, Loading, StatStrip, useLoad } from '../components/ui.jsx';

export default function HrHome({ canReview }) {
  const stats = useLoad(() => api.get('/stats'));
  const pending = useLoad(() => api.get('/leaves?status=pending'));
  const charts = useLoad(() => api.get('/analytics/hr'));
  const review = useLeaveReview(() => {
    pending.reload();
    stats.reload();
  });

  if (stats.loading || pending.loading) return <Loading />;
  if (stats.error) return <ErrorBox error={stats.error} onRetry={stats.reload} />;
  const s = stats.data;
  const waiting = pending.data ? pending.data.leaves.slice(0, 5) : [];

  return (
    <>
      <StatStrip
        items={[
          { label: 'Total employees', value: num(s.employees.active) },
          { label: 'Pending leave / travel requests', value: num(s.leave.pending) },
          { label: 'On leave today', value: num(s.on_leave_today) },
          { label: 'Absent this month', value: num(s.absent_this_month) },
        ]}
      />

      <section className="block">
        <div className="block-head"><h2>Pending leave and travel approvals</h2><Link to="/app/leave-requests">Open all requests</Link></div>
        {waiting.length === 0 ? (
          <Empty title="All caught up">No leave requests are waiting.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Employee</th><th>Office</th><th>Type</th><th>Dates</th><th className="num">Days</th>{canReview && <th>Action</th>}</tr></thead>
              <tbody>
                {waiting.map((l) => (
                  <tr key={l.id}>
                    <td><strong>{l.full_name}</strong></td>
                    <td>{l.department || '-'}</td>
                    <td>{leaveLabel(l.leave_type)}</td>
                    <td>{fmtRange(l.start_date, l.end_date)}</td>
                    <td className="num">{l.days}</td>
                    {canReview && (
                      <td className="row-actions">
                        <button className="btn small primary" disabled={review.busy} onClick={() => review.approve(l)}>Approve</button>
                        <button className="btn small danger" disabled={review.busy} onClick={() => review.askReject(l)}>Reject</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {charts.data && (
        <div className="grid-3 block">
          <ChartPanel title="Leave trend by month (days)"><Columns values={charts.data.leave_days_by_month} /></ChartPanel>
          <ChartPanel title="Headcount per office"><BarList rows={charts.data.headcount.map((h) => ({ label: h.office, value: h.total }))} /></ChartPanel>
          <ChartPanel title="Absenteeism patterns (last 90 days)"><Columns values={charts.data.absences_by_weekday} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']} /></ChartPanel>
        </div>
      )}
      {review.modal}
    </>
  );
}
