import { useState } from 'react';
import { api } from '../api.js';
import { fmtDateTime } from '../format.js';
import { ROLE_LABEL } from '../roles.js';
import { Empty, ErrorBox, Loading, PageHeader, useLoad } from '../components/ui.jsx';

export default function AuditLog() {
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useLoad(() => api.get(`/audit?page=${page}&per=25${applied ? `&q=${encodeURIComponent(applied)}` : ''}`), [page, applied]);

  const search = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied(q.trim());
  };

  return (
    <>
      <PageHeader title="Audit Log" sub="Sign-ins, approvals and record changes. Entries cannot be edited from the app." />
      <form className="toolbar" onSubmit={search}>
        <input className="input grow" type="search" placeholder="Search by user, action or detail" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the audit log" />
        <button className="btn" type="submit">Search</button>
      </form>
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.entries.length === 0 && <Empty title="No entries" />}
      {data && data.entries.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>IP</th></tr></thead>
              <tbody>
                {data.entries.map((a) => (
                  <tr key={a.id}>
                    <td className="nowrap">{fmtDateTime(a.created_at)}</td>
                    <td>{a.username || '-'}</td>
                    <td>{ROLE_LABEL[a.role] || '-'}</td>
                    <td className="wrap"><strong>{a.action}</strong><br /><span className="muted">{a.detail}</span></td>
                    <td className="muted">{a.ip || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <nav className="pager" aria-label="Pages">
              <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span className="muted">Page {data.page} of {data.pages}</span>
              <button className="btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
