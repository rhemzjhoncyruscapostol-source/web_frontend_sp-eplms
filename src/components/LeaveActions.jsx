import { useState } from 'react';
import { api } from '../api.js';
import { fmtRange } from '../format.js';
import { leaveLabel } from '../roles.js';
import { Button, Modal, TextField, useToast } from './ui.jsx';

/** Open a leave attachment in a new tab (the request needs the sign-in token, so we fetch it first). */
export async function openAttachment(id, toast) {
  try {
    const blob = await api.blob(`/leaves/${id}/attachment`);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    toast(err.message, 'bad');
  }
}

/** Approve / reject behaviour shared by the HR dashboard and the Leave Approvals page. */
export function useLeaveReview(onDone) {
  const toast = useToast();
  const [rejecting, setRejecting] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (leave, status, note) => {
    setBusy(true);
    try {
      await api.patch(`/leaves/${leave.id}/review`, { status, remarks: note });
      const requestName = leave.leave_type === 'travel' ? 'Travel request' : 'Leave';
      toast(status === 'approved' ? `${requestName} approved. The employee was notified.` : `${requestName} rejected. The employee was notified.`);
      setRejecting(null);
      setRemarks('');
      onDone();
      window.dispatchEvent(new Event('notifications-changed'));
    } catch (err) {
      setFormError(err.errors && err.errors.remarks ? err.errors.remarks : err.message);
      toast(err.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const modal = rejecting && (
    <Modal
      title={rejecting.leave_type === 'travel' ? 'Reject travel request' : 'Reject leave request'}
      onClose={() => setRejecting(null)}
      footer={
        <>
          <button className="btn" onClick={() => setRejecting(null)}>Keep pending</button>
          <Button variant="danger" busy={busy} onClick={() => decide(rejecting, 'rejected', remarks)}>Reject request</Button>
        </>
      }
    >
      <p>{rejecting.full_name}, {leaveLabel(rejecting.leave_type)}, {fmtRange(rejecting.start_date, rejecting.end_date)}</p>
      <TextField as="textarea" rows={3} maxLength={255} label="Remarks shown to the employee" value={remarks} onChange={(e) => setRemarks(e.target.value)} error={formError} />
    </Modal>
  );

  return {
    busy,
    modal,
    approve: (leave) => decide(leave, 'approved', ''),
    askReject: (leave) => {
      setRejecting(leave);
      setRemarks('');
      setFormError('');
    },
  };
}
