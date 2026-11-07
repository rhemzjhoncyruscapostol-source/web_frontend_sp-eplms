import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { fmtDateTime, num } from '../format.js';
import { ROLE_LABEL } from '../roles.js';
import { BarList, ChartPanel } from '../components/charts.jsx';
import { Badge, ErrorBox, Loading, StatStrip, useLoad } from '../components/ui.jsx';

const Status = ({ ok, children }) => <Badge tone={ok ? 'ok' : 'warn'}>{children}</Badge>;

export default function MisHome() {
  const stats = useLoad(() => api.get('/stats'));
  const settings = useLoad(() => api.get('/settings'));
  if (stats.loading || settings.loading) return <Loading />;
  if (stats.error) return <ErrorBox error={stats.error} onRetry={stats.reload} />;
  const s = stats.data;
  const cfg = settings.data;

  return (
    <>
      <StatStrip
        items={[
          { label: 'Total user accounts', value: num(s.accounts.total) },
          { label: 'Active users', value: num(s.accounts.active) },
          { label: 'Pending / locked accounts', value: num(s.accounts.locked), note: 'Deactivated by MIS' },
          { label: 'Failed logins (24h)', value: num(s.failed_logins_24h) },
        ]}
      />
      <div className="grid-2 block">
        <ChartPanel title="User accounts per role">
          <BarList rows={Object.entries(s.users_by_role).map(([r, c]) => ({ label: ROLE_LABEL[r] || r, value: c }))} />
        </ChartPanel>
        <section className="panel">
          <h2>System status</h2>
          {cfg ? (
            <dl className="status-list">
              <div><dt>Sign-in codes (OTP)</dt><dd><Status ok={cfg.otp.enabled}>{cfg.otp.enabled ? 'On' : 'Off'}</Status></dd></div>
              <div><dt>Email provider</dt><dd><Status ok={cfg.notifications.email_enabled}>{cfg.notifications.email_enabled ? 'Sending' : 'Log file only'}</Status></dd></div>
              <div><dt>SMS provider</dt><dd><Status ok={cfg.notifications.sms_enabled}>{cfg.notifications.sms_enabled ? 'Connected' : 'Not connected'}</Status></dd></div>
              <div><dt>Expense ledger (hash chain)</dt><dd><Status ok={cfg.ledger.ok}>{cfg.ledger.ok ? `Verified, ${cfg.ledger.entries} entries` : `Broken at entry #${cfg.ledger.broken_at}`}</Status></dd></div>
              <div><dt>Last backup</dt><dd><Badge>Not configured</Badge></dd></div>
            </dl>
          ) : (
            <p className="muted">Status unavailable.</p>
          )}
        </section>
      </div>

      <section className="block">
        <div className="block-head"><h2>Recent audit log</h2><Link to="/app/audit">Open audit log</Link></div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th></tr></thead>
            <tbody>
              {s.recent_audit.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDateTime(a.created_at)}</td>
                  <td>{a.username || '-'}</td>
                  <td>{ROLE_LABEL[a.role] || '-'}</td>
                  <td>{a.detail || a.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
