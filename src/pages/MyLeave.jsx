import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { fmtDate, fmtRange, num, today, weekdaysBetween } from '../format.js';
import { LEAVE_TYPES, leaveLabel } from '../roles.js';
import { openAttachment } from '../components/LeaveActions.jsx';
import { Button, Empty, ErrorBox, Loading, PageHeader, StatusBadge, TextField, useLoad, useToast } from '../components/ui.jsx';

const blank = { leave_type: 'vacation', start_date: '', end_date: '', reason: '' };

/** mode="file": the CS Form No. 6 style form plus recent requests. mode="list": every request with details. */
export default function MyLeave({ mode }) {
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/me/leaves'));
  const [searchParams] = useSearchParams();
  const focusLeave = searchParams.get('focusLeave');
  const focusedRow = useRef(null);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'start_date' && (!next.end_date || next.end_date < value)) next.end_date = value;
      return next;
    });
  };

  const days = weekdaysBetween(form.start_date, form.end_date);
  const credits = data ? data.credits : null;
  const creditKey = (LEAVE_TYPES.find((t) => t.value === form.leave_type) || {}).credit;

  const reset = () => {
    setForm(blank);
    setFile(null);
    setErrors({});
    if (fileInput.current) fileInput.current.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    if (file) body.append('attachment', file);
    try {
      await api.post('/me/leaves', body);
      toast('Leave request sent to HR.');
      reset();
      reload();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await api.del(`/me/leaves/${id}`);
      toast('Leave request cancelled.');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  const rows = data ? (mode === 'file' ? data.leaves.slice(0, 5) : data.leaves) : [];

  useEffect(() => {
    if (mode === 'list' && focusLeave && data) {
      focusedRow.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [data, focusLeave, mode]);

  return (
    <>
      <PageHeader title={mode === 'file' ? 'File Leave (CS Form No. 6)' : 'My Leave Requests'} />

      {mode === 'file' && (
        <div className="two-col">
          <form className="panel" onSubmit={submit} noValidate>
            <TextField as="select" label="Leave type" value={form.leave_type} onChange={set('leave_type')} error={errors.leave_type}>
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}{t.credit && credits ? ` (${num(credits[t.credit])} left)` : ''}
                </option>
              ))}
            </TextField>
            <div className="row three">
              <TextField label="Start date" type="date" min={form.leave_type === 'sick' ? undefined : today()} value={form.start_date} onChange={set('start_date')} error={errors.start_date} />
              <TextField label="End date" type="date" min={form.start_date || undefined} value={form.end_date} onChange={set('end_date')} error={errors.end_date} />
              <TextField label="Days" value={days ? String(days) : ''} readOnly placeholder="0" hint="Mon to Fri" />
            </div>
            {creditKey && credits && days > credits[creditKey] && (
              <p className="err">You only have {num(credits[creditKey])} day(s) of this leave left.</p>
            )}
            <TextField as="textarea" rows={3} maxLength={500} label="Reason / details" value={form.reason} onChange={set('reason')} error={errors.reason}
              hint={form.leave_type === 'sick' ? 'Sick leave can be filed up to 14 days after the fact.' : undefined} />
            <div className="field">
              <label htmlFor="attachment">Attachment (e.g. medical certificate)</label>
              <input id="attachment" ref={fileInput} className={`input${errors.attachment ? ' invalid' : ''}`} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files[0] || null)} />
              {errors.attachment ? <p className="err" role="alert">{errors.attachment}</p> : <p className="hint">PDF, JPG or PNG, up to 2 MB. Optional.</p>}
            </div>
            <div className="actions-row tight">
              <Button type="submit" variant="primary" busy={busy}>Submit to HR</Button>
              <button type="button" className="btn" onClick={reset}>Cancel</button>
            </div>
          </form>

          <aside className="panel">
            <h2>My leave credits</h2>
            {credits ? (
              <dl className="status-list">
                <div><dt>Vacation</dt><dd>{num(credits.vacation)}</dd></div>
                <div><dt>Sick</dt><dd>{num(credits.sick)}</dd></div>
                <div><dt>Special Privilege</dt><dd>{num(credits.special)}</dd></div>
              </dl>
            ) : <Loading />}
            <p className="muted small-print">Credits are deducted when HR approves a request. Requests still waiting are held against your balance.</p>
          </aside>
        </div>
      )}

      <section className="block">
        <div className="block-head"><h2>{mode === 'file' ? 'My requests' : 'All my requests'}</h2></div>
        {loading && !data && <Loading />}
        {error && <ErrorBox error={error} onRetry={reload} />}
        {data && rows.length === 0 && <Empty title="No requests yet">Your requests will appear here.</Empty>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date filed</th><th>Type</th><th>Dates</th><th className="num">Days</th><th>Status</th>{mode === 'list' && <th>Details</th>}<th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rows.map((l) => (
                  <tr
                    key={l.id}
                    ref={String(l.id) === focusLeave ? focusedRow : undefined}
                    className={String(l.id) === focusLeave ? 'notification-focus' : undefined}
                  >
                    <td>{fmtDate(l.created_at)}</td>
                    <td>{leaveLabel(l.leave_type)}</td>
                    <td>{fmtRange(l.start_date, l.end_date)}</td>
                    <td className="num">{l.days}</td>
                    <td><StatusBadge status={l.status} /></td>
                    {mode === 'list' && (
                      <td className="wrap">
                        {l.reason}
                        {l.review_remarks && <div className="remark">{l.reviewed_by_name ? `${l.reviewed_by_name}: ` : ''}{l.review_remarks}</div>}
                      </td>
                    )}
                    <td className="row-actions">
                      {l.has_attachment && <button className="btn small" onClick={() => openAttachment(l.id, toast)}>View file</button>}
                      {l.status === 'pending' && <button className="btn small" onClick={() => cancel(l.id)}>Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
