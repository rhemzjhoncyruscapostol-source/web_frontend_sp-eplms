import { useState } from 'react';
import { api } from '../api.js';
import { fmtMonth, money } from '../format.js';
import { useAuth } from '../auth.jsx';
import { Button, Empty, ErrorBox, Loading, Modal, PageHeader, TextField, useLoad, useToast } from '../components/ui.jsx';

const blank = () => ({ employee_id: '', loan_name: '', principal: '', installment: '', remarks: '' });

export default function Loans() {
  const { user } = useAuth();
  const isHr = user.role === 'hr';
  const toast = useToast();
  const loans = useLoad(() => api.get(isHr ? '/loans' : '/me/loans'));
  const employees = useLoad(() => (isHr ? api.get('/employees') : Promise.resolve({ employees: [] })));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));

  const open = (loan) => {
    setEditing(loan || {});
    setForm(loan ? { employee_id: loan.employee_id, loan_name: loan.loan_name, principal: loan.principal, installment: loan.installment, remarks: loan.remarks || '' } : blank());
  };

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...form, employee_id: Number(form.employee_id), principal: Number(form.principal), installment: Number(form.installment) };
      if (editing.id) await api.put(`/loans/${editing.id}`, body);
      else await api.post('/loans', body);
      toast(editing.id ? 'Loan updated.' : 'Loan recorded.');
      setEditing(null);
      loans.reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (loan) => {
    if (!window.confirm(`Cancel ${loan.loan_name} for ${loan.full_name}?`)) return;
    try {
      await api.del(`/loans/${loan.id}`);
      toast('Loan cancelled.');
      loans.reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  if (loans.loading || employees.loading) return <Loading />;
  if (loans.error) return <ErrorBox error={loans.error} onRetry={loans.reload} />;
  const rows = loans.data.loans || [];

  return (
    <>
      <PageHeader
        title={isHr ? 'Employee Loans' : 'My Loans'}
        sub={isHr ? 'Record and manage employee loan balances. Active installments are deducted when payroll is posted.' : 'Only you can see your loans, repayments, and outstanding balances.'}
        actions={isHr && <button className="btn primary" onClick={() => open(null)}>Record loan</button>}
      />
      {rows.length === 0 ? <Empty title="No loans recorded" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>{isHr && <th>Employee</th>}<th>Loan</th><th className="num">Original amount</th><th className="num">Installment</th><th className="num">Balance</th><th>Status</th>{isHr && <th>Actions</th>}</tr></thead>
            <tbody>{rows.map((loan) => (
              <tr key={loan.id}>
                {isHr && <td>{loan.full_name}</td>}
                <td>
                  <strong>{loan.loan_name}</strong>
                  {!isHr && loan.repayments?.length > 0 && (
                    <details className="small-print">
                      <summary>{loan.repayments.length} payroll repayment(s)</summary>
                      <ul>{loan.repayments.map((repayment, index) => <li key={`${repayment.period}-${index}`}>{fmtMonth(repayment.period)}: {money(Number(repayment.amount))}</li>)}</ul>
                    </details>
                  )}
                </td>
                <td className="num">{money(Number(loan.principal))}</td>
                <td className="num">{money(Number(loan.installment))}</td>
                <td className="num strong">{money(Number(loan.balance))}</td>
                <td>{loan.status}</td>
                {isHr && <td className="row-actions">{loan.status === 'active' && <><button className="btn small" onClick={() => open(loan)}>Edit terms</button><button className="btn small danger" onClick={() => cancel(loan)}>Cancel</button></>}</td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? 'Edit loan terms' : 'Record employee loan'} onClose={() => setEditing(null)} footer={<><button className="btn" onClick={() => setEditing(null)}>Cancel</button><Button variant="primary" busy={busy} onClick={save}>Save loan</Button></>}>
          {!editing.id ? (
            <>
              <TextField as="select" label="Employee" value={form.employee_id} onChange={set('employee_id')}>
                <option value="">Choose an employee</option>
                {(employees.data.employees || []).filter((employee) => employee.is_active).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
              </TextField>
              <TextField label="Original principal" type="number" min="0.01" step="0.01" value={form.principal} onChange={set('principal')} />
            </>
          ) : <p>Original amount: <strong>{money(Number(editing.principal))}</strong>; outstanding: <strong>{money(Number(editing.balance))}</strong></p>}
          <TextField label="Loan name" maxLength={120} value={form.loan_name} onChange={set('loan_name')} />
          <TextField label="Monthly installment" type="number" min="0.01" step="0.01" value={form.installment} onChange={set('installment')} />
          <TextField label="Remarks (optional)" maxLength={255} value={form.remarks} onChange={set('remarks')} />
        </Modal>
      )}
    </>
  );
}
