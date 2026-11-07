import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Button, ErrorBox, Loading, PageHeader, TextField, useLoad, useToast } from '../components/ui.jsx';

const percent = (value) => String(Number(value) * 100);

function toForm(schedule) {
  const rules = schedule.rules;
  return {
    effective_from: schedule.effective_from,
    sss: { ...rules.sss, rate: percent(rules.sss.rate) },
    philhealth: { ...rules.philhealth, rate: percent(rules.philhealth.rate) },
    pagibig: {
      ...rules.pagibig,
      low_salary_rate: percent(rules.pagibig.low_salary_rate),
      high_salary_rate: percent(rules.pagibig.high_salary_rate),
    },
    withholding_tax: rules.withholding_tax.map((bracket) => ({ ...bracket, rate: percent(bracket.rate) })),
  };
}

export default function PayrollSettings() {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/payroll/schedules'));
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.schedules?.length && !form) setForm(toForm(data.schedules[0]));
  }, [data, form]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!form) return null;

  const setValue = (section, key) => (event) => {
    const { value } = event.target;
    setForm((current) => section === 'root'
      ? { ...current, [key]: value }
      : { ...current, [section]: { ...current[section], [key]: value } });
  };
  const setBracket = (index, key, value) => setForm((current) => ({
    ...current,
    withholding_tax: current.withholding_tax.map((bracket, i) => i === index ? { ...bracket, [key]: value } : bracket),
  }));

  const save = async () => {
    setBusy(true);
    try {
      const rules = {
        sss: { ...form.sss, rate: Number(form.sss.rate) / 100 },
        philhealth: { ...form.philhealth, rate: Number(form.philhealth.rate) / 100 },
        pagibig: {
          ...form.pagibig,
          low_salary_rate: Number(form.pagibig.low_salary_rate) / 100,
          high_salary_rate: Number(form.pagibig.high_salary_rate) / 100,
        },
        withholding_tax: form.withholding_tax.map((bracket, index) => ({
          up_to: index === 5 ? null : Number(bracket.up_to),
          base_tax: Number(bracket.base_tax),
          rate: Number(bracket.rate) / 100,
          excess_over: Number(bracket.excess_over),
        })),
      };
      Object.keys(rules.sss).forEach((key) => { rules.sss[key] = Number(rules.sss[key]); });
      Object.keys(rules.philhealth).forEach((key) => { rules.philhealth[key] = Number(rules.philhealth[key]); });
      Object.keys(rules.pagibig).forEach((key) => { rules.pagibig[key] = Number(rules.pagibig[key]); });
      const result = await api.post('/payroll/schedules', { effective_from: form.effective_from, rules });
      toast(result.message);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Payroll Settings" sub="Create effective-dated contribution and withholding schedules. Existing payslips keep their calculated amounts." />
      <section className="panel block">
        <h2>New schedule</h2>
        <p className="muted small-print">Verify official agency rates and tax rules before saving. A new effective date must be unique.</p>
        <TextField label="Effective from" type="date" value={form.effective_from} onChange={setValue('root', 'effective_from')} />
        <div className="row three">
          <TextField label="SSS employee rate (%)" type="number" min="0" max="100" step="0.01" value={form.sss.rate} onChange={setValue('sss', 'rate')} />
          <TextField label="SSS minimum salary credit" type="number" min="0" value={form.sss.minimum_salary_credit} onChange={setValue('sss', 'minimum_salary_credit')} />
          <TextField label="SSS maximum salary credit" type="number" min="0" value={form.sss.maximum_salary_credit} onChange={setValue('sss', 'maximum_salary_credit')} />
          <TextField label="SSS salary-credit step" type="number" min="1" value={form.sss.salary_credit_step} onChange={setValue('sss', 'salary_credit_step')} />
          <TextField label="PhilHealth total rate (%)" type="number" min="0" max="100" step="0.01" value={form.philhealth.rate} onChange={setValue('philhealth', 'rate')} />
          <TextField label="PhilHealth employee share (%)" type="number" min="0" max="100" step="0.01" value={percent(form.philhealth.employee_share)} onChange={(e) => setForm((v) => ({ ...v, philhealth: { ...v.philhealth, employee_share: Number(e.target.value) / 100 } }))} />
          <TextField label="PhilHealth minimum base" type="number" min="0" value={form.philhealth.minimum_salary} onChange={setValue('philhealth', 'minimum_salary')} />
          <TextField label="PhilHealth maximum base" type="number" min="0" value={form.philhealth.maximum_salary} onChange={setValue('philhealth', 'maximum_salary')} />
          <TextField label="Pag-IBIG low salary ceiling" type="number" min="0" value={form.pagibig.low_salary_ceiling} onChange={setValue('pagibig', 'low_salary_ceiling')} />
          <TextField label="Pag-IBIG low rate (%)" type="number" min="0" max="100" step="0.01" value={form.pagibig.low_salary_rate} onChange={setValue('pagibig', 'low_salary_rate')} />
          <TextField label="Pag-IBIG high rate (%)" type="number" min="0" max="100" step="0.01" value={form.pagibig.high_salary_rate} onChange={setValue('pagibig', 'high_salary_rate')} />
          <TextField label="Pag-IBIG maximum fund salary" type="number" min="0" value={form.pagibig.maximum_fund_salary} onChange={setValue('pagibig', 'maximum_fund_salary')} />
        </div>
      </section>
      <section className="panel block">
        <h2>Monthly withholding tax brackets</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Upper limit</th><th>Base tax</th><th>Rate (%)</th><th>Excess over</th></tr></thead>
            <tbody>
              {form.withholding_tax.map((bracket, index) => (
                <tr key={index}>
                  <td>{index === 5 ? 'No limit' : <input className="input" type="number" min="0" value={bracket.up_to} onChange={(e) => setBracket(index, 'up_to', e.target.value)} />}</td>
                  <td><input className="input" type="number" min="0" step="0.01" value={bracket.base_tax} onChange={(e) => setBracket(index, 'base_tax', e.target.value)} /></td>
                  <td><input className="input" type="number" min="0" max="100" step="0.01" value={bracket.rate} onChange={(e) => setBracket(index, 'rate', e.target.value)} /></td>
                  <td><input className="input" type="number" min="0" value={bracket.excess_over} onChange={(e) => setBracket(index, 'excess_over', e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="primary" busy={busy} onClick={save}>Save effective-dated schedule</Button>
      </section>
      <section className="block">
        <h2>Saved schedules</h2>
        <ul>
          {data.schedules.map((schedule) => <li key={schedule.id}>Effective {schedule.effective_from}</li>)}
        </ul>
      </section>
    </>
  );
}
