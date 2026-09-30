import { useState } from 'react';
import { Radar, Layers, Tag, X, TriangleAlert, Navigation as NavIcon } from 'lucide-react';
import { useRobot } from '../sim/RobotContext';
import { Card } from '../components/ui';
import FactoryMap from '../components/FactoryMap';
import Joystick from '../components/Joystick';
import { STATIONS, pathLength } from '../sim/world';

export default function Navigation() {
  const { s, goTo, cancelGoal, setTeleop, setMode, setSimSpeed } = useRobot();
  const [lidar, setLidar] = useState(true);
  const [cost, setCost] = useState(false);
  const [labels, setLabels] = useState(true);
  const manual = s.mode === 'manual';
  const remaining = s.goal ? pathLength(s.pose, s.path) : 0;
  const nearest = s.lidar.length ? Math.min(...s.lidar.map((r) => r.d)) : 0;

  return (
    <div className="page">
      <div className="grid g-nav">
        <Card className="map-card" pad={false}
          title="Occupancy map · plant_floor_v3" sub="SLAM Toolbox · 0.4 m cells · Nav2 global planner"
          action={
            <div className="toggles">
              <button className={`chip-t${lidar ? ' on' : ''}`} onClick={() => setLidar(!lidar)}><Radar size={15} /> LiDAR</button>
              <button className={`chip-t${cost ? ' on' : ''}`} onClick={() => setCost(!cost)}><Layers size={15} /> Costmap</button>
              <button className={`chip-t${labels ? ' on' : ''}`} onClick={() => setLabels(!labels)}><Tag size={15} /> Labels</button>
            </div>
          }>
          <div className="map-wrap big">
            <FactoryMap showLidar={lidar} showCostmap={cost} showLabels={labels}
              onPick={manual ? null : (p) => goTo(p, `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`)} />
          </div>
          <div className="map-foot">
            <span className="legend"><i className="lg robot" /> Robot</span>
            <span className="legend"><i className="lg path" /> Planned path</span>
            <span className="legend"><i className="lg lidar" /> LiDAR returns</span>
            <span className="legend"><i className="lg person" /> Person</span>
            <span className="map-hint">{manual ? 'Manual mode — drive with the joystick' : 'Tap the map to set a goal'}</span>
          </div>
        </Card>

        <div className="side-col">
          <Card title="Send to station">
            <div className="stations">
              {STATIONS.map((st) => (
                <button key={st.id} className={`st-btn${s.goal?.label === st.label ? ' on' : ''}`} onClick={() => goTo(st, st.label)}>
                  {st.short}
                </button>
              ))}
            </div>
            {s.goal && (
              <div className="goal-row">
                <NavIcon size={16} />
                <div><b>{s.goal.label}</b><span className="mono">{remaining.toFixed(1)} m · ETA {Math.ceil(remaining / 0.5)} s</span></div>
                <button className="icon-btn sm" onClick={cancelGoal} aria-label="Cancel goal"><X size={16} /></button>
              </div>
            )}
          </Card>

          <Card title="Pose & odometry">
            <dl className="kv">
              <div><dt>x</dt><dd className="mono">{s.pose.x.toFixed(2)}<small>m</small></dd></div>
              <div><dt>y</dt><dd className="mono">{s.pose.y.toFixed(2)}<small>m</small></dd></div>
              <div><dt>θ</dt><dd className="mono">{((s.pose.th * 180) / Math.PI).toFixed(0)}°</dd></div>
              <div><dt>v</dt><dd className="mono">{s.vel.v.toFixed(2)}<small>m/s</small></dd></div>
              <div><dt>ω</dt><dd className="mono">{s.vel.w.toFixed(2)}<small>rad/s</small></dd></div>
              <div><dt>Nearest</dt><dd className="mono">{nearest.toFixed(2)}<small>m</small></dd></div>
            </dl>
            {s.blocked && <div className="alert warn"><TriangleAlert size={16} /> Obstacle in safety zone — robot is holding.</div>}
          </Card>

          <Card title="Teleoperation" sub="Publishes geometry_msgs/Twist on /cmd_vel">
            <div className="teleop">
              <Joystick disabled={!manual || s.estop} onChange={setTeleop} />
              <div className="teleop-side">
                {!manual ? (
                  <>
                    <p className="muted">Joystick is locked while Nav2 is driving.</p>
                    <button className="btn primary sm" onClick={() => setMode('manual')}>Take manual control</button>
                  </>
                ) : (
                  <>
                    <p className="muted">Drag to drive. Release to stop. Collision guard stays active.</p>
                    <button className="btn ghost sm" onClick={() => setMode('auto')}>Hand back to Nav2</button>
                  </>
                )}
                <div className="sim-speed">
                  <span>Sim speed</span>
                  <div className="seg sm">
                    {[1, 2, 4].map((v) => <button key={v} className={s.simSpeed === v ? 'on' : ''} onClick={() => setSimSpeed(v)}>{v}×</button>)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
