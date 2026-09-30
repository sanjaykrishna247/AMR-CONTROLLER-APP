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
  '/': ['Overview', 'Live status of ARCEUX-01'],
  '/navigation': ['Navigation', 'SLAM map, path planning & teleop'],
  '/inspection': ['Inspection Arm', '4-DOF camera manipulator'],
  '/missions': ['Missions', 'Tugging & inspection task queue'],
  '/health': ['System Health', 'Power, drives & ROS 2 nodes'],
};

function Sidebar({ user, onLogout, onNavigate }) {
  const { s } = useRobot();
  const soc = Math.round((s.battery.ah / s.battery.cap) * 100);
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="40" height="40" />
        <div className="sb-brand-text">
          <strong>ARCEUX</strong>
          <span>Robot Control Console</span>
        </div>
      </div>
      <div className="sb-user">
        <div className="sb-avatar">{initials}</div>
        <div className="sb-user-text">
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
      </div>
      <div className="sb-divider" />
      <nav className="sb-nav">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `sb-link${isActive ? ' active' : ''}`}>
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sb-robot">
        <div className="sb-robot-head">
          <span className="sb-robot-name">ARCEUX-01</span>
          <span className={`sb-state ${s.estop ? 'stop' : 'ok'}`}>{s.estop ? 'E-STOP' : s.mode === 'auto' ? 'Auto' : 'Manual'}</span>
        </div>
        <div className="sb-batt">
          <div className="sb-batt-bar"><i style={{ width: `${soc}%` }} className={soc < 20 ? 'low' : ''} /></div>
          <span className="mono">{soc}%</span>
        </div>
        <div className="sb-robot-meta"><Wifi size={13} /> rosbridge · 192.168.0.10</div>
      </div>

      <button className="sb-logout" onClick={onLogout}>
        <LogOut size={20} strokeWidth={2} />
        <span>Log Out</span>
      </button>
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
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>
          <div className="tb-actions">
            <div className="seg" role="group" aria-label="Drive mode">
              <button className={s.mode === 'auto' ? 'on' : ''} onClick={() => setMode('auto')}>Auto</button>
              <button className={s.mode === 'manual' ? 'on' : ''} onClick={() => setMode('manual')}>Manual</button>
            </div>
            <button className={`estop${s.estop ? ' engaged' : ''}`} onClick={toggleEstop}>
              <OctagonX size={18} />
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
