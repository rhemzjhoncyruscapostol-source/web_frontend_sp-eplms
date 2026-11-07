import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { today } from '../format.js';
import { ATTENDANCE } from '../roles.js';
import { Button, Empty, ErrorBox, Loading, PageHeader, useLoad, useToast } from '../components/ui.jsx';

const PUNCHES = [
  ['time_in', 'First in'],
  ['time_out', 'First out'],
  ['time_in_2', 'Second in'],
  ['time_out_2', 'Second out'],
];

function AttendanceQrScanner({ active, onScan }) {
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  const decodedRef = useRef(false);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let scanner;
    decodedRef.current = false;
    setError('');

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode('attendance-qr-reader');
        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cameras.length) throw new Error('No camera is available on this device.');
        const camera = cameras.find((item) => /back|rear|environment/i.test(item.label)) || cameras[0];
        await scanner.start(
          camera.id,
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            if (decodedRef.current) return;
            decodedRef.current = true;
            onScanRef.current(decodedText);
          },
          () => {}
        );
        if (cancelled && scanner.isScanning) await scanner.stop();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not start the camera. Allow camera access and try again.');
      }
    };
    const started = start();

    return () => {
      cancelled = true;
      started.then(async () => {
        if (scanner?.isScanning) await scanner.stop();
      }).catch(() => {});
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="qr-scanner">
      {error && <p className="notice bad" role="alert">{error}</p>}
      <div id="attendance-qr-reader" aria-label="Employee attendance QR scanner" />
      <p className="muted small-print">Camera access requires HTTPS or localhost. Each valid scan records the next punch for today.</p>
    </div>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user.role === 'hr' || user.role === 'mis';
  const [date, setDate] = useState(today());
  const { data, error, loading, reload } = useLoad(() => api.get(`/attendance?date=${date}`), [date]);
  const [entries, setEntries] = useState({});
  const [busy, setBusy] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const scanLock = useRef(false);

  useEffect(() => {
    if (!data) return;
    const next = {};
    data.records.forEach((r) => {
      next[r.employee_id] = {
        status: r.status || (r.approved_leave ? 'on_leave' : ''),
        time_in: r.time_in ? r.time_in.slice(11, 16) : '',
        time_out: r.time_out ? r.time_out.slice(11, 16) : '',
        time_in_2: r.time_in_2 ? r.time_in_2.slice(11, 16) : '',
        time_out_2: r.time_out_2 ? r.time_out_2.slice(11, 16) : '',
        remarks: r.remarks || '',
      };
    });
    setEntries(next);
  }, [data]);

  const setStatus = (id, status) => setEntries((e) => ({ ...e, [id]: { ...e[id], status } }));
  const markAllPresent = () =>
    setEntries((e) => {
      const next = { ...e };
      Object.keys(next).forEach((id) => {
        if (!next[id].status) next[id] = { ...next[id], status: 'present' };
      });
      return next;
    });

  const scan = async (qrPayload) => {
    if (scanLock.current) return;
    scanLock.current = true;
    try {
      const result = await api.post('/attendance/scan', { qr_payload: qrPayload });
      toast(result.message);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      scanLock.current = false;
      setScannerActive(false);
    }
  };

  const save = async () => {
    const list = Object.entries(entries)
      .filter(([, v]) => v.status)
      .map(([id, v]) => ({
        employee_id: Number(id),
        status: v.status,
        time_in: v.time_in,
        time_out: v.time_out,
        time_in_2: v.time_in_2,
        time_out_2: v.time_out_2,
        remarks: v.remarks,
      }));
    if (!list.length) return toast('Choose a status for at least one person.', 'bad');
    setBusy(true);
    try {
      const res = await api.put('/attendance', { date, entries: list });
      toast(res.message);
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Attendance"
        sub={canEdit ? 'Scan an employee QR code to validate their account and record the next daily punch.' : 'View attendance records.'}
        actions={
          <>
            <label className="inline-label">
              Date
              <input className="input" type="date" max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            {canEdit && (
              <Button
                variant="primary"
                onClick={() => {
                  if (scannerActive) setScannerActive(false);
                  else {
                    setDate(today());
                    setScannerActive(true);
                  }
                }}
              >
                {scannerActive ? 'Stop scanner' : 'Scan employee QR'}
              </Button>
            )}
          </>
        }
      />
      {canEdit && <AttendanceQrScanner active={scannerActive} onScan={scan} />}
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.records.length === 0 && <Empty title="No active employees" />}
      {data && data.records.length > 0 && (
        <>
          {canEdit && (
            <div className="toolbar">
              <button className="btn" onClick={markAllPresent}>Mark everyone else present</button>
              <Button variant="primary" busy={busy} onClick={save}>Save attendance</Button>
            </div>
          )}
          <div className="table-wrap">
            <table className="table attendance-table">
              <thead><tr><th>Employee</th><th>Office</th><th>Status</th>{PUNCHES.map(([, label]) => <th key={label}>{label}</th>)}<th>Remarks</th></tr></thead>
              <tbody>
                {data.records.map((r) => {
                  const e = entries[r.employee_id] || { status: '', time_in: '', time_out: '', time_in_2: '', time_out_2: '', remarks: '' };
                  return (
                    <tr key={r.employee_id}>
                      <td><strong>{r.full_name}</strong><br /><span className="muted">{r.job_title}</span></td>
                      <td>{r.department || '-'}</td>
                      <td>
                        <select className="input" disabled={!canEdit} value={e.status} aria-label={`Status for ${r.full_name}`} onChange={(ev) => setStatus(r.employee_id, ev.target.value)}>
                          <option value="">Not recorded</option>
                          {ATTENDANCE.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </td>
                      {PUNCHES.map(([slot, label]) => (
                        <td key={slot}>
                          <input
                            className="input"
                            type="time"
                            disabled={!canEdit}
                            value={e[slot]}
                            aria-label={`${label} for ${r.full_name}`}
                            onChange={(ev) => setEntries((x) => ({ ...x, [r.employee_id]: { ...e, [slot]: ev.target.value } }))}
                          />
                        </td>
                      ))}
                      <td>
                        <input className="input" disabled={!canEdit} maxLength={255} value={e.remarks} aria-label={`Remarks for ${r.full_name}`} onChange={(ev) => setEntries((x) => ({ ...x, [r.employee_id]: { ...e, remarks: ev.target.value } }))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
