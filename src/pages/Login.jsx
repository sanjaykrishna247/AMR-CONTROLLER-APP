import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const ROLES = ['Floor Operator', 'Maintenance Engineer', 'Shift Supervisor'];

export default function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErr('Enter your name.');
    if (!/^\d{4}$/.test(pin)) return setErr('PIN must be 4 digits.');
    onLogin({ name: name.trim(), role });
  };

  return (
    <div className="login">
      <div className="login-art">
        <div className="login-brand">
          <span className="brand-mark">A</span>
          <span>AMR Control</span>
        </div>
        <div className="login-copy">
          <h1>One robot for towing, mapping and inspection.</h1>
          <p>Operator console for the Multipurpose Mobile Robot — autonomous intralogistics with an arm-mounted inspection camera, built on ROS 2 and Nav2.</p>
        </div>
        <svg className="login-robot" viewBox="0 0 360 200" aria-hidden>
          <line x1="0" y1="176" x2="360" y2="176" stroke="currentColor" strokeWidth="2" opacity=".35" />
          <rect x="150" y="96" width="170" height="64" rx="10" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="190" y="58" width="120" height="38" rx="4" fill="none" stroke="currentColor" strokeWidth="3" opacity=".7" />
          <circle cx="182" cy="166" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="290" cy="166" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M166 96 V74 L150 34 L178 18" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="166" cy="74" r="5" fill="currentColor" /><circle cx="150" cy="34" r="5" fill="currentColor" />
          <rect x="176" y="10" width="16" height="12" rx="2" fill="currentColor" />
          <path d="M150 128 H110" stroke="currentColor" strokeWidth="3" />
          <rect x="30" y="112" width="80" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 5" />
          <circle cx="44" cy="166" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="96" cy="166" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
        <div className="login-foot">Smart India Hackathon · Robotics & Automation</div>
      </div>

      <form className="login-form" onSubmit={submit}>
        <div className="lf-inner">
          <h2>Sign in to the console</h2>
          <p className="muted">Runs fully on this device — no server needed.</p>
          <label>Operator name
            <input value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="e.g. Meera Nair" autoComplete="name" />
          </label>
          <label>Role
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label>Robot PIN
            <input value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setErr(''); }} placeholder="4 digits" inputMode="numeric" type="password" />
          </label>
          {err && <p className="form-err">{err}</p>}
          <button className="btn primary block lg" type="submit">Connect to AMR-01 <ArrowRight size={18} /></button>
          <button type="button" className="btn ghost block" onClick={() => onLogin({ name: 'Demo Operator', role: ROLES[0] })}>Continue with demo account</button>
        </div>
      </form>
    </div>
  );
}
