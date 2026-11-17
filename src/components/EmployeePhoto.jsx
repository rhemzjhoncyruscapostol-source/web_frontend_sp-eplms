import { useState } from 'react';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PHOTO_SIZE = 100 * 1024;

export function EmployeePhoto({ photo, name, className = '' }) {
  const initials = (name || '')
    .replace(/^(Hon\.|Atty\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className={`employee-photo ${className}`} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initials}
    </span>
  );
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.naturalWidth * image.naturalHeight > 25000000) {
        reject(new Error('This image is too large to process. Please choose a smaller photo.'));
        return;
      }
      const scale = Math.min(1, 420 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not process this photo in your browser.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const encode = (quality) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not process this photo in your browser.'));
          } else if (blob.size > MAX_PHOTO_SIZE && quality > 0.45) {
            encode(quality - 0.1);
          } else if (blob.size > MAX_PHOTO_SIZE) {
            reject(new Error('This photo is too large after compression. Please choose another image.'));
          } else {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read this photo.'));
            reader.readAsDataURL(blob);
          }
        }, 'image/jpeg', quality);
      };
      encode(0.82);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be opened. Please choose a JPEG, PNG, or WebP photo.'));
    };
    image.src = url;
  });
}

export function EmployeePhotoPicker({ photo, name, error: validationError, onChange }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Choose an image smaller than 8 MB.');
      return;
    }

    setBusy(true);
    try {
      onChange(await resizePhoto(file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="employee-photo-picker">
      <EmployeePhoto photo={photo} name={name} className="large" />
      <div>
        <label className="photo-upload-label">
          {busy ? 'Preparing photo…' : photo ? 'Change photo' : 'Choose photo (optional)'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={busy} />
        </label>
        <p className="muted small-print">JPEG, PNG, or WebP. Photos are resized before saving.</p>
        {photo && <button type="button" className="link-btn" onClick={() => { onChange(null); setError(''); }}>Remove photo</button>}
        {(error || validationError) && <p className="err" role="alert">{error || validationError}</p>}
      </div>
    </div>
  );
}
