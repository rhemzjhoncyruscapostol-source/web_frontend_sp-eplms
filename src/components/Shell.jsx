import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { NAV, ROLE_LABEL } from '../roles.js';
import { Seal } from './Seal.jsx';

export default function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV[user.role] || [];
  const [unread, setUnread] = useState(0);
  const hasInbox = items.some((i) => i.to === 'notifications');

  // Keep the unread count on the Notifications link fresh.
  useEffect(() => {
    if (!hasInbox) return undefined;
    let live = true;
    const tick = () =>
      api
        .get('/notifications')
        .then((d) => live && setUnread(d.unread))
        .catch(() => {});
    tick();
    const timer = setInterval(tick, 60000);
    const onChange = () => tick();
    window.addEventListener('notifications-changed', onChange);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener('notifications-changed', onChange);
    };
  }, [hasInbox]);

  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <Seal size={34} />
          <div>
            <strong>SP-EPLMS</strong>
            <span>Role: {ROLE_LABEL[user.role]}</span>
          </div>
        </div>
        <nav aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={`/app/${item.to}`} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
              {item.to === 'notifications' && unread > 0 && <span className="count" aria-label={`${unread} unread`}>{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="who">
          <div>
            <strong>{user.full_name || user.username}</strong>
            <span>{user.job_title || user.email}</span>
          </div>
          <button className="btn ghost small" onClick={signOut}>Log out</button>
        </div>
      </aside>
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
