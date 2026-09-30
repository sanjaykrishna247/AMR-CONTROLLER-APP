import { Link, useNavigate } from 'react-router-dom';
import { BatteryMedium, Package, Gauge, ListChecks, House, Play, Pause, ArrowUpRight, Route, Camera } from 'lucide-react';
import { useRobot } from '../sim/RobotContext';
import { Card, Stat, Meter, LogList } from '../components/ui';
import FactoryMap from '../components/FactoryMap';
import CameraFeed from '../components/CameraFeed';
import { missionStages, missionTitle, missionProgress } from '../sim/engine';
import { stationById, nearestStation } from '../sim/world';
import { SPEC, ARM_PRESETS } from '../sim/robot';

export function statusLine(s) {
  if (s.estop) return { text: 'Stopped — emergency stop engaged', tone: 'stop' };
  if (s.mode === 'manual') return { text: s.blocked ? 'Manual drive — path blocked' : 'Manual teleoperation', tone: 'info' };
  const m = s.missions.find((x) => x.id === s.activeId);
  if (s.blocked) return { text: 'Yielding to operator in aisle', tone: 'warn' };
  if (s.goal?.adhoc) return { text: `Navigating to ${s.goal.label}`, tone: 'ok' };
  if (m) return { text: missionStages(m)[m.stage]?.label + ' · ' + missionTitle(m), tone: 'ok' };
  const { station, dist } = nearestStation(s.pose.x, s.pose.y);
  return { text: `Idle${dist < 0.8 ? ` at ${station.label}` : ''}`, tone: 'idle' };
}

export default function Overview() {
  const { s, goTo, toggleQueue, preset, snapshot } = useRobot();
  const nav = useNavigate();
  const soc = s.battery.ah / s.battery.cap;
  const runtime = s.battery.ah / Math.max(4, s.battery.current);
  const st = statusLine(s);
  const active = s.missions.find((m) => m.id === s.activeId);
  const queued = s.missions.filter((m) => m.status === 'queued');
  const dock = stationById('dock');

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-id">
          <div className="hero-badge">
            <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden>
              <rect x="6" y="20" width="36" height="16" rx="4" fill="currentColor" opacity=".9" />
              <circle cx="14" cy="38" r="4" fill="currentColor" /><circle cx="34" cy="38" r="4" fill="currentColor" />
              <path d="M16 20 V12 L26 7 L32 11" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="30" y="8" width="8" height="6" rx="1.5" fill="currentColor" />
            </svg>
          </div>
          <div>
            <div className="hero-kicker">Multipurpose Mobile Robot · Bay 3</div>
            <h2 className="hero-name">MMR-01</h2>
            <div className={`hero-status ${st.tone}`}><span className="pulse" />{st.text}</div>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn ghost" onClick={() => goTo(dock, dock.label)}><House size={16} /> Return to dock</button>
          <button className="btn primary" onClick={toggleQueue}>
            {s.queueRunning ? <><Pause size={16} /> Pause queue</> : <><Play size={16} /> Run queue</>}
          </button>
        </div>
      </section>

      <div className="stats">
        <Stat icon={BatteryMedium} label="Battery" value={Math.round(soc * 100)} unit="%" tone={soc < 0.2 ? 'bad' : 'c-teal'}
          foot={<><Meter value={soc} /><span className="mono">{runtime.toFixed(1)} h left · {s.battery.voltage.toFixed(1)} V</span></>} />
        <Stat icon={Package} label="Towed payload" value={s.payload} unit={` / ${SPEC.maxTow} kg`} tone="c-orange"
          foot={<><Meter value={s.payload / SPEC.maxTow} /><span>{s.payload ? 'Trolley coupled' : 'No trolley attached'}</span></>} />
        <Stat icon={Gauge} label="Speed" value={Math.abs(s.vel.v).toFixed(2)} unit=" m/s" tone="c-blue"
          foot={<span className="mono">{s.odo.toFixed(1)} m driven today</span>} />
        <Stat icon={ListChecks} label="Missions" value={s.completed} unit={` done`} tone="c-violet"
          foot={<span>{queued.length} queued · {active ? '1 running' : 'none running'}</span>} />
      </div>

      <div className="grid g-map">
        <Card title="Live floor map" sub="Tap anywhere to send the robot there"
          action={<Link to="/navigation" className="link-btn">Open <ArrowUpRight size={15} /></Link>} pad={false}>
          <div className="map-wrap"><FactoryMap compact onPick={(p) => goTo(p, `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`)} /></div>
        </Card>
        <Card title="Inspection camera" sub="Arm-mounted, streamed via web_video_server"
          action={<Link to="/inspection" className="link-btn">Control <ArrowUpRight size={15} /></Link>} pad={false}>
          <div className="cam-wrap" onClick={() => nav('/inspection')} title="Open inspection controls"><CameraFeed joints={s.arm.cur} /></div>
          <div className="cam-foot">
            <span>Arm preset <b>{s.arm.preset ? ARM_PRESETS[s.arm.preset].label : 'Custom'}</b></span>
            <span>{s.snapshots.length} {s.snapshots.length === 1 ? 'frame' : 'frames'} captured</span>
          </div>
          <div className="cam-quick">
            {['stow', 'forward', 'rack'].map((k) => (
              <button key={k} className={`btn sm ${s.arm.preset === k ? 'primary' : 'ghost'}`} onClick={() => preset(k)} disabled={s.estop}>{ARM_PRESETS[k].label}</button>
            ))}
            <button className="btn sm ghost" onClick={snapshot} disabled={s.estop}><Camera size={15} /> Capture</button>
          </div>
        </Card>
      </div>

      <div className="grid g-2">
        <Card title="Current mission" action={<Link to="/missions" className="link-btn">Queue <ArrowUpRight size={15} /></Link>}>
          {active ? <ActiveMission s={s} m={active} /> : (
            <div className="empty">
              <Route size={22} />
              <p>{queued.length ? (s.queueRunning ? 'Starting next mission…' : 'Queue paused.') : 'No missions queued.'}</p>
              <Link to="/missions" className="btn ghost sm">Plan a mission</Link>
            </div>
          )}
        </Card>
        <Card title="Activity">
          <LogList logs={s.logs} limit={7} />
        </Card>
      </div>
    </div>
  );
}

export function ActiveMission({ s, m }) {
  const stages = missionStages(m);
  const p = missionProgress(s, m);
  return (
    <div className="active-m">
      <div className="am-head">
        <span className="tag mono">{m.id}</span>
        <strong>{missionTitle(m)}</strong>
      </div>
      <Meter value={p} />
      <ol className="stepper">
        {stages.map((st, i) => (
          <li key={i} className={i < m.stage ? 'done' : i === m.stage ? 'now' : ''}>
            <span className="st-dot">{i + 1}</span>
            <span>{st.label}{st.nav ? ` · ${stationById(st.nav).short}` : ''}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
