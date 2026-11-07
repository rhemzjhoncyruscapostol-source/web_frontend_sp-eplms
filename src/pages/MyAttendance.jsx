import { useRef, useState } from 'react';
import { api } from '../api.js';
import { fmtDateTime, today as localToday, weekdaysBetween } from '../format.js';
import EmployeeQrCode from '../components/EmployeeQrCode.jsx';
import { Button, Empty, ErrorBox, Loading, Modal, PageHeader, TextField, useLoad, useToast } from '../components/ui.jsx';

const PUNCHES = [
  ['time_in', 'First time in'],
  ['time_out', 'First time out'],
  ['time_in_2', 'Second time in'],
  ['time_out_2', 'Second time out'],
];

export default function MyAttendance() {
  const { data, error, loading, reload } = useLoad(() => api.get('/me/attendance'));
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [travelOpen, setTravelOpen] = useState(false);
  const [travel, setTravel] = useState({ start_date: localToday(), end_date: localToday(), reason: '' });
  const [proof, setProof] = useState(null);
  const [travelErrors, setTravelErrors] = useState({});
  const [travelBusy, setTravelBusy] = useState(false);
  const proofInput = useRef(null);

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const todayRecord = data.today || {};
  const nextPunch = PUNCHES.find(([slot]) => !todayRecord[slot]);
  const punch = async () => {
    setBusy(true);
    try {
      const result = await api.post('/me/attendance/punch');
      toast(result.message);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const setTravelField = (key) => (event) => {
    const value = event.target.value;
    setTravel((current) => {
      const next = { ...current, [key]: value };
      if (key === 'start_date' && (!next.end_date || next.end_date < value)) next.end_date = value;
      return next;
    });
  };
  const resetTravelForm = () => {
    setTravel({ start_date: localToday(), end_date: localToday(), reason: '' });
    setProof(null);
    setTravelErrors({});
    if (proofInput.current) proofInput.current.value = '';
  };
  const closeTravelForm = () => {
    setTravelOpen(false);
    resetTravelForm();
  };
  const submitTravelRequest = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!travel.start_date) errors.start_date = 'Choose a start date.';
    if (!travel.end_date) errors.end_date = 'Choose an end date.';
    if (travel.end_date < travel.start_date) errors.end_date = 'The end date cannot be before the start date.';
    if (!travel.reason.trim()) errors.reason = 'Tell HR the purpose of your travel.';
    if (!proof) errors.attachment = 'Attach proof of travel.';
    if (!errors.start_date && !errors.end_date && weekdaysBetween(travel.start_date, travel.end_date) === 0) {
      errors.end_date = 'Choose at least one weekday.';
    }
    if (Object.keys(errors).length) {
      setTravelErrors(errors);
      return;
    }

    setTravelBusy(true);
    setTravelErrors({});
    const body = new FormData();
    body.append('leave_type', 'travel');
    body.append('start_date', travel.start_date);
    body.append('end_date', travel.end_date);
    body.append('reason', travel.reason);
    body.append('attachment', proof);
    try {
      const result = await api.post('/me/leaves', body);
      toast(result.message);
      closeTravelForm();
      reload();
    } catch (err) {
      setTravelErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setTravelBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My Attendance" sub="Record two time-in/time-out pairs each workday. Times use the server's local time." />
      <div className="attendance-self-grid">
        <section className="panel">
          <h2>Today</h2>
          <p className="muted attendance-instructions">Punches must be recorded in order: start work, lunch out, return, then end work.</p>
          {todayRecord.status === 'travel' && <p className="notice">Approved travel — recorded as Travel, not Absent.</p>}
          <div className="punch-list">
            {PUNCHES.map(([slot, label]) => (
              <div className="punch-item" key={slot}>
                <span>{label}</span>
                <strong>{todayRecord[slot] ? fmtDateTime(todayRecord[slot]) : 'Not recorded'}</strong>
              </div>
            ))}
          </div>
          {nextPunch ? (
            <Button variant="primary" busy={busy} onClick={punch}>Record {nextPunch[1]}</Button>
          ) : (
            <p className="muted">All four attendance punches are complete for today.</p>
          )}
          <div className="travel-attendance-action">
            <Button onClick={() => setTravelOpen(true)}>On Travel / Submit Proof</Button>
          </div>
        </section>

        <EmployeeQrCode payload={data.qr_payload} />
      </div>

      <section className="block">
        <div className="block-head">
          <h2>Last 30 days</h2>
        </div>
        {data.records.length === 0 ? <Empty title="No attendance history yet" /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Status</th>{PUNCHES.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
              <tbody>{data.records.map((record) => (
                <tr key={record.work_date}>
                  <td>{record.work_date}</td>
                  <td>{record.status === 'travel' ? 'Travel' : record.status}</td>
                  {PUNCHES.map(([slot]) => <td key={slot}>{record[slot] ? fmtDateTime(record[slot]) : '-'}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {travelOpen && (
        <Modal
          title="Submit a travel request"
          onClose={closeTravelForm}
          wide
          footer={
            <>
              <button type="button" className="btn" onClick={closeTravelForm}>Cancel</button>
              <Button type="submit" form="travel-request-form" variant="primary" busy={travelBusy}>Send to HR</Button>
            </>
          }
        >
          <p className="muted">Attach proof for HR to review. Once approved, the requested weekdays will be recorded as Travel attendance, not Absent.</p>
          <form id="travel-request-form" onSubmit={submitTravelRequest} noValidate>
            <div className="row three">
              <TextField label="Start date" type="date" min={localToday()} value={travel.start_date} onChange={setTravelField('start_date')} error={travelErrors.start_date} />
              <TextField label="End date" type="date" min={travel.start_date || localToday()} value={travel.end_date} onChange={setTravelField('end_date')} error={travelErrors.end_date} />
              <TextField label="Workdays" value={weekdaysBetween(travel.start_date, travel.end_date) || ''} readOnly hint="Monday to Friday" />
            </div>
            <TextField as="textarea" rows={3} maxLength={500} label="Purpose / details" value={travel.reason} onChange={setTravelField('reason')} error={travelErrors.reason} />
            <div className="field">
              <label htmlFor="travel-proof">Proof of travel (required)</label>
              <input
                id="travel-proof"
                ref={proofInput}
                className={`input${travelErrors.attachment ? ' invalid' : ''}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setProof(event.target.files[0] || null)}
                aria-invalid={travelErrors.attachment ? 'true' : undefined}
              />
              {travelErrors.attachment
                ? <p className="err" role="alert">{travelErrors.attachment}</p>
                : <p className="hint">PDF, JPG or PNG, up to 2 MB. HR can view the file with your request.</p>}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
