import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';

// ---------------------------------------------------------------- toasts
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, message, kind }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------- data loading
export function useLoad(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

// ---------------------------------------------------------------- layout bits
export function PageHeader({ title, sub, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatStrip({ items }) {
  return (
    <dl className="stats">
      {items.map((s) => (
        <div key={s.label} className="stat">
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
          {s.note && <p>{s.note}</p>}
        </div>
      ))}
    </dl>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Loading({ label = 'Loading' }) {
  return (
    <p className="muted loading" role="status">
      {label}…
    </p>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="notice bad" role="alert">
      <p>{error && error.message ? error.message : 'Something went wrong.'}</p>
      {onRetry && (
        <button className="btn small" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- badges
const STATUS = {
  pending: { tone: 'warn', label: 'Pending' },
  approved: { tone: 'ok', label: 'Approved' },
  rejected: { tone: 'bad', label: 'Rejected' },
  cancelled: { tone: 'muted', label: 'Cancelled' },
  active: { tone: 'ok', label: 'Active' },
  inactive: { tone: 'muted', label: 'Inactive' },
};
export function StatusBadge({ status }) {
  const s = STATUS[status] || { tone: 'muted', label: status };
  return <span className={`badge ${s.tone}`}>{s.label}</span>;
}

export const Badge = ({ tone = 'muted', children }) => <span className={`badge ${tone}`}>{children}</span>;

// ---------------------------------------------------------------- forms
export function Field({ label, error, hint, htmlFor, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** as="input" | "select" | "textarea" */
export function TextField({ label, error, hint, as = 'input', children, ...props }) {
  const id = useId();
  const Tag = as;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <Tag id={id} className={`input${error ? ' invalid' : ''}`} aria-invalid={error ? 'true' : undefined} {...props}>
        {children}
      </Tag>
    </Field>
  );
}

export function Button({ busy, children, variant = '', ...props }) {
  return (
    <button className={`btn ${variant}`} disabled={busy || props.disabled} {...props}>
      {busy ? 'Please wait…' : children}
    </button>
  );
}

// ---------------------------------------------------------------- modal
export function Modal({ title, onClose, children, footer, wide }) {
  const dialog = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const first = dialog.current && dialog.current.querySelector('input, select, textarea, button');
    (first || dialog.current).focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && previous.focus) previous.focus();
    };
  }, []);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`dialog${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={dialog}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function useConfirm() {
  // Tiny helper: window.confirm keeps the code short and works everywhere.
  return (message) => window.confirm(message);
}
