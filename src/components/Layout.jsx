import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPinned, ScanEye, ListChecks, HeartPulse, LogOut, Menu, X, OctagonX, Wifi } from 'lucide-react';
import { useRobot } from '../sim/RobotContext';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/navigation', label: 'Navigation', icon: MapPinned },
  { to: '/inspection', label: 'Inspection Arm', icon: ScanEye },
  { to: '/missions', label: 'Missions', icon: ListChecks },
  { to: '/health', label: 'System Health', icon: HeartPulse },
];

const TITLES = {
  '/': ['Overview', 'Live status of AMR-01'],
  '/navigation': ['Navigation', 'SLAM map, path planning & teleop'],
  '/inspection': ['Inspection Arm', '4-DOF camera manipulator'],
  '/missions': ['Missions', 'Tugging & inspection task queue'],
  '/health': ['System Health', 'Power, drives & ROS 2 nodes'],
};

const AVATAR_TONES = ['#E8DCCB', '#D5E3D6', '#D7DDEA', '#E6D5DE', '#E3DFCB', '#D3E2E3'];

function Avatar({ name }) {
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const tone = AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className="sb-avatar" style={{ background: tone }}>
      {initials}
      <i className="sb-online" aria-hidden />
    </span>
  );
}

function Sidebar({ user, onLogout, onNavigate }) {
  const { s } = useRobot();
  const soc = Math.round((s.battery.ah / s.battery.cap) * 100);
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <span className="sb-logo" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 13h14v5H5zM8 13V9l-1.5-3.5L10 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="8" cy="19.5" r="1.6" fill="currentColor" /><circle cx="16" cy="19.5" r="1.6" fill="currentColor" /></svg>
        </span>
        <div className="sb-brand-text">
          <strong>AMR Control</strong>
          <span>Plant floor · Bay 3</span>
        </div>
      </div>

      <div className="sb-section">Operations</div>
      <nav className="sb-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
            <Icon size={17} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sb-robot">
        <div className="sb-robot-head">
          <span className="sb-robot-name">AMR-01</span>
          <span className={`sb-state ${s.estop ? 'stop' : 'ok'}`}>{s.estop ? 'E-STOP' : s.mode === 'auto' ? 'Auto' : 'Manual'}</span>
        </div>
        <div className="sb-batt">
          <div className="sb-batt-bar"><i style={{ width: `${soc}%` }} className={soc < 20 ? 'low' : ''} /></div>
          <span className="mono">{soc}%</span>
        </div>
        <div className="sb-robot-meta"><Wifi size={12} /> rosbridge · 192.168.0.10</div>
      </div>

      <div className="sb-profile">
        <Avatar name={user.name} />
        <div className="sb-user-text">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
        <button className="sb-logout" onClick={onLogout} title="Log out" aria-label="Log out">
          <LogOut size={16} strokeWidth={1.9} />
        </button>
      </div>
    </aside>
  );
}

export default function Layout({ user, onLogout }) {
  const { s, toggleEstop, setMode } = useRobot();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const [title, sub] = TITLES[loc.pathname] || TITLES['/'];

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const logout = () => { onLogout(); nav('/'); };

  return (
    <div className={`shell${open ? ' drawer-open' : ''}`}>
      <Sidebar user={user} onLogout={logout} onNavigate={() => setOpen(false)} />
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="tb-title">
            <div className="crumbs"><span>AMR-01</span><span className="crumb-sep">/</span><h1>{title}</h1></div>
            <p>{sub}</p>
          </div>
          <div className="tb-actions">
            <div className="seg" role="group" aria-label="Drive mode">
              <button className={s.mode === 'auto' ? 'on' : ''} onClick={() => setMode('auto')}>Auto</button>
              <button className={s.mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>Manual</button>
            </div>
            <button className={`estop${s.estop ? ' engaged' : ''}`} onClick={toggleEstop}>
              <OctagonX size={16} />
              <span>{s.estop ? 'Release' : 'E-Stop'}</span>
            </button>
          </div>
        </header>
        {s.estop && (
          <div className="estop-banner">
            <OctagonX size={16} /> Emergency stop engaged — drive motors and arm are de-energised.
            <button onClick={toggleEstop}>Release</button>
          </div>
        )}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
