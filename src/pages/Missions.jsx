import { useState } from 'react';
import { Truck, ScanEye, Navigation, Plus, Play, Pause, ChevronUp, ChevronDown, X, Check } from 'lucide-react';
import { useRobot } from '../sim/RobotContext';
import { Card, clock } from '../components/ui';
import { ActiveMission } from './Overview';
import { STATIONS, stationById } from '../sim/world';
import { missionTitle } from '../sim/engine';
import { SPEC } from '../sim/robot';

const TYPES = [
  { key: 'tow', label: 'Tow load', icon: Truck },
  { key: 'inspect', label: 'Inspect', icon: ScanEye },
  { key: 'goto', label: 'Go to', icon: Navigation },
];
const ICON = { tow: Truck, inspect: ScanEye, goto: Navigation };

export default function Missions() {
  const { s, addMission, removeMission, moveMission, toggleQueue, clearDone } = useRobot();
  const [type, setType] = useState('tow');
  const [from, setFrom] = useState('recv');
  const [to, setTo] = useState('qc');
  const [at, setAt] = useState('rackA');
  const [payload, setPayload] = useState(100);

  const active = s.missions.find((m) => m.id === s.activeId);
  const queued = s.missions.filter((m) => m.status === 'queued');
  const history = s.missions.filter((m) => m.status === 'done' || m.status === 'failed').reverse();
  const sameStation = type === 'tow' && from === to;

  const submit = (e) => {
    e.preventDefault();
    if (sameStation) return;
    if (type === 'tow') addMission({ type, from, to, payload });
    else if (type === 'inspect') addMission({ type, at });
    else addMission({ type, to });
  };

  // rough effort estimate: straight-line distance at operating speed
  const est = (() => {
    const a = type === 'tow' ? stationById(from) : null;
    const b = stationById(type === 'inspect' ? at : to);
    const d = a ? Math.hypot(a.x - s.pose.x, a.y - s.pose.y) + Math.hypot(b.x - a.x, b.y - a.y) : Math.hypot(b.x - s.pose.x, b.y - s.pose.y);
    return { d: d * 1.3, t: (d * 1.3) / SPEC.opSpeed + (type === 'tow' ? 5 : type === 'inspect' ? 8 : 0) };
  })();

  return (
    <div className="page">
      <div className="grid g-miss">
        <Card title="Plan a mission" sub="Missions are executed in queue order">
          <form className="mform" onSubmit={submit}>
            <div className="type-pick">
              {TYPES.map(({ key, label, icon: Icon }) => (
                <button type="button" key={key} className={type === key ? 'on' : ''} onClick={() => setType(key)}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>

            {type === 'tow' && (
              <>
                <div className="frow">
                  <label>Pickup<StationSelect value={from} onChange={setFrom} /></label>
                  <label>Drop-off<StationSelect value={to} onChange={setTo} /></label>
                </div>
                <label className="range-l">
                  <span>Trolley payload <b className="mono">{payload} kg</b></span>
                  <input type="range" min="10" max={SPEC.maxTow} step="5" value={payload} onChange={(e) => setPayload(+e.target.value)} />
                  <span className="range-scale"><span>10</span><span>Rated tow limit {SPEC.maxTow} kg</span></span>
                </label>
              </>
            )}
            {type === 'inspect' && <label>Inspection site<StationSelect value={at} onChange={setAt} /></label>}
            {type === 'goto' && <label>Destination<StationSelect value={to} onChange={setTo} /></label>}

            <div className="estimate">
              <div><span>Est. distance</span><b className="mono">{est.d.toFixed(1)} m</b></div>
              <div><span>Est. time</span><b className="mono">{Math.round(est.t)} s</b></div>
              <div><span>Speed cap</span><b className="mono">{type === 'tow' ? SPEC.opSpeed : SPEC.maxSpeed} m/s</b></div>
            </div>
            {sameStation && <p className="form-err">Pickup and drop-off must be different.</p>}
            <button className="btn primary block" type="submit" disabled={sameStation}><Plus size={17} /> Add to queue</button>
          </form>
        </Card>

        <div className="side-col">
          <Card title="Running now" action={
            <button className="btn ghost sm" onClick={toggleQueue}>
              {s.queueRunning ? <><Pause size={15} /> Pause queue</> : <><Play size={15} /> Resume queue</>}
            </button>
          }>
            {active ? <ActiveMission s={s} m={active} /> : <p className="muted">{s.queueRunning ? 'Waiting for the next mission.' : 'Queue is paused.'}</p>}
          </Card>

          <Card title={`Queue · ${queued.length}`}>
            {queued.length === 0 ? <p className="muted">Nothing queued.</p> : (
              <ul className="mlist">
                {queued.map((m, i) => {
                  const Icon = ICON[m.type];
                  return (
                    <li key={m.id}>
                      <span className="m-ic"><Icon size={17} /></span>
                      <div className="m-txt"><b>{missionTitle(m)}</b><span className="mono">{m.id} · queued {clock(m.created)}</span></div>
                      <div className="m-act">
                        <button className="icon-btn sm" disabled={i === 0} onClick={() => moveMission(m.id, -1)} aria-label="Move up"><ChevronUp size={16} /></button>
                        <button className="icon-btn sm" disabled={i === queued.length - 1} onClick={() => moveMission(m.id, 1)} aria-label="Move down"><ChevronDown size={16} /></button>
                        <button className="icon-btn sm danger" onClick={() => removeMission(m.id)} aria-label="Remove"><X size={16} /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Completed" action={history.length > 0 && <button className="link-btn" onClick={clearDone}>Clear</button>}>
            {history.length === 0 ? <p className="muted">Completed missions appear here.</p> : (
              <ul className="mlist done">
                {history.slice(0, 8).map((m) => (
                  <li key={m.id}>
                    <span className={`m-ic ${m.status}`}>{m.status === 'done' ? <Check size={16} /> : <X size={16} />}</span>
                    <div className="m-txt"><b>{missionTitle(m)}</b><span className="mono">{m.id} · {m.finished ? clock(m.finished) : 'failed'}</span></div>
                    {m.started && m.finished && <span className="m-dur mono">{Math.round((m.finished - m.started) / 1000)} s</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StationSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {STATIONS.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
    </select>
  );
}
