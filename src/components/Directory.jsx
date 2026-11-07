import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { ErrorBox, Loading, Empty } from './ui.jsx';

/** Read-only employee directory: name, position and office only. Works without signing in. */
export default function Directory() {
  const [q, setQ] = useState('');
  const [office, setOffice] = useState('');
  const [applied, setApplied] = useState({ q: '', office: '' });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [offices, setOffices] = useState([]);
  const requesting = useRef(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let live = true;
    requesting.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = new URLSearchParams({ page, per: 6 });
    if (applied.q) params.set('q', applied.q);
    if (applied.office) params.set('office', applied.office);
    api
      .get(`/directory?${params}`, { auth: false })
      .then((data) => {
        if (!live) return;
        setState((current) => ({
          data: {
            ...data,
            employees: page === 1
              ? data.employees
              : [...(current.data?.employees ?? []), ...data.employees],
          },
          error: null,
          loading: false,
        }));
        setOffices((prev) => (prev.length ? prev : data.offices));
      })
      .catch((error) => {
        if (live) {
          setState((current) => ({ data: page === 1 ? null : current.data, error, loading: false }));
        }
      })
      .finally(() => {
        if (live) requesting.current = false;
      });
    return () => {
      live = false;
      requesting.current = false;
    };
  }, [applied, page]);

  useEffect(() => {
    if (!state.data || state.loading || page >= state.data.pages || !sentinelRef.current) return undefined;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || requesting.current) return;
      requesting.current = true;
      setPage((current) => current + 1);
    }, { rootMargin: '160px' });

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [state.data, state.loading, page]);

  const search = (e) => {
    e.preventDefault();
    requesting.current = false;
    setPage(1);
    setState({ data: null, error: null, loading: true });
    setApplied({ q: q.trim(), office });
  };

  const { data, error, loading } = state;
  const retry = () => {
    requesting.current = false;
    setPage(1);
    setState({ data: null, error: null, loading: true });
    setApplied((current) => ({ ...current }));
  };

  return (
    <section aria-label="Employee directory">
      <form className="dir-search" onSubmit={search}>
        <input className="input" type="search" placeholder="Search by name or position" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search by name or position" />
        <select className="input" value={office} onChange={(e) => setOffice(e.target.value)} aria-label="Office">
          <option value="">Office: All offices</option>
          {offices.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <button className="btn primary" type="submit">Search</button>
      </form>
      {error && <ErrorBox error={error} onRetry={retry} />}
      {loading && !data && <Loading />}
      {data && data.employees.length === 0 && <Empty title="No one found">Try a different name, position or office.</Empty>}
      {data && data.employees.length > 0 && (
        <div className="directory-scroll">
          <ul className="cards" aria-busy={loading}>
            {data.employees.map((e) => (
              <li key={e.id} className="person">
                <div className="node-photo" aria-hidden={!e.photo_url}>
                  {e.photo_url && <img src={e.photo_url} alt={e.full_name} />}
                </div>
                <div className="person-details">
                  <strong>{e.full_name}</strong>
                  <span>{e.job_title}</span>
                  <span className="muted">{e.department || 'Unassigned'}</span>
                </div>
              </li>
            ))}
          </ul>
          {loading && <p className="muted directory-loading" role="status">Loading more employees…</p>}
          <div ref={sentinelRef} aria-hidden="true" />
        </div>
      )}
    </section>
  );
}
