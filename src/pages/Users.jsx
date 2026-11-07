import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate, today } from '../format.js';
import { ROLE_LABEL } from '../roles.js';
import { Badge, Button, Empty, ErrorBox, Loading, Modal, PageHeader, StatusBadge, TextField, useLoad, useToast } from '../components/ui.jsx';

const ROLES = ['employee', 'hr', 'accounting', 'mis', 'admin'];
const blank = {
  username: '', email: '', phone: '', password: '', role: 'employee', employee_id: '',
  monthly_salary: '', salary_effective_from: today(),
  credits: { vacation: 15, sick: 15, special: 3 },
  employee_is_active: true, is_active: true,
};

function randomPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '#7';
}

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const canManage = me.role === 'mis' || me.role === 'hr';
  const users = useLoad(() => api.get('/users'));
  const employees = useLoad(() => (canManage ? api.get('/employees') : Promise.resolve({ employees: [] })));

  const [editing, setEditing] = useState(null); // {} = new, user = edit
  const [resetting, setResetting] = useState(null);
  const [form, setForm] = useState(blank);
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const open = (u) => {
    setErrors({});
    setEditing(u || {});
    setForm(u ? { username: u.username, email: u.email, phone: u.phone || '', password: '', role: u.role, employee_id: u.employee_id ?? '', is_active: Boolean(u.is_active) } : blank);
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { ...form, employee_id: form.employee_id === '' ? null : Number(form.employee_id) };
    if (form.credits) {
      body.credits = Object.fromEntries(Object.entries(form.credits).map(([key, value]) => [key, Number(value)]));
    }
    if (editing.id || form.role !== 'employee') {
      delete body.monthly_salary;
      delete body.salary_effective_from;
      delete body.credits;
      delete body.employee_is_active;
    }
    try {
      if (editing.id) await api.put(`/users/${editing.id}`, body);
      else await api.post('/users', body);
      toast(editing.id ? 'Account updated.' : 'Account created.');
      setEditing(null);
      users.reload();
      employees.reload();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.post(`/users/${resetting.id}/password`, { password: newPassword });
      toast('Password changed. Share it with the user securely.');
      setResetting(null);
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete the account "${u.username}"? The employee record is kept.`)) return;
    try {
      await api.del(`/users/${u.id}`);
      toast('Account deleted.');
      users.reload();
      employees.reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = users.data ? users.data.users : [];
    return term ? all.filter((u) => `${u.username} ${u.email} ${u.full_name || ''} ${ROLE_LABEL[u.role]}`.toLowerCase().includes(term)) : all;
  }, [users.data, q]);

  const toggle = async (u) => {
    const body = { username: u.username, email: u.email, phone: u.phone || '', role: u.role, employee_id: u.employee_id, is_active: !u.is_active };
    if (!window.confirm(`${u.is_active ? 'Disable' : 'Enable'} the account "${u.username}"?`)) return;
    try {
      await api.put(`/users/${u.id}`, body);
      toast(u.is_active ? 'Account disabled.' : 'Account enabled.');
      users.reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  // Employees that can still be linked: unlinked ones, plus the one this account already has.
  const linkable = (employees.data ? employees.data.employees : []).filter((e) => e.user_id === null || (editing && e.user_id === editing.id));

  return (
    <>
      <PageHeader
        title="User Accounts and Roles"
        sub={canManage ? 'HR and MIS can manage accounts and roles. There is no public registration.' : 'View only.'}
        actions={canManage && <button className="btn primary" onClick={() => open(null)}>+ Create account</button>}
      />
      <div className="toolbar"><input className="input grow" type="search" placeholder="Search user" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search user" /></div>
      {users.loading && !users.data && <Loading />}
      {users.error && <ErrorBox error={users.error} onRetry={users.reload} />}
      {users.data && rows.length === 0 && <Empty title="No accounts found" />}
      {users.data && rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Role</th><th>Office</th><th>Created</th><th>Status</th>{canManage && <th><span className="sr-only">Actions</span></th>}</tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const retiredViewer = u.role === 'viewer';
                return (
                <tr key={u.id}>
                  <td><strong>{u.full_name || <span className="muted">Not linked</span>}</strong>{u.id === me.id && <> <Badge tone="info">You</Badge></>}<br /><span className="muted small-print">{u.email}</span></td>
                  <td>{u.username}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.department || <span className="muted">-</span>}</td>
                  <td>{fmtDate(u.created_at)}</td>
                  <td><StatusBadge status={u.is_active && !retiredViewer ? 'active' : 'inactive'} /></td>
                  {canManage && (
                    <td className="row-actions">
                      {!retiredViewer && u.role !== 'attendance_operator' && <button className="btn small" onClick={() => open(u)}>Edit</button>}
                      {!retiredViewer && <button className="btn small" onClick={() => { setResetting(u); setNewPassword(''); setErrors({}); }}>Reset password</button>}
                      {!retiredViewer && u.id !== me.id && <button className="btn small" onClick={() => toggle(u)}>{u.is_active ? 'Disable' : 'Enable'}</button>}
                      {u.id !== me.id && <button className="btn small danger" onClick={() => remove(u)}>Delete</button>}
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit account' : 'Create account'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <Button variant="primary" busy={busy} onClick={save}>{editing.id ? 'Save changes' : 'Create account'}</Button>
            </>
          }
        >
          <div className="row">
            <TextField label="Username" value={form.username} onChange={set('username')} error={errors.username} autoComplete="off" />
            <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="off" />
          </div>
          <TextField label="Mobile number (optional)" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Used for SMS notifications and sign-in codes, e.g. +639171234567." autoComplete="off" />
          {!editing.id && (
            <div className="row pw-row">
              <TextField label="Temporary password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters. Tell the user to keep it private." autoComplete="off" />
              <button type="button" className="btn small" onClick={() => setForm((f) => ({ ...f, password: randomPassword() }))}>Generate</button>
            </div>
          )}
          <TextField as="select" label="Role" value={form.role} onChange={set('role')} error={errors.role}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </TextField>
          <TextField
            as="select"
            label={form.role === 'employee' ? 'Employee record' : 'Employee record (optional)'}
            value={form.employee_id}
            onChange={(e) => {
              const employeeId = e.target.value;
              const employee = (employees.data?.employees || []).find((item) => String(item.id) === employeeId);
              setForm((current) => ({
                ...current,
                employee_id: employeeId,
                monthly_salary: employee && Number(employee.monthly_salary) > 0
                  ? String(employee.monthly_salary)
                  : '',
                salary_effective_from: today(),
                credits: {
                  vacation: String(employee?.vacation ?? 15),
                  sick: String(employee?.sick ?? 15),
                  special: String(employee?.special ?? 3),
                },
                employee_is_active: employee ? Boolean(employee.is_active) : true,
              }));
            }}
            error={errors.employee_id}
            hint={form.role === 'employee' ? 'Needed so this person sees their own salary and leave.' : 'Links the account to a person in the chart.'}
          >
            <option value="">Not linked</option>
            {linkable.map((e) => (
              <option key={e.id} value={e.id}>{e.full_name} - {e.job_title}</option>
            ))}
          </TextField>
          {!editing.id && form.role === 'employee' && (
              <div>
                <fieldset className="credits-set">
                  <legend>Fixed monthly salary</legend>
                  <div className="row">
                    <TextField label="Monthly salary" type="number" min="0.01" step="0.01" value={form.monthly_salary} onChange={set('monthly_salary')} error={errors.monthly_salary} />
                    <TextField label="Effective from" type="date" value={form.salary_effective_from} onChange={set('salary_effective_from')} error={errors.salary_effective_from} />
                  </div>
                  <p className="muted small-print">A dated history entry is saved when the employee is added and whenever this salary changes.</p>
                </fieldset>
                <fieldset className="credits-set">
                  <legend>Leave credits (days)</legend>
                  <div className="row three">
                    {['vacation', 'sick', 'special'].map((key) => (
                      <TextField
                        key={key}
                        label={key === 'special' ? 'Special Privilege' : key[0].toUpperCase() + key.slice(1)}
                        type="number"
                        min="0"
                        max="365"
                        step="0.5"
                        value={form.credits[key]}
                        onChange={(e) => setForm((current) => ({ ...current, credits: { ...current.credits, [key]: e.target.value } }))}
                        error={errors[`credits.${key}`]}
                      />
                    ))}
                  </div>
                  {errors.credits && <p className="err" role="alert">{errors.credits}</p>}
                </fieldset>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={form.employee_is_active}
                    onChange={(e) => setForm((current) => ({ ...current, employee_is_active: e.target.checked }))}
                  />
                  Currently employed (inactive people are hidden from the directory and chart)
                </label>
              </div>
          )}
          {editing.id && (
            <label className="check">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} disabled={editing.id === me.id} />
              Account is active (inactive accounts cannot sign in)
            </label>
          )}
        </Modal>
      )}

      {resetting && (
        <Modal
          title={`Reset password for ${resetting.username}`}
          onClose={() => setResetting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setResetting(null)}>Cancel</button>
              <Button variant="primary" busy={busy} onClick={reset}>Change password</Button>
            </>
          }
        >
          <div className="row pw-row">
            <TextField label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={errors.password} hint="They will be signed out everywhere." autoComplete="off" />
            <button type="button" className="btn small" onClick={() => setNewPassword(randomPassword())}>Generate</button>
          </div>
        </Modal>
      )}
    </>
  );
}
