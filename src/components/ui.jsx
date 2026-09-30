export function Card({ title, sub, action, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card-h">
          <div>
            {title && <h2>{title}</h2>}
            {sub && <p>{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? 'card-b' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ icon: Icon, label, value, unit, foot, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-top">
        <span className="stat-ic"><Icon size={17} strokeWidth={1.9} /></span>
        <span className="stat-l">{label}</span>
      </div>
      <div className="stat-v mono">{value}<small>{unit}</small></div>
      {foot && <div className="stat-f">{foot}</div>}
    </div>
  );
}

export function Meter({ value, tone }) {
  return <div className={`meter ${tone || ''}`}><i style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} /></div>;
}

export const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function LogList({ logs, limit = 12 }) {
  return (
    <ul className="logs">
      {logs.slice(-limit).reverse().map((l) => (
        <li key={l.id} className={`log ${l.level}`}>
          <span className="log-dot" />
          <span className="log-msg">{l.msg}</span>
          <time className="mono">{clock(l.t)}</time>
        </li>
      ))}
    </ul>
  );
}
