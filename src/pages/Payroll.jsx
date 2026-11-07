import { useState } from 'react';
import { api } from '../api.js';
import { fmtMonth, money, thisMonth } from '../format.js';
import { Button, Empty, ErrorBox, Loading, Modal, PageHeader, TextField, useLoad, useToast } from '../components/ui.jsx';

const blank = () => ({ employee_id: '', period: thisMonth(), basic: '', allowances: '', taxable_benefits: '', non_taxable_benefits: '', deductions: '', remarks: '' });

export default function Payroll() {
  const toast = useToast();
  const [period, setPeriod] = useState('');
  const salaries = useLoad(() => api.get(`/salaries${period ? `?period=${period}` : ''}`), [period]);
  const employees = useLoad(() => api.get('/employees'));

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const selectEmployee = (event) => {
    const employeeId = event.target.value;
    const employee = (employees.data?.employees || []).find((item) => item.id === Number(employeeId));
    setForm((current) => ({
      ...current,
      employee_id: employeeId,
      basic: employee ? String(employee.monthly_salary) : '',
    }));
  };
  const beforeStatutoryAndLoanDeductions = (Number(form.basic) || 0) + (Number(form.allowances) || 0)
    + (Number(form.taxable_benefits) || 0) + (Number(form.non_taxable_benefits) || 0)
    - (Number(form.deductions) || 0);

  const open = (row) => {
    setErrors({});
    setEmployeeSearch('');
    setEditing(row || {});
    setForm(row ? {
      employee_id: row.employee_id, period: row.period, basic: row.basic, allowances: row.allowances,
      taxable_benefits: row.taxable_benefits, non_taxable_benefits: row.non_taxable_benefits,
      deductions: row.deductions, remarks: row.remarks || '',
    } : blank());
  };

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      if (editing.id) await api.put(`/salaries/${editing.id}`, form);
      else await api.post('/salaries', { ...form, employee_id: Number(form.employee_id) });
      toast('Salary record saved.');
      setEditing(null);
      salaries.reload();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.full_name}'s record for ${fmtMonth(row.period)}?`)) return;
    try {
      await api.del(`/salaries/${row.id}`);
      toast('Salary record deleted.');
      salaries.reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const rows = salaries.data ? salaries.data.salaries : [];
  const eligibleEmployees = (employees.data?.employees || []).filter((employee) => employee.is_active);
  const searchTerm = employeeSearch.trim().toLocaleLowerCase();
  const matchingEmployees = eligibleEmployees.filter((employee) =>
    `${employee.full_name} ${employee.employee_no || ''} ${employee.job_title || ''} ${employee.department || ''}`
      .toLocaleLowerCase()
      .includes(searchTerm)
  );
  const total = rows.reduce((sum, r) => sum + r.net, 0);

  return (
    <>
      <PageHeader
        title="Payroll"
        sub="Salary records for each employee and month. Employees see their own records only."
        actions={<button className="btn primary" onClick={() => open(null)}>Add salary record</button>}
      />
      <div className="toolbar">
        <label className="inline-label">
          Month
          <input className="input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </label>
        {period && <button className="btn small" onClick={() => setPeriod('')}>Show all months</button>}
        {rows.length > 0 && <span className="muted">{rows.length} records, net total {money(total)}</span>}
      </div>
      {salaries.loading && <Loading />}
      {salaries.error && <ErrorBox error={salaries.error} onRetry={salaries.reload} />}
      {salaries.data && rows.length === 0 && <Empty title="No salary records">Add one with "Add salary record".</Empty>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Month</th><th>Employee</th><th className="num">Basic</th><th className="num">Allowances</th><th className="num">Absences</th><th className="num">Absence deduction</th><th className="num">Taxable benefits</th><th className="num">Non-taxable benefits</th><th className="num">Other deductions</th><th className="num">SSS</th><th className="num">PhilHealth</th><th className="num">Pag-IBIG</th><th className="num">Withholding tax</th><th className="num">Loans</th><th className="num">Net pay</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtMonth(r.period)}</td>
                  <td><strong>{r.full_name}</strong><br /><span className="muted">{r.job_title}</span></td>
                  <td className="num">{money(r.basic)}</td>
                  <td className="num">{money(r.allowances)}</td>
                  <td className="num">{r.absence_days}</td>
                  <td className="num">{money(r.absence_deduction)}</td>
                  <td className="num">{money(r.taxable_benefits)}</td>
                  <td className="num">{money(r.non_taxable_benefits)}</td>
                  <td className="num">{money(r.deductions)}</td>
                  <td className="num">{money(r.sss)}</td>
                  <td className="num">{money(r.philhealth)}</td>
                  <td className="num">{money(r.pagibig)}</td>
                  <td className="num">{money(r.withholding_tax)}</td>
                  <td className="num">{money(r.loan_repayments.reduce((sum, loan) => sum + loan.amount, 0))}</td>
                  <td className="num strong">{money(r.net)}</td>
                  <td className="row-actions">
                    <button className="btn small" onClick={() => open(r)}>Edit</button>
                    <button className="btn small danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? 'Edit salary record' : 'Add salary record'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <Button variant="primary" busy={busy} onClick={save}>Save record</Button>
            </>
          }
        >
          {editing.id ? (
            <p><strong>{editing.full_name}</strong></p>
          ) : (
            <>
              <TextField
                label="Search employees"
                type="search"
                placeholder="Search name, employee ID, position, or office"
                value={employeeSearch}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setForm((current) => ({ ...current, employee_id: '' }));
                }}
              />
              <TextField as="select" label="Employee" value={form.employee_id} onChange={selectEmployee} error={errors.employee_id}>
                <option value="">Choose an employee</option>
                {matchingEmployees.map((e) => (
                <option key={e.id} value={e.id}>{e.full_name} - {e.job_title}</option>
                ))}
              </TextField>
              {employees.data && matchingEmployees.length === 0 && <p className="muted small-print">No active employees match that search.</p>}
            </>
          )}
          <TextField label="Month" type="month" value={form.period} onChange={set('period')} error={errors.period} />
          <p className="muted small-print">Attendance records marked absent for this month are deducted automatically at basic pay ÷ 22 workdays. Approved leave is not deducted, and the absence deduction is capped at the remaining pay.</p>
          <div className="row three">
            <TextField label="Basic pay" type="number" min="0" step="0.01" value={form.basic} onChange={set('basic')} error={errors.basic} />
            <TextField label="Allowances" type="number" min="0" step="0.01" value={form.allowances} onChange={set('allowances')} error={errors.allowances} />
          </div>
          {!editing.id && form.employee_id && (
            <p className="muted small-print">Basic pay is prefilled from the employee’s fixed monthly salary. HR can adjust this payroll entry if needed.</p>
          )}
          <div className="row two">
            <TextField label="Taxable benefits" type="number" min="0" step="0.01" value={form.taxable_benefits} onChange={set('taxable_benefits')} error={errors.taxable_benefits} />
            <TextField label="Non-taxable benefits" type="number" min="0" step="0.01" value={form.non_taxable_benefits} onChange={set('non_taxable_benefits')} error={errors.non_taxable_benefits} />
          </div>
          <TextField label="Other deductions" type="number" min="0" step="0.01" value={form.deductions} onChange={set('deductions')} error={errors.deductions} />
          <p className="net-preview">Before statutory and loan deductions <strong>{money(beforeStatutoryAndLoanDeductions)}</strong></p>
          <TextField label="Remarks (optional)" maxLength={255} value={form.remarks} onChange={set('remarks')} error={errors.remarks} />
        </Modal>
      )}
    </>
  );
}
