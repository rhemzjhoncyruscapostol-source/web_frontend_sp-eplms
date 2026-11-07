import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { fmtDate, fmtRange } from '../format.js';
import { leaveLabel } from '../roles.js';
import { openAttachment, useLeaveReview } from '../components/LeaveActions.jsx';
import { Empty, ErrorBox, Loading, PageHeader, StatusBadge, useLoad, useToast } from '../components/ui.jsx';

const FILTERS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['', 'All'],
];

export default function Leaves() {
  const { user } = useAuth();
  const toast = useToast();
  const canReview = user.role === 'hr' || user.role === 'mis';
  const [status, setStatus] = useState('pending');
  const { data, error, loading, reload } = useLoad(() => api.get(`/leaves${status ? `?status=${status}` : ''}`), [status]);
  const review = useLeaveReview(reload);

  return (
    <>
      <PageHeader
        title="Leave & Travel Approvals"
        sub={canReview ? 'Review leave and travel requests, including attached proof. Employees are notified by SMS/email and in the app.' : 'View only.'}
        actions={
          <div className="segmented" role="group" aria-label="Filter by status">
            {FILTERS.map(([value, label]) => (
              <button key={label} className={status === value ? 'on' : ''} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</button>
            ))}
          </div>
        }
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.leaves.length === 0 && <Empty title="Nothing here">No {status || ''} leave requests.</Empty>}
      {data && data.leaves.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Employee</th><th>Office</th><th>Type</th><th>Dates</th><th className="num">Days</th><th>Reason</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.leaves.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.full_name}</strong><br /><span className="muted">{l.job_title}</span></td>
                  <td>{l.department || '-'}</td>
                  <td>{leaveLabel(l.leave_type)}</td>
                  <td>{fmtRange(l.start_date, l.end_date)}</td>
                  <td className="num">{l.days}</td>
                  <td className="wrap">{l.reason}{l.review_remarks && <div className="remark">{l.review_remarks}</div>}</td>
                  <td>
                    <StatusBadge status={l.status} />
                    {l.reviewed_at && <div className="muted small-print">{l.reviewed_by_name}, {fmtDate(l.reviewed_at)}</div>}
                  </td>
                  <td className="row-actions">
                    {l.has_attachment && <button className="btn small" onClick={() => openAttachment(l.id, toast)}>View file</button>}
                    {canReview && l.status === 'pending' && (
                      <>
                        <button className="btn small primary" disabled={review.busy} onClick={() => review.approve(l)}>Approve</button>
                        <button className="btn small danger" disabled={review.busy} onClick={() => review.askReject(l)}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {review.modal}
    </>
  );
}
