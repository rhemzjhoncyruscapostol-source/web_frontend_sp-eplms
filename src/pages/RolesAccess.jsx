import { PageHeader } from '../components/ui.jsx';

// Plain-language map of what each role can do. It documents the rules enforced by the API; it does not change them.
const ROWS = [
  ['Public home, directory and org chart', 'Everyone (no login)', '', '', '', '', ''],
  ['Own profile, salary, leave credits, file leave', '', 'Yes', '', '', '', ''],
  ['Leave approvals (approve / reject)', '', '', 'Yes', '', 'Yes', 'View'],
  ['Attendance', '', '', 'Yes', '', 'Yes', 'View', 'Scan only'],
  ['Employee profiles and leave credits', '', '', 'Edit', '', 'Edit + delete', 'View'],
  ['Payroll / salary records', '', 'Own only', 'Edit', '-', '-', '-'],
  ['Budget, expenses, reports, analytics', '', '', '', 'Yes', '-', '-'],
  ['Create accounts, reset passwords, assign roles', '', '', 'Yes', '', 'Yes', 'View'],
  ['System settings', '', '', '', '', 'Yes', 'View'],
  ['Audit log', '', '', '', '', 'Yes', 'View'],
  ['Sign-in code (OTP) required', '', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'No'],
  ['Attendance kiosk (QR / employee number scan)', '', '', '', '', '', '', 'Scan only'],
];

export default function RolesAccess() {
  return (
    <>
      <PageHeader title="Roles and Access" sub="HR and MIS manage employee access; MIS controls system settings and audit logs." />
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Function</th><th>Public</th><th>Employee</th><th>HR</th><th>Accounting</th><th>MIS</th><th>Admin</th><th>Attendance operator</th></tr>
          </thead>
          <tbody>
            {ROWS.map(([fn, publicAccess, ...rest]) => (
              <tr key={fn}>
                <td>{fn}</td>
                <td>{publicAccess || <span className="muted">-</span>}</td>
                {[...rest, ...(rest.length === 5 ? [''] : [])].map((c, i) => <td key={i}>{c === '' ? <span className="muted">-</span> : c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note-box">Access is enforced by the server on every request, not just hidden in the menu. Change a person's role in User Accounts.</p>
    </>
  );
}
