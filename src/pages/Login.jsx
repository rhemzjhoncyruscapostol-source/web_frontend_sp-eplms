import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { homeFor } from '../roles.js';
import { Seal } from '../components/Seal.jsx';
import { Button, TextField } from '../components/ui.jsx';
import './Login.css';

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
    <div className="login login-redesign">
      <header className="login-banner">
        <Link className="login-banner-brand" to="/province-home" aria-label="Province of Oriental Mindoro home">
          <span className="login-banner-seal"><Seal size={48} /></span>
          <span className="login-banner-copy">
            <small>PROVINCE OF</small>
            <strong>Oriental Mindoro</strong>
          </span>
        </Link>
        <Link className="login-public-link" to="/province-home">Public homepage <span aria-hidden="true">↗</span></Link>
      </header>

      <main className="login-content">
        <section className="login-side" aria-labelledby="login-welcome-title">
          <div className="login-side-brand"><Seal size={56} /><span>SP-EPLMS</span></div>
          <div className="login-side-copy">
            <p className="login-eyebrow">EMPLOYEE SERVICES PORTAL</p>
            <h1 id="login-welcome-title">People at the heart of public service.</h1>
            <p>One place for employee profiles, leave, attendance, and payroll services of the Sangguniang Panlalawigan.</p>
          </div>
          <div className="login-side-caption"><span aria-hidden="true" /> Serving Oriental Mindoro</div>
        </section>

        <section className="login-form" aria-label={otp ? 'Verification code sign in' : 'Staff sign in'}>
          {!otp ? (
            <form onSubmit={submitCredentials} noValidate>
              <p className="login-eyebrow">STAFF ACCESS</p>
              <h2>Welcome back</h2>
              <p className="login-form-intro">Sign in with your account to continue.</p>
              {error && <div className="notice bad" role="alert"><p>{error}</p></div>}
              <TextField label="Username, email, or Employee ID" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus placeholder="Enter your username or email" />
              <TextField label="Password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" />
              <label className="check">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password
              </label>
              <Button type="submit" variant="primary block" busy={busy} disabled={!identifier || !password}>Sign in <span aria-hidden="true">→</span></Button>
              <button type="button" className="link-btn" onClick={() => setForgot((f) => !f)}>Forgot password?</button>
              {forgot && <p className="muted small-print">Ask MIS to reset it. They will give you a temporary password.</p>}
              <div className="login-security-note">
                <span className="login-security-icon" aria-hidden="true">✓</span>
                <p>HR, Accounting, MIS, and Admin accounts will verify with a 6-digit sign-in code.</p>
              </div>
            </form>
          ) : (
            <form onSubmit={submitCode} noValidate>
              <p className="login-eyebrow">ACCOUNT VERIFICATION</p>
              <h2>Check your inbox</h2>
              <p className="muted otp-note">Enter the 6-digit code sent to <strong>{otp.sent_to}</strong>. It expires in 5 minutes.</p>
              {error && <div className="notice bad" role="alert"><p>{error}</p></div>}
              {info && <div className="notice ok" role="status"><p>{info}</p></div>}
              {otp.dev_code && (
                <div className="notice dev" role="note">
                  <p>Development mode: your code is <strong>{otp.dev_code}</strong>. This is never shown in production.</p>
                </div>
              )}
              <TextField label="6-digit verification code" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoComplete="one-time-code" autoFocus placeholder="000000" />
              <Button type="submit" variant="primary block" busy={busy} disabled={code.length !== 6}>Verify and sign in <span aria-hidden="true">→</span></Button>
              <div className="otp-links">
                <button type="button" className="link-btn" onClick={resend}>Send a new code</button>
                <button type="button" className="link-btn" onClick={back}>Use a different account</button>
              </div>
            </form>
          )}
        </section>
      </main>
      <footer className="login-footer"><span>SP-EPLMS</span><span>Secure employee access</span></footer>
    </div>
  );
}
