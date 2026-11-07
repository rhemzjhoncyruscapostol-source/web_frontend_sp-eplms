import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate, fmtDateTime, fmtRange, num } from '../format.js';
import { leaveLabel } from '../roles.js';
import { Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui.jsx';

export default function EmployeeHome() {
  const { user } = useAuth();
  const leaves = useLoad(() => api.get('/me/leaves'));
  const inbox = useLoad(() => api.get('/notifications'));
  if (leaves.loading || inbox.loading) return <Loading />;
  if (leaves.error) return <ErrorBox error={leaves.error} onRetry={leaves.reload} />;

  const { credits } = leaves.data;
  const recent = leaves.data.leaves.slice(0, 3);
  const latest = inbox.data ? inbox.data.notifications.slice(0, 3) : [];

  return (
    <>
      <div className="stats credit-stats">
        <div className="stat"><p className="stat-label">Vacation Leave credits</p><p className="stat-value">{num(credits.vacation)}</p></div>
        <div className="stat"><p className="stat-label">Sick Leave credits</p><p className="stat-value">{num(credits.sick)}</p></div>
        <div className="stat"><p className="stat-label">Special Privilege Leave</p><p className="stat-value">{num(credits.special)}</p></div>
        <div className="stat cta"><Link className="btn primary block" to="/app/file-leave">File a leave request</Link></div>
      </div>

      <section className="block">
        <div className="block-head"><h2>Recent leave requests</h2><Link to="/app/my-leaves">See all</Link></div>
        {recent.length === 0 ? (
          <Empty title="No requests yet">Use "File a leave request" to send one to HR.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date filed</th><th>Type</th><th>Dates</th><th className="num">Days</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map((l) => (
                  <tr key={l.id}>
                    <td>{fmtDate(l.created_at)}</td>
                    <td>{leaveLabel(l.leave_type)}</td>
                    <td>{fmtRange(l.start_date, l.end_date)}</td>
                    <td className="num">{l.days}</td>
                    <td><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid-2 block">
        <section className="panel">
          <h2>Notifications</h2>
          {latest.length === 0 ? (
            <p className="muted">Nothing new.</p>
          ) : (
            <ul className="plain-list">
              {latest.map((n) => (
                <li key={n.id}><strong>{n.title}</strong><span className="muted"> {fmtDateTime(n.created_at)}</span></li>
              ))}
            </ul>
          )}
          <p><Link to="/app/notifications">Open notifications</Link></p>
        </section>
        <section className="panel">
          <h2>My profile summary</h2>
          <p><strong>{user.full_name || user.username}</strong></p>
          <p>{user.job_title || 'No position set'}</p>
          <p className="muted">{user.department || 'No office set'}</p>
          <p><Link to="/app/my-profile">View my profile</Link></p>
        </section>
      </div>
    </>
  );
}
