import { api } from '../api.js';
import { fmtDateTime } from '../format.js';
import { useNavigate } from 'react-router-dom';
import { Empty, ErrorBox, Loading, PageHeader, useLoad, useToast } from '../components/ui.jsx';

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.get('/notifications'));
  const changed = () => window.dispatchEvent(new Event('notifications-changed'));

  const markAll = async () => {
    await api.post('/notifications/read-all');
    reload();
    changed();
  };
  const openNotification = async (n) => {
    try {
      if (!n.is_read) {
        await api.post(`/notifications/${n.id}/read`);
        reload();
        changed();
      }
      const destination = typeof n.action_url === 'string' && n.action_url.startsWith('/app/')
        ? n.action_url
        : n.title === 'Salary posted'
          ? `/app/my-salary${n.body.match(/\d{4}-\d{2}/) ? `?period=${n.body.match(/\d{4}-\d{2}/)[0]}` : ''}`
          : n.title.startsWith('Leave ')
            ? '/app/my-leaves'
            : n.title === 'Credits updated'
              ? '/app/my-profile'
              : '/app/notifications';
      navigate(destination);
    } catch (err) {
      toast(err.message, 'bad');
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        sub="Also sent by SMS or email when those are set up."
        actions={data && data.unread > 0 && <button className="btn" onClick={markAll}>Mark all as read</button>}
      />
      {loading && !data && <Loading />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.notifications.length === 0 && <Empty title="No notifications yet" />}
      {data && data.notifications.length > 0 && (
        <ul className="notif-list">
          {data.notifications.map((n) => (
            <li key={n.id} className={n.is_read ? '' : 'unread'}>
              <button onClick={() => openNotification(n)} aria-label={`Open ${n.title}${n.is_read ? '' : ' (unread)'}`}>
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <span className="muted small-print">{fmtDateTime(n.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
