import { useEffect, useRef, useState } from 'react';
import { Camera, Aperture } from 'lucide-react';
import { useRobot } from '../sim/RobotContext';
import { Card, clock } from '../components/ui';
import CameraFeed from '../components/CameraFeed';
import ArmView from '../components/ArmView';
import Joystick from '../components/Joystick';
import { ARM, ARM_PRESETS } from '../sim/robot';

export default function Inspection() {
  const { s, setJoint, setJoints, preset, snapshot } = useRobot();
  const [zoom, setZoom] = useState(1);
  const [flash, setFlash] = useState(false);
  const joy = useRef({ x: 0, y: 0 });

  // pan/tilt joystick nudges base yaw and camera tilt targets
  useEffect(() => {
    const id = setInterval(() => {
      const { x, y } = joy.current;
      if (!x && !y) return;
      const t = s.arm.tgt;
      if (x) setJoint(0, t[0] + x * 4);
      if (y) setJoint(3, t[3] - y * 3);
    }, 60);
    return () => clearInterval(id);
  }, [s, setJoint]);

  const shoot = () => { snapshot(); setFlash(true); setTimeout(() => setFlash(false), 180); };

  return (
    <div className="page">
      <div className="grid g-insp">
        <Card title="Live inspection feed" sub="Centre a bin label or gauge to read it" pad={false}
          action={
            <div className="seg sm">
              {[1, 2, 4].map((z) => <button key={z} className={zoom === z ? 'on' : ''} onClick={() => setZoom(z)}>{z}×</button>)}
            </div>
          }>
          <div className={`cam-wrap big${flash ? ' flash' : ''}`}>
            <CameraFeed joints={s.arm.cur} zoom={zoom} time={clock(Date.now())} />
          </div>
          <div className="cam-bar">
            <button className="btn primary" onClick={shoot} disabled={s.estop}><Camera size={17} /> Capture frame</button>
            <div className="cam-bar-meta">
              <span>{s.snapshots.length} {s.snapshots.length === 1 ? 'frame' : 'frames'}</span>
              <span className="dot-sep" />
              <span>{s.armMoving ? 'Arm moving' : 'Arm settled'}</span>
            </div>
          </div>
        </Card>

        <Card title="Arm pose" sub="Side view · tap inside the envelope to reach (inverse kinematics)" pad={false}>
          <div className="arm-wrap"><ArmView joints={s.arm.cur} target={s.arm.tgt} onReach={setJoints} /></div>
        </Card>
      </div>

      <div className="grid g-3">
        <Card title="Joint control" sub="4 DOF · Kutzbach DOF = 3(5−1) − 2·4">
          <div className="joints">
            {ARM.joints.map((j, i) => (
              <div key={j.key} className="joint">
                <div className="joint-h">
                  <span className="joint-n">J{i + 1} · {j.name}</span>
                  <span className="mono joint-v">{s.arm.cur[i].toFixed(0)}°</span>
                </div>
                <input type="range" min={j.min} max={j.max} step="1" value={Math.round(s.arm.tgt[i])}
                  onChange={(e) => setJoint(i, +e.target.value)} disabled={s.estop} aria-label={j.name} />
                <div className="joint-f"><span>{j.motor}</span><span>{j.rating}</span></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Posture macros" sub="One-tap multi-joint moves">
          <div className="presets">
            {Object.entries(ARM_PRESETS).map(([k, p]) => (
              <button key={k} className={`preset${s.arm.preset === k ? ' on' : ''}`} onClick={() => preset(k)} disabled={s.estop}>
                <PresetGlyph name={k} />
                <span><b>{p.label}</b><small>{p.hint}</small></span>
              </button>
            ))}
          </div>
          <div className="pantilt">
            <Joystick size={132} onChange={(x, y) => { joy.current = { x, y }; }} disabled={s.estop} labels={['Up', 'Down', 'Pan', 'Pan']} />
            <p className="muted">Pan / tilt nudges the base yaw and camera tilt joints.</p>
          </div>
        </Card>

        <Card title="Captured frames" sub="Stored locally on the operator device">
          {s.snapshots.length === 0 ? (
            <div className="empty"><Aperture size={22} /><p>No frames yet. Capture one or run an inspection mission.</p></div>
          ) : (
            <div className="gallery">
              {s.snapshots.slice(0, 9).map((sn) => (
                <figure key={sn.id}>
                  <CameraFeed joints={sn.joints} hud={false} rec={false} />
                  <figcaption><b className="mono">{sn.id}</b><span>{sn.where} · {clock(sn.t)}</span></figcaption>
                </figure>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function PresetGlyph({ name }) {
  const paths = {
    stow: 'M6 26 H26 M12 26 V20 L16 12 L22 18',
    forward: 'M6 26 H26 M12 26 V20 L18 13 L24 15',
    rack: 'M6 26 H26 M12 26 V20 L14 9 L21 6',
    sweep: 'M6 26 H26 M12 26 V20 L18 16 L22 22',
  };
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" className="pglyph" aria-hidden>
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
