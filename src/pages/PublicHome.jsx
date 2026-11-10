import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Loading, useLoad } from '../components/ui.jsx';
import Directory from '../components/Directory.jsx';
import OrgChart from '../components/OrgChart.jsx';
import { Seal } from '../components/Seal.jsx';

const ABOUT_LINKS = [
  ['The Province', '/page/the-province'],
  ['History', '/page/history'],
  ['Investments & Opportunities', '/page/investments-opportunities'],
  ['Cities & Municipalities', '/page/cities-municipalities'],
];

const OFFICIALS_LINKS = [
  ['Governor', '/page/governor'],
  ['Sangguniang Panlalawigan', '/page/sangguniang-panlalawigan'],
  ['Department Heads', '/page/department-heads'],
];

const TRANSPARENCY_LINKS = [
  ['Financial Report', '/page/financial-report'],
  ['Procurement Documents', '/page/procurement-documents'],
  ['Financial Assistance', '/page/financial-assistance'],
  ['Executive Orders', '/page/executive-orders'],
];

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
  const [openMenu, setOpenMenu] = useState(null);
  const [officialsOpen, setOfficialsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    if (!openMenu && !mobileMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!headerRef.current?.contains(event.target)) {
        setOpenMenu(null);
        setOfficialsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setOfficialsOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu, mobileMenuOpen]);

  const openView = (id) => {
    setTab(id);
    document.getElementById('public-information')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="public civic-public">
      <section className="civic-hero" id="home">
        <div className="civic-hero-image" role="img" aria-label="Tropical coastline and green mountains of Oriental Mindoro" />
        <header className="civic-header" ref={headerRef}>
          <Link className="civic-brand" to="/province-home" aria-label="Province of Oriental Mindoro home">
            <span className="civic-seal"><Seal size={48} /></span>
            <span className="civic-brand-copy">
              <small>PROVINCE OF</small>
              <strong>Oriental Mindoro</strong>
            </span>
          </Link>
          <nav id="primary-navigation" className={`civic-nav${mobileMenuOpen ? ' mobile-open' : ''}`} aria-label="Primary site navigation">
            <div className="civic-nav-dropdown">
              <button
                type="button"
                className="civic-nav-trigger"
                aria-expanded={openMenu === 'about'}
                aria-controls="about-menu"
                onClick={() => {
                  setOpenMenu((menu) => (menu === 'about' ? null : 'about'));
                  setOfficialsOpen(false);
                }}
              >
                ABOUT <span className="civic-chevron" aria-hidden="true" />
              </button>
              <div className={`civic-dropdown${openMenu === 'about' ? ' open' : ''}`} id="about-menu" aria-hidden={openMenu !== 'about'}>
                {ABOUT_LINKS.map(([label, href]) => (
                  <Link to={href} key={label} tabIndex={openMenu === 'about' ? 0 : -1}>{label}</Link>
                ))}
                <div className="civic-submenu">
                  <button
                    type="button"
                    className="civic-submenu-trigger"
                    aria-expanded={openMenu === 'about' && officialsOpen}
                    aria-controls="officials-menu"
                    tabIndex={openMenu === 'about' ? 0 : -1}
                    onClick={() => setOfficialsOpen((isOpen) => !isOpen)}
                  >
                    Officials <span className="civic-chevron" aria-hidden="true" />
                  </button>
                  <div className={`civic-dropdown civic-dropdown-nested${openMenu === 'about' && officialsOpen ? ' open' : ''}`} id="officials-menu" aria-hidden={openMenu !== 'about' || !officialsOpen}>
                    {OFFICIALS_LINKS.map(([label, href]) => (
                      <Link to={href} key={label} tabIndex={openMenu === 'about' && officialsOpen ? 0 : -1}>{label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Link to="/page/departments">DEPARTMENTS</Link>
            <div className="civic-nav-dropdown">
              <button
                type="button"
                className="civic-nav-trigger"
                aria-expanded={openMenu === 'transparency'}
                aria-controls="transparency-menu"
                onClick={() => {
                  setOpenMenu((menu) => (menu === 'transparency' ? null : 'transparency'));
                  setOfficialsOpen(false);
                }}
              >
                TRANSPARENCY <span className="civic-chevron" aria-hidden="true" />
              </button>
              <div className={`civic-dropdown${openMenu === 'transparency' ? ' open' : ''}`} id="transparency-menu" aria-hidden={openMenu !== 'transparency'}>
                {TRANSPARENCY_LINKS.map(([label, href]) => (
                  <Link to={href} key={label} tabIndex={openMenu === 'transparency' ? 0 : -1}>{label}</Link>
                ))}
              </div>
            </div>
          </nav>
          <button
            type="button"
            className={`civic-mobile-toggle${mobileMenuOpen ? ' active' : ''}`}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-navigation"
            onClick={() => {
              setMobileMenuOpen((isOpen) => !isOpen);
              setOpenMenu(null);
              setOfficialsOpen(false);
            }}
          >
            <span /><span /><span />
          </button>
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
