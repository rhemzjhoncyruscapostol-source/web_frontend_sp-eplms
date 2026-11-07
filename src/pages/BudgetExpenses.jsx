import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { fmtDate, money, num, today } from '../format.js';
import { BudgetBars } from '../components/charts.jsx';
import { Badge, Button, Empty, ErrorBox, Loading, Modal, PageHeader, StatStrip, TextField, useLoad, useToast } from '../components/ui.jsx';

const blank = () => ({ expense_date: today(), description: '', office: '', category: '', amount: '' });

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Description', 'Category', 'Office', 'Amount', 'Flag', 'Ledger'];
  const lines = rows.map((r) => [r.expense_date, r.description, r.category, r.office, r.amount.toFixed(2), r.flagged ? r.flag_reason : '', r.verified ? 'Verified' : 'NOT VERIFIED']);
  return '\ufeff' + [head, ...lines].map((l) => l.map(esc).join(',')).join('\r\n');
}

export default function BudgetExpenses() {
  const toast = useToast();
  const thisYear = new Date().getFullYear();
  const [office, setOffice] = useState('');
  const [category, setCategory] = useState('');
  const [year, setYear] = useState(thisYear);

  const offices = useLoad(() => api.get('/directory?per=1', { auth: false }));
  const expenses = useLoad(
    () => api.get(`/expenses?year=${year}${office ? `&office=${encodeURIComponent(office)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`),
    [office, category, year]
  );
  const budgets = useLoad(() => api.get(`/budgets?year=${year}`), [year]);
  const analytics = useLoad(() => api.get(`/analytics/accounting?year=${year}${office ? `&office=${encodeURIComponent(office)}` : ''}`), [office, year]);

  const [adding, setAdding] = useState(false);
  const [setting, setSetting] = useState(false);
  const [form, setForm] = useState(blank());
  const [budgetForm, setBudgetForm] = useState({ office: '', amount: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [suggested, setSuggested] = useState('');

  const officeList = offices.data ? offices.data.offices : [];
  const rows = expenses.data ? expenses.data.expenses : [];
  const flagged = rows.filter((r) => r.flagged);
  const k = analytics.data ? analytics.data.kpis : null;

  const refresh = () => {
    expenses.reload();
    budgets.reload();
    analytics.reload();
  };

  // Suggest a category while typing the description (simple keyword rules on the server).
  useEffect(() => {
    if (!adding || form.description.trim().length < 3) {
      setSuggested('');
      return undefined;
    }
    const t = setTimeout(() => {
      api.get(`/expenses/suggest?description=${encodeURIComponent(form.description)}`).then((d) => setSuggested(d.category)).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.description, adding]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveExpense = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api.post('/expenses', { ...form, amount: form.amount === '' ? null : Number(form.amount) });
      toast(res.flagged ? `${res.message} ${res.flag_reason}` : res.message, res.flagged ? 'warn' : 'ok');
      setAdding(false);
      setForm(blank());
      refresh();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const saveBudget = async () => {
    setBusy(true);
    setErrors({});
    try {
      await api.put('/budgets', { office: budgetForm.office, fiscal_year: year, amount: budgetForm.amount === '' ? null : Number(budgetForm.amount) });
      toast('Budget saved.');
      setSetting(false);
      refresh();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryTotals = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.category, (m.get(r.category) || 0) + r.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  const grand = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Accounting: Budget and Expenses"
        actions={
          <>
            <button className="btn primary" onClick={() => { setErrors({}); setForm(blank()); setAdding(true); }}>+ Add expense</button>
            <button className="btn" onClick={() => { setErrors({}); setBudgetForm({ office, amount: '' }); setSetting(true); }}>Set budget</button>
            <button className="btn" disabled={!rows.length} onClick={exportCsv}>Export to Excel (CSV)</button>
          </>
        }
      />
      <div className="toolbar">
        <label className="inline-label">Office / Department
          <select className="input" value={office} onChange={(e) => setOffice(e.target.value)}>
            <option value="">All</option>
            {officeList.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label className="inline-label">Category
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All</option>
            {(expenses.data ? expenses.data.categories : []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="inline-label">Period
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y === thisYear ? `This year (${y})` : y}</option>)}
          </select>
        </label>
      </div>

      {k && (
        <StatStrip
          items={[
            { label: 'Total budget', value: money(k.total_budget) },
            { label: 'Total expenses', value: money(k.total_expenses) },
            { label: 'Variance', value: money(k.variance), note: k.variance < 0 ? 'Over budget' : 'Remaining' },
            { label: 'Flagged', value: num(k.flagged) },
          ]}
        />
      )}

      {expenses.data && !expenses.data.ledger_ok && (
        <div className="notice bad" role="alert"><p>The expense ledger failed verification. An entry was changed outside the app. Tell MIS.</p></div>
      )}
      {expenses.loading && !expenses.data && <Loading />}
      {expenses.error && <ErrorBox error={expenses.error} onRetry={expenses.reload} />}
      {expenses.data && rows.length === 0 && <Empty title="No expenses">Add one with "+ Add expense".</Empty>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Description</th><th>Category (suggested)</th><th>Office</th><th className="num">Amount</th><th>Flag</th><th>Ledger</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{fmtDate(r.expense_date)}</td>
                  <td className="wrap">{r.description}</td>
                  <td>{r.category}</td>
                  <td>{r.office}</td>
                  <td className="num">{money(r.amount)}</td>
                  <td>{r.flagged ? <Badge tone="warn">Review</Badge> : <span className="muted">-</span>}</td>
                  <td><Badge tone={r.verified ? 'ok' : 'bad'}>{r.verified ? 'Hash verified' : 'Not verified'}</Badge> <span className="muted small-print mono">{r.hash}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid-3 block">
        <section className="panel chart-panel">
          <h2>Budget vs actual per department</h2>
          {analytics.data ? <BudgetBars rows={analytics.data.by_office} /> : <Loading />}
        </section>
        <section className="panel chart-panel">
          <h2>Subtotals per category</h2>
          {categoryTotals.length === 0 ? <p className="muted chart-empty">No expenses.</p> : (
            <dl className="status-list">
              {categoryTotals.map(([c, t]) => <div key={c}><dt>{c}</dt><dd>{money(t)}</dd></div>)}
              <div className="total"><dt>Grand total</dt><dd>{money(grand)}</dd></div>
            </dl>
          )}
        </section>
        <section className="panel chart-panel">
          <h2>Flagged expenses</h2>
          {flagged.length === 0 ? <p className="muted chart-empty">Nothing flagged.</p> : (
            <ul className="plain-list">
              {flagged.map((f) => (
                <li key={f.id}>
                  <strong>{fmtDate(f.expense_date)}</strong> {f.description} <strong>{money(f.amount)}</strong>
                  <div className="remark warn">{f.flag_reason}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="note-box">Entries are append-only. To correct a mistake, add a reversing entry with a negative amount. Each entry is chained to the one before it, so any later change shows as "Not verified". Categories and flags come from simple, explainable rules.</p>

      {adding && (
        <Modal title="Add expense" onClose={() => setAdding(false)} footer={<><button className="btn" onClick={() => setAdding(false)}>Cancel</button><Button variant="primary" busy={busy} onClick={saveExpense}>Save expense</Button></>}>
          <TextField label="Date" type="date" max={today()} value={form.expense_date} onChange={set('expense_date')} error={errors.expense_date} />
          <TextField label="Description" value={form.description} onChange={set('description')} error={errors.description} />
          <div className="row">
            <TextField as="select" label="Office" value={form.office} onChange={set('office')} error={errors.office}>
              <option value="">Choose an office</option>
              {officeList.map((o) => <option key={o} value={o}>{o}</option>)}
            </TextField>
            <TextField as="select" label="Category" value={form.category} onChange={set('category')} error={errors.category} hint={suggested && !form.category ? `Will be filed under ${suggested}` : 'Leave empty to use the suggestion'}>
              <option value="">{suggested ? `Suggested: ${suggested}` : 'Suggest from description'}</option>
              {(expenses.data ? expenses.data.categories : []).map((c) => <option key={c} value={c}>{c}</option>)}
            </TextField>
          </div>
          <TextField label="Amount (PHP)" type="number" step="0.01" value={form.amount} onChange={set('amount')} error={errors.amount} hint="Use a negative amount to reverse an earlier entry." />
        </Modal>
      )}
      {setting && (
        <Modal title={`Set ${year} budget`} onClose={() => setSetting(false)} footer={<><button className="btn" onClick={() => setSetting(false)}>Cancel</button><Button variant="primary" busy={busy} onClick={saveBudget}>Save budget</Button></>}>
          <TextField as="select" label="Office" value={budgetForm.office} onChange={(e) => setBudgetForm((f) => ({ ...f, office: e.target.value }))} error={errors.office}>
            <option value="">Choose an office</option>
            {officeList.map((o) => <option key={o} value={o}>{o}</option>)}
          </TextField>
          <TextField label="Budget (PHP)" type="number" min="0" step="0.01" value={budgetForm.amount} onChange={(e) => setBudgetForm((f) => ({ ...f, amount: e.target.value }))} error={errors.amount} />
          {budgets.data && budgets.data.budgets.length > 0 && (
            <dl className="status-list">
              {budgets.data.budgets.map((b) => <div key={b.office}><dt>{b.office}</dt><dd>{money(b.amount)}</dd></div>)}
            </dl>
          )}
        </Modal>
      )}
    </>
  );
}
