import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate, fmtDateTime, today } from '../format.js';
import { Button, ErrorBox, Loading } from '../components/ui.jsx';

const OPERATOR_EMAIL = 'attendance@system.com';
const PUNCHES = [
  ['time_in', 'First in'],
  ['time_out', 'First out'],
  ['time_in_2', 'Second in'],
  ['time_out_2', 'Second out'],
];
const fmtTime = (value) => value
  ? new Date(String(value).replace(' ', 'T')).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })
  : '—';

function QrScanner({ active, onScan }) {
  const [error, setError] = useState('');
  const [facing, setFacing] = useState('environment');
  const [cameraReady, setCameraReady] = useState(false);
  const onScanRef = useRef(onScan);
  const decodedRef = useRef(false);
  const switchCameraRef = useRef(null);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let scanner;
    let cameras = [];
    let switching = false;
    decodedRef.current = false;
    setError('');
    setCameraReady(false);

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode('attendance-panel-qr-reader');
        cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cameras.length) throw new Error('No camera is available on this device.');
        const startCamera = async (direction) => {
          if (switching || cancelled) return;
          switching = true;
          setCameraReady(false);
          try {
            if (scanner.isScanning) await scanner.stop();
            if (cancelled) return;
            const pattern = direction === 'environment'
              ? /back|rear|environment|world/i
              : /front|user|facetime/i;
            const camera = cameras.find((item) => pattern.test(item.label));
            await scanner.start(
              camera ? camera.id : { facingMode: direction },
              { fps: 10, qrbox: { width: 240, height: 240 } },
              (decodedText) => {
                if (decodedRef.current) return;
                decodedRef.current = true;
                onScanRef.current(decodedText);
              },
              () => {}
            );
            setFacing(direction);
            setCameraReady(true);
            setError('');
          } catch (err) {
            if (!cancelled) setError(err.message || 'Could not switch cameras. Check camera permissions and try again.');
          } finally {
            switching = false;
          }
        };
        switchCameraRef.current = startCamera;
        await startCamera('environment');
        if (cancelled && scanner.isScanning) await scanner.stop();
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not start the camera. Allow camera access and try again.');
      }
    };
    const started = start();
    return () => {
      cancelled = true;
      switchCameraRef.current = null;
      started.then(async () => {
        if (scanner?.isScanning) await scanner.stop();
      }).catch(() => {});
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="attendance-panel-camera">
      {error && <p className="notice bad" role="alert">{error}</p>}
      <div id="attendance-panel-qr-reader" aria-label="Scan employee attendance QR code" />
      <div className="attendance-panel-camera-controls" aria-label="Choose camera">
        <Button type="button" disabled={!cameraReady || facing === 'environment'} aria-pressed={facing === 'environment'} onClick={() => switchCameraRef.current?.('environment')}>Back camera</Button>
        <Button type="button" disabled={!cameraReady || facing === 'user'} aria-pressed={facing === 'user'} onClick={() => switchCameraRef.current?.('user')}>Front camera</Button>
      </div>
      <p className="muted small-print">Camera access requires HTTPS or localhost. Each valid scan records the next punch for today.</p>
    </div>
  );
}

export default function AttendancePanel() {
  const { user, loading: authLoading, logout } = useAuth();
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [employeeNo, setEmployeeNo] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scanLock = useRef(false);

  const reload = async (selectedDate = date) => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await api.get(`/attendance?date=${selectedDate}`));
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'attendance_operator') reload(date);
  }, [user, date]);

  const scan = async (payload) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanBusy(true);
    setResult(null);
    setScannerActive(false);
    try {
      const response = await api.post('/attendance/scan', { qr_payload: payload });
      setResult({ ok: true, message: response.message, employee: response.employee, slot: response.slot, time: response.time });
      setEmployeeNo('');
      setDate(today());
      await reload(today());
    } catch (err) {
      setResult({ ok: false, message: err.message || 'Attendance could not be recorded.' });
    } finally {
      scanLock.current = false;
      setScanBusy(false);
    }
  };

  if (authLoading) return <Loading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'attendance_operator') {
    return (
      <main className="attendance-panel">
        <section className="attendance-panel-card attendance-panel-denied">
          <h1>Attendance operator access required</h1>
          <p>You are signed in with a different account. Sign out before using the dedicated attendance account.</p>
          <Button variant="primary" onClick={logout}>Sign out</Button>
        </section>
      </main>
    );
  }

  const records = data?.records || [];
  const searchTerm = searchQuery.trim().toLocaleLowerCase();
  const filteredRecords = searchTerm
    ? records.filter((record) =>
      [record.full_name, record.employee_no, record.department, record.job_title]
        .some((value) => String(value || '').toLocaleLowerCase().includes(searchTerm))
    )
    : records;
  const punchCount = (record) => PUNCHES.reduce((count, [slot]) => count + (record[slot] ? 1 : 0), 0);
  const recordedCount = records.filter((record) => punchCount(record) > 0).length;
  const completeCount = records.filter((record) => punchCount(record) === PUNCHES.length).length;

  return (
    <main className="attendance-panel">
      <header className="attendance-panel-header">
        <a className="attendance-panel-logo" href="/attendance-panel" aria-label="Attendance panel home">
          <span className="attendance-panel-mark" aria-hidden="true">SP</span>
          <span><strong>SP-EPLMS</strong><small>Attendance station</small></span>
        </a>
        <div className="attendance-panel-header-user">
          <span><strong>Attendance operator</strong><small>{OPERATOR_EMAIL}</small></span>
          <Button onClick={logout}>Sign out</Button>
        </div>
      </header>

      <div className="attendance-panel-content">
        <section className="attendance-panel-heading">
          <div>
            <p className="attendance-panel-eyebrow">Employee timekeeping</p>
            <h1>Attendance station</h1>
            <p>Scan an employee's QR code or enter their employee number to record the next punch.</p>
          </div>
          <label className="attendance-panel-date">
            <span>Records for</span>
            <input className="input" type="date" max={today()} value={date} onChange={(event) => event.target.value && setDate(event.target.value)} />
          </label>
        </section>

        <section className="attendance-panel-stats" aria-label="Attendance summary">
          <article><span>Active employees</span><strong>{loading && !data ? '—' : records.length}</strong></article>
          <article><span>With a punch</span><strong>{loading && !data ? '—' : recordedCount}</strong></article>
          <article><span>Four punches complete</span><strong>{loading && !data ? '—' : completeCount}</strong></article>
        </section>

        <section className="attendance-panel-workspace">
          <div className="attendance-panel-card attendance-panel-scan-card">
            <div className="attendance-panel-card-heading">
              <div><p className="attendance-panel-eyebrow">Quick check-in</p><h2>Scan employee QR</h2></div>
              <span className="attendance-panel-live"><i /> Ready</span>
            </div>
            <p className="muted">The employee must have an active linked account. Each scan records the next of four punches.</p>
            <QrScanner active={scannerActive} onScan={scan} />
            <div className="attendance-panel-scan-actions">
              <Button variant="primary" busy={scanBusy} onClick={() => { setResult(null); setScannerActive((active) => !active); }}>
                {scannerActive ? 'Stop camera' : 'Open camera scanner'}
              </Button>
            </div>
            <form className="attendance-panel-manual" onSubmit={(event) => { event.preventDefault(); if (employeeNo.trim()) scan(employeeNo.trim()); }}>
              <label className="field">
                <span>Or enter employee number</span>
                <input className="input" value={employeeNo} onChange={(event) => setEmployeeNo(event.target.value)} placeholder="e.g. SP-001" autoComplete="off" />
              </label>
              <Button type="submit" busy={scanBusy} disabled={!employeeNo.trim()}>Record next punch</Button>
            </form>
            {result && (
              <div className={`attendance-panel-result ${result.ok ? 'success' : 'failure'}`} role={result.ok ? 'status' : 'alert'}>
                <strong>{result.ok ? 'Attendance recorded' : 'Scan not accepted'}</strong>
                <span>{result.message}</span>
                {result.ok && <small>{result.employee?.employee_no} · {result.slot?.replaceAll('_', ' ')} · {fmtDateTime(result.time)}</small>}
              </div>
            )}
          </div>

          <div className="attendance-panel-card attendance-panel-guide">
            <p className="attendance-panel-eyebrow">Daily sequence</p>
            <h2>Four attendance punches</h2>
            <ol>
              {PUNCHES.map(([, label], index) => <li key={label}><span>{index + 1}</span><div><strong>{label}</strong><small>{index % 2 === 0 ? 'Start of work period' : 'End of work period'}</small></div></li>)}
            </ol>
            <p className="small-print muted">The server validates each QR against an active employee account, then enforces the order and one-punch-per-slot rule.</p>
          </div>
        </section>

        <section className="attendance-panel-card attendance-panel-records">
          <div className="attendance-panel-card-heading">
            <div><p className="attendance-panel-eyebrow">Daily register</p><h2>Employee attendance</h2></div>
            <span className="muted">{fmtDate(date)}</span>
          </div>
          <label className="attendance-panel-search">
            <span className="sr-only">Search attendance records</span>
            <input
              className="input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by employee name, number, office, or title"
              aria-label="Search attendance records"
            />
          </label>
          {loading && !data && <Loading />}
          {loadError && <ErrorBox error={loadError} onRetry={() => reload()} />}
          {data && records.length === 0 && <p className="muted">No active employees found.</p>}
          {data && records.length > 0 && filteredRecords.length === 0 && <p className="muted">No employees match “{searchQuery.trim()}”.</p>}
          {filteredRecords.length > 0 && (
            <div className="table-wrap">
              <table className="table attendance-table">
                <thead><tr><th>Employee</th>{PUNCHES.map(([, label]) => <th key={label}>{label}</th>)}<th>Progress</th></tr></thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.employee_id}>
                      <td><strong>{record.full_name}</strong><br /><span className="muted">{record.job_title}</span></td>
                      {PUNCHES.map(([slot]) => <td key={slot}>{record[slot] ? fmtTime(record[slot]) : <span className="muted">—</span>}</td>)}
                      <td><span className={`attendance-panel-progress ${punchCount(record) === PUNCHES.length ? 'complete' : ''}`}>{punchCount(record)}/{PUNCHES.length}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <footer className="attendance-panel-footer">SP-EPLMS · Attendance actions are validated and recorded by the server.</footer>
      </div>
    </main>
  );
}
