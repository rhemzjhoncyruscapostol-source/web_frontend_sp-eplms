import { useEffect, useState } from 'react';
import { ErrorBox, Loading } from './ui.jsx';

export default function EmployeeQrCode({ payload, loading, error, onRetry }) {
  const [image, setImage] = useState('');
  const [generationError, setGenerationError] = useState('');

  useEffect(() => {
    let active = true;
    setImage('');
    setGenerationError('');
    if (!payload) return () => { active = false; };
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(payload, { width: 240, margin: 2, errorCorrectionLevel: 'M' }))
      .then((result) => {
        if (active) setImage(result);
      })
      .catch((err) => {
        if (active) setGenerationError(`Could not create the QR code: ${err.message}`);
      });
    return () => { active = false; };
  }, [payload]);

  return (
    <section className="panel qr-panel">
      <h2>Employee attendance QR code</h2>
      <p className="muted">Show this account-linked code to HR or MIS at the attendance scanner.</p>
      {loading && <Loading label="Loading your QR code" />}
      {error && <ErrorBox error={error} onRetry={onRetry} />}
      {generationError && <p className="err" role="alert">{generationError}</p>}
      {!loading && !error && !payload && <p className="err" role="alert">Your attendance QR code is not available. Please ask HR or MIS for help.</p>}
      {image && (
        <>
          <img className="attendance-qr" src={image} alt="Your employee attendance QR code" />
          <a className="btn small" href={image} download="my-attendance-qr.png">Download QR code</a>
        </>
      )}
    </section>
  );
}
