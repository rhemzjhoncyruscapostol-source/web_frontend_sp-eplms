import { useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate, money, num, today } from '../format.js';
import { Button, Empty, ErrorBox, Loading, Modal, PageHeader, StatusBadge, TextField, useLoad, useToast } from '../components/ui.jsx';

const ALL = '__all__';
const blank = (office) => ({
  full_name: '', employee_no: '', job_title: '', department: office === ALL ? '' : office, reports_to: '', date_hired: '', is_active: true, include_in_chart: false,
  monthly_salary: '', salary_effective_from: today(),
  credits: { vacation: 15, sick: 15, special: 3 },
});
const initials = (n) => n.replace(/^(Hon\.|Atty\.)\s*/i, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

export default function Employees() {
  const { user } = useAuth();
  const toast = useToast();
  const canEditRole = user.role === 'hr' || user.role === 'mis';
  const canDelete = user.role === 'mis';
  const { data, error, loading, reload } = useLoad(() => api.get('/employees'));
  const [tab, setTab] = useState(ALL);
  const [q, setQ] = useState('');
  const [view, setView] = useState(null); // employee being viewed
  const [editing, setEditing] = useState(null); // {} = new, employee = edit
  const [form, setForm] = useState(blank(ALL));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const salaryHistory = useLoad(
    () => view && canEditRole ? api.get(`/employees/${view.id}/salary-history`) : Promise.resolve({ salary_history: [] }),
    [view?.id]
  );

  const offices = useMemo(() => (data ? [...new Set(data.employees.map((e) => e.department).filter(Boolean))].sort() : []), [data]);
  const editable = canEditRole && tab !== ALL; // "All Profiles" is a read-only consolidation

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.employees.filter(
      (e) =>
        (tab === ALL || e.department === tab) &&
        (!term || `${e.full_name} ${e.employee_no || ''} ${e.job_title}`.toLowerCase().includes(term))
    );
  }, [data, tab, q]);

  const openEdit = (emp) => {
    setErrors({});
    setView(null);
    setEditing(emp || {});
    setForm(
      emp
        ? {
            full_name: emp.full_name, employee_no: emp.employee_no || '', job_title: emp.job_title, department: emp.department || '',
            reports_to: emp.reports_to ?? '', date_hired: emp.date_hired || '', is_active: Boolean(emp.is_active), include_in_chart: Boolean(emp.include_in_chart),
            monthly_salary: String(emp.monthly_salary ?? 0), salary_effective_from: today(),
            credits: { vacation: emp.vacation ?? 0, sick: emp.sick ?? 0, special: emp.special ?? 0 },
          }
        : blank(tab)
    );
  };
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setCredit = (key) => (e) => setForm((f) => ({ ...f, credits: { ...f.credits, [key]: e.target.value } }));

  const save = async () => {
    setBusy(true);
    setErrors({});
    const body = { ...form, reports_to: form.reports_to === '' ? null : Number(form.reports_to) };
    if (!editing.id) {
      delete body.monthly_salary;
      delete body.salary_effective_from;
    }
    try {
      if (editing.id) await api.put(`/employees/${editing.id}`, body);
      else await api.post('/employees', body);
      toast(editing.id ? 'Employee updated.' : 'Employee added.');
      setEditing(null);
      reload();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (emp) => {
    if (!window.confirm(`Delete ${emp.full_name}? This cannot be undone.`)) return;
    try {
      await api.del(`/employees/${emp.id}`);
      toast('Employee deleted.');
      setView(null);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  return (
    <>
      <PageHeader title="Employee Profiles" />
      <div className="tabs-row" role="tablist" aria-label="Offices">
        {[ALL, ...offices].map((o) => (
          <button key={o} role="tab" aria-selected={tab === o} className={`tab${tab === o ? ' on' : ''}`} onClick={() => setTab(o)}>
            {o === ALL ? 'All Profiles' : o}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input className="input grow" type="search" placeholder="Search name, ID, position" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employees" />
        {canEditRole && <button className="btn primary" disabled={!editable} title={editable ? '' : 'Open an office tab to add someone'} onClick={() => openEdit(null)}>+ Add employee</button>}
      </div>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && list.length === 0 && <Empty title="No employees found">{q ? 'Try a different search.' : 'Nothing in this office yet.'}</Empty>}
      {data && list.length > 0 && (
        <div className="table-wrap">
          <table className="table clickable">
            <thead><tr><th>Photo</th><th>Employee ID</th><th>Name</th><th>Position</th><th>Office</th><th>Status</th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} tabIndex={0} onClick={() => setView(e)} onKeyDown={(ev) => ev.key === 'Enter' && setView(e)}>
                  <td><span className="avatar small" aria-hidden="true">{initials(e.full_name)}</span></td>
                  <td>{e.employee_no || <span className="muted">-</span>}</td>
                  <td><strong>{e.full_name}</strong></td>
                  <td>{e.job_title}</td>
                  <td>{e.department || '-'}</td>
                  <td><StatusBadge status={e.is_active ? 'active' : 'inactive'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="note-box">
        Click a row to open the profile: personal info, employment info, office assignment and leave credits.
        {canEditRole ? ' The All Profiles tab is a read-only consolidation; edits happen inside each office tab.' : ' This view is read-only.'}
      </p>

      {view && (
        <Modal
          title={view.full_name}
          wide
          onClose={() => setView(null)}
          footer={
            <>
              {canDelete && tab !== ALL && <button className="btn danger" onClick={() => remove(view)}>Delete</button>}
              <button className="btn" onClick={() => setView(null)}>Close</button>
              {editable && <button className="btn primary" onClick={() => openEdit(view)}>Edit profile</button>}
            </>
          }
        >
          <div className="grid-2 flat">
            <div>
              <h3>Personal and employment info</h3>
              <dl className="status-list">
                <div><dt>Employee ID</dt><dd>{view.employee_no || '-'}</dd></div>
                <div><dt>Position</dt><dd>{view.job_title}</dd></div>
                <div><dt>Date hired</dt><dd>{fmtDate(view.date_hired)}</dd></div>
                {canEditRole && <div><dt>Fixed monthly salary</dt><dd>{money(view.monthly_salary)}</dd></div>}
                <div><dt>Status</dt><dd><StatusBadge status={view.is_active ? 'active' : 'inactive'} /></dd></div>
                <div><dt>Account</dt><dd>{view.username || 'None'}</dd></div>
              </dl>
              {canEditRole && (
                <>
                  <h3>Salary history</h3>
                  {salaryHistory.loading && <Loading label="Loading salary history" />}
                  {salaryHistory.error && <ErrorBox error={salaryHistory.error} />}
                  {salaryHistory.data?.salary_history.length > 0 ? (
                    <ul className="history-list">
                      {salaryHistory.data.salary_history.map((entry, index) => (
                        <li key={`${entry.effective_from}-${index}`}>
                          <strong>{money(entry.monthly_salary)}</strong> per month - effective {fmtDate(entry.effective_from)}
                        </li>
                      ))}
                    </ul>
                  ) : !salaryHistory.loading && !salaryHistory.error ? <p className="muted">No salary history yet.</p> : null}
                </>
              )}
            </div>
            <div>
              <h3>Office assignment</h3>
              <dl className="status-list">
                <div><dt>Office</dt><dd>{view.department || '-'}</dd></div>
                <div><dt>Reports to</dt><dd>{view.reports_to_name || 'Top of chart'}</dd></div>
                <div><dt>Organization chart</dt><dd>{view.include_in_chart ? 'Included' : 'Not included'}</dd></div>
              </dl>
              <h3>Leave credits</h3>
              <dl className="status-list">
                <div><dt>Vacation</dt><dd>{view.vacation === null ? '-' : num(view.vacation)}</dd></div>
                <div><dt>Sick</dt><dd>{view.sick === null ? '-' : num(view.sick)}</dd></div>
                <div><dt>Special Privilege</dt><dd>{view.special === null ? '-' : num(view.special)}</dd></div>
              </dl>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit employee' : 'Add employee'}
          wide
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <Button variant="primary" busy={busy} onClick={save}>Save employee</Button>
            </>
          }
        >
          <div className="row">
            <TextField label="Full name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} />
            <TextField label="Employee ID" value={form.employee_no} onChange={set('employee_no')} error={errors.employee_no} hint="Can be used to sign in." />
          </div>
          <div className="row">
            <TextField label="Position" value={form.job_title} onChange={set('job_title')} error={errors.job_title} />
            <TextField label="Office" list="office-list" value={form.department} onChange={set('department')} error={errors.department} />
            <datalist id="office-list">{offices.map((o) => <option key={o} value={o} />)}</datalist>
          </div>
          <div className="row">
            <TextField as="select" label="Reports to" value={form.reports_to} onChange={set('reports_to')} error={errors.reports_to} hint="Leave empty for the top of the chart.">
              <option value="">No one (top of chart)</option>
              {data.employees.filter((e) => e.id !== editing.id && e.is_active && (e.include_in_chart || e.id === Number(form.reports_to))).map((e) => (
                <option key={e.id} value={e.id}>{e.full_name} - {e.job_title}</option>
              ))}
            </TextField>
            <TextField label="Date hired" type="date" value={form.date_hired} onChange={set('date_hired')} error={errors.date_hired} />
          </div>
          {editing.id && (
            <fieldset className="credits-set">
              <legend>Fixed monthly salary</legend>
              <div className="row">
                <TextField label="Monthly salary" type="number" min="0" step="0.01" value={form.monthly_salary} onChange={set('monthly_salary')} error={errors.monthly_salary} />
                <TextField label="Effective from" type="date" value={form.salary_effective_from} onChange={set('salary_effective_from')} error={errors.salary_effective_from} />
              </div>
              <p className="muted small-print">A dated history entry is saved whenever this salary changes.</p>
            </fieldset>
          )}
          <fieldset className="credits-set">
            <legend>Leave credits (days)</legend>
            <div className="row three">
              <TextField label="Vacation" type="number" min="0" step="0.5" value={form.credits.vacation} onChange={setCredit('vacation')} />
              <TextField label="Sick" type="number" min="0" step="0.5" value={form.credits.sick} onChange={setCredit('sick')} />
              <TextField label="Special Privilege" type="number" min="0" step="0.5" value={form.credits.special} onChange={setCredit('special')} />
            </div>
            {errors.credits && <p className="err" role="alert">{errors.credits}</p>}
          </fieldset>
          <label className="check">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Currently employed (inactive people are hidden from the directory and chart)
          </label>
          <label className="check">
            <input type="checkbox" checked={form.include_in_chart} onChange={(e) => setForm((f) => ({ ...f, include_in_chart: e.target.checked }))} />
            Include this active employee in the organization chart
          </label>
        </Modal>
      )}
    </>
  );
}
