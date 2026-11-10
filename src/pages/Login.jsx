import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { homeFor } from '../roles.js';
import { Seal } from '../components/Seal.jsx';
import { Button, TextField } from '../components/ui.jsx';

export default function Login() {
  const { user, loading, login, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [otp, setOtp] = useState(null); // { challenge, sent_to, dev_code }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  if (!loading && user) return <Navigate to={homeFor(user.role)} replace />;

  const fail = (err) => {
    setError(err.message);
    setBusy(false);
  };

  const submitCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(identifier.trim(), password);
      if (result.otp_required) {
        setOtp(result);
        setCode('');
        setBusy(false);
      } else {
        navigate(homeFor(result.role), { replace: true });
      }
    } catch (err) {
      fail(err);
    }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await verifyOtp(otp.challenge, code);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      fail(err);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      const res = await api.post('/auth/resend-otp', { challenge: otp.challenge }, { auth: false });
      setInfo(res.message);
      if (res.dev_code) setOtp((o) => ({ ...o, dev_code: res.dev_code }));
    } catch (err) {
      setError(err.message);
    }
  };

  const back = () => {
    setOtp(null);
    setPassword('');
    setError('');
    setInfo('');
  };

  return (
    <div className="login">
      <header className="login-banner">
        <Link className="login-banner-brand" to="/province-home" aria-label="Province of Oriental Mindoro home">
          <span className="login-banner-seal"><Seal size={48} /></span>
          <span className="login-banner-copy">
            <small>PROVINCE OF</small>
            <strong>Oriental Mindoro</strong>
          </span>
        </Link>
      </header>
      <section className="login-side">
        <Seal size={64} />
        <h1>SP-EPLMS</h1>
        <p>Sangguniang Panlalawigan Employee Profile and Leave Management System.</p>
      </section>

      <section className="login-form">
        {!otp ? (
          <form onSubmit={submitCredentials} noValidate>
            <h2>SP-EPLMS Sign in</h2>
            {error && <div className="notice bad" role="alert"><p>{error}</p></div>}
            <TextField label="Username / Employee ID" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus placeholder="username" />
            <TextField label="Password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="password" />
            <label className="check">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
            </label>
            <Button type="submit" variant="primary block" busy={busy} disabled={!identifier || !password}>Sign in</Button>
            <button type="button" className="link-btn" onClick={() => setForgot((f) => !f)}>Forgot password?</button>
            {forgot && <p className="muted small-print">Ask MIS to reset it. They will give you a temporary password.</p>}
            <p className="muted small-print">HR, Accounting, MIS and Admin accounts also enter a 6-digit code after the password.</p>
          </form>
        ) : (
          <form onSubmit={submitCode} noValidate>
            <h2>Enter your code</h2>
            <p className="muted otp-note">We sent a 6-digit code to {otp.sent_to}. It expires in 5 minutes.</p>
            {error && <div className="notice bad" role="alert"><p>{error}</p></div>}
            {info && <div className="notice ok" role="status"><p>{info}</p></div>}
            {otp.dev_code && (
              <div className="notice dev" role="note">
                <p>Development mode: your code is <strong>{otp.dev_code}</strong>. This is never shown in production.</p>
              </div>
            )}
            <TextField label="OTP code" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" autoFocus placeholder="6-digit code sent by SMS/Email" />
            <Button type="submit" variant="primary block" busy={busy} disabled={code.length !== 6}>Sign in</Button>
            <div className="otp-links">
              <button type="button" className="link-btn" onClick={resend}>Send a new code</button>
              <button type="button" className="link-btn" onClick={back}>Use a different account</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
