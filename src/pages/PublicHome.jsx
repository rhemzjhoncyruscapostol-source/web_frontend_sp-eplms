import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Loading, useLoad } from '../components/ui.jsx';
import Directory from '../components/Directory.jsx';
import OrgChart from '../components/OrgChart.jsx';
import { Seal } from '../components/Seal.jsx';

const VIEWS = [
  {
    id: 'directory',
    title: 'People & offices',
  },
  {
    id: 'chart',
    title: 'Organization chart',
  },
];

function Chart() {
  const { data, error, loading, reload } = useLoad(() => api.get('/org-chart', { auth: false }));
  if (loading) return <Loading label="Loading the chart" />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return <OrgChart employees={data.employees} fit />;
}

function Arrow() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

/** Read-only public portal for provincial directory and organizational information. */
export default function PublicHome() {
  const [tab, setTab] = useState('directory');

  const openView = (id) => {
    setTab(id);
    document.getElementById('public-information')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="public civic-public">
      <section className="civic-hero" id="home">
        <div className="civic-hero-image" role="img" aria-label="Tropical coastline and green mountains of Oriental Mindoro" />
        <header className="civic-header">
          <Link className="civic-brand" to="/province-home" aria-label="Province of Oriental Mindoro home">
            <span className="civic-seal"><Seal size={48} /></span>
            <span className="civic-brand-copy">
              <small>PROVINCE OF</small>
              <strong>Oriental Mindoro</strong>
            </span>
          </Link>
          <Link className="civic-login" to="/login">Staff sign in <Arrow /></Link>
        </header>

        <h1 className="civic-hero-title">THE 12<sup>th</sup> SANGGUNIANG PANLALAWIGAN</h1>
      </section>

      <main id="content" className="civic-main">
        <nav className="civic-shortcuts" aria-label="Public information shortcuts">
          {VIEWS.map((view) => (
            <button
              type="button"
              className="btn small civic-shortcut"
              key={view.id}
              onClick={() => openView(view.id)}
            >
              {view.title}
            </button>
          ))}
        </nav>
        <section className="civic-directory" id="public-information" aria-label={tab === 'directory' ? 'Employee directory' : 'Organization chart'}>
          <div className={`civic-data-panel${tab !== 'directory' ? ' civic-data-panel--chart' : ' civic-data-panel--plain'}`}>
            {tab === 'directory' && <Directory />}
            {tab === 'chart' && <Chart />}
          </div>
        </section>
      </main>

      <footer className="civic-footer">
        <a className="civic-brand civic-footer-brand" href="#home">
          <span className="civic-seal"><Seal size={38} /></span>
          <span className="civic-brand-copy"><small>PROVINCE OF</small><strong>Oriental Mindoro</strong></span>
        </a>
        <span className="civic-footer-note">Serving our people. Building our future.</span>
        <Link to="/login">Staff sign in <Arrow /></Link>
      </footer>
    </div>
  );
}
