import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Button, ErrorBox, Loading, PageHeader, TextField, useLoad, useToast } from '../components/ui.jsx';

export default function SystemSettings() {
  const { user } = useAuth();
  const toast = useToast();
  const canEdit = user.role === 'mis';
  const { data, error, loading, reload } = useLoad(() => api.get('/settings'));
  const [credits, setCredits] = useState({ vacation: '', sick: '', special: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setCredits(data.default_credits);
  }, [data]);

  const save = async () => {
    setBusy(true);
    setErrors({});
    try {
      const res = await api.put('/settings', { default_credits: credits });
      toast(res.message);
      reload();
    } catch (err) {
      setErrors(err.errors || {});
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const n = data.notifications;
  const set = (k) => (e) => setCredits((c) => ({ ...c, [k]: e.target.value }));

  return (
    <>
      <PageHeader title="System Settings" sub={canEdit ? undefined : 'View only.'} />
      <div className="grid-2">
        <section className="panel">
          <h2>Leave credits for new employees</h2>
          <p className="muted small-print">Days given when someone is added. Change a single person's credits in Employee Profiles.</p>
          <div className="row three">
            <TextField label="Vacation" type="number" min="0" step="0.5" value={credits.vacation} onChange={set('vacation')} disabled={!canEdit} />
            <TextField label="Sick" type="number" min="0" step="0.5" value={credits.sick} onChange={set('sick')} disabled={!canEdit} />
            <TextField label="Special Privilege" type="number" min="0" step="0.5" value={credits.special} onChange={set('special')} disabled={!canEdit} />
          </div>
          {errors.default_credits && <p className="err" role="alert">{errors.default_credits}</p>}
          {canEdit && <Button variant="primary" busy={busy} onClick={save}>Save settings</Button>}
        </section>

        <section className="panel">
          <h2>SMS / Email provider</h2>
          <dl className="status-list">
            <div><dt>Log file (runtime/outbox.log)</dt><dd><Badge tone="ok">Always on</Badge></dd></div>
            <div><dt>Email</dt><dd><Badge tone={n.email_enabled ? 'ok' : 'warn'}>{n.email_enabled ? 'Sending' : 'Off'}</Badge></dd></div>
            <div><dt>SMS gateway</dt><dd><Badge tone={n.sms_enabled ? 'ok' : 'warn'}>{n.sms_enabled ? 'Connected' : 'Not connected'}</Badge></dd></div>
            <div><dt>Sign-in codes (OTP)</dt><dd><Badge tone={data.otp.enabled ? 'ok' : 'warn'}>{data.otp.enabled ? 'On' : 'Off'}</Badge></dd></div>
          </dl>
          <p className="muted small-print">Providers are switched on in the server's .env file (MAIL_ENABLED, SMS_WEBHOOK_URL, OTP_ENABLED), not here, so a stolen login cannot redirect sign-in codes.</p>
        </section>

        <section className="panel">
          <h2>Offices</h2>
          <p className="muted small-print">Offices come from the Office field of each employee. Add a new one by typing it when you add or edit an employee.</p>
          <dl className="status-list">
            {data.offices.map((o) => <div key={o.name}><dt>{o.name}</dt><dd>{o.headcount} employee{o.headcount === 1 ? '' : 's'}</dd></div>)}
          </dl>
        </section>
      </div>
    </>
  );
}
