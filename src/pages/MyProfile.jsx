import { useAuth } from '../auth.jsx';
import { fmtDate, num } from '../format.js';
import { api } from '../api.js';
import EmployeeQrCode from '../components/EmployeeQrCode.jsx';
import { PageHeader, useLoad } from '../components/ui.jsx';

const Row = ({ label, value }) => (
  <div><dt>{label}</dt><dd>{value || <span className="muted">Not set</span>}</dd></div>
);

export default function MyProfile() {
  const { user } = useAuth();
  const qr = useLoad(() => api.get('/me/attendance/qr'));
  return (
    <>
      <PageHeader title="My Profile" sub="Ask HR to correct anything that is wrong." />
      <div className="grid-2">
        <section className="panel">
          <h2>Personal and employment info</h2>
          <dl className="status-list">
            <Row label="Name" value={user.full_name} />
            <Row label="Employee ID" value={user.employee_no} />
            <Row label="Position" value={user.job_title} />
            <Row label="Office" value={user.department} />
            <Row label="Date hired" value={user.date_hired ? fmtDate(user.date_hired) : ''} />
          </dl>
        </section>
        <section className="panel">
          <h2>Account</h2>
          <dl className="status-list">
            <Row label="Username" value={user.username} />
            <Row label="Email" value={user.email} />
            <Row label="Mobile" value={user.phone} />
          </dl>
          <h2 className="sub-h">Leave credits</h2>
          <dl className="status-list">
            <Row label="Vacation" value={user.vacation !== null ? num(user.vacation) : ''} />
            <Row label="Sick" value={user.sick !== null ? num(user.sick) : ''} />
            <Row label="Special Privilege" value={user.special !== null ? num(user.special) : ''} />
          </dl>
        </section>
      </div>
      <div className="block">
        <EmployeeQrCode
          payload={qr.data?.qr_payload}
          loading={qr.loading}
          error={qr.error}
          onRetry={qr.reload}
        />
      </div>
    </>
  );
}
