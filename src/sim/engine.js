import { planPath, pathLength, isOccupied, stationById, nearestStation, castRay } from './world';
import { SPEC, ARM, ARM_PRESETS, LOADS } from './robot';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let uid = 100;
export const newId = (p = 'M') => `${p}-${++uid}`;

export function createState() {
  const now = Date.now();
  return {
    t: 0,
    mode: 'auto',
    estop: false,
    simSpeed: 1,
    queueRunning: true,
    pose: { x: 1.0, y: 8.8, th: -Math.PI / 2 },
    vel: { v: 0, w: 0 },
    goal: null,
    path: [],
    pathTotal: 0,
    blocked: false,
    payload: 0,
    odo: 128.4,
    battery: { ah: 45 * 0.86, cap: 45, current: 5.4, voltage: 12.3, warned: false },
    motors: { lt: 31, rt: 31, drv: 34 },
    arm: { cur: [...ARM_PRESETS.stow.joints], tgt: [...ARM_PRESETS.stow.joints], seq: null, seqIdx: 0, dwell: 0, preset: 'stow' },
    teleop: { x: 0, y: 0 },
    person: { x: 4, y: 5.2, dir: 1 },
    lidar: [],
    missions: [
      { id: newId(), type: 'tow', from: 'recv', to: 'asm', payload: 120, status: 'queued', stage: 0, created: now },
      { id: newId(), type: 'inspect', at: 'rackA', status: 'queued', stage: 0, created: now },
      { id: newId(), type: 'tow', from: 'asm', to: 'qc', payload: 80, status: 'queued', stage: 0, created: now },
    ],
    activeId: null,
    stageTimer: 0,
    stageEntered: false,
    completed: 6,
    logs: [
      { id: 1, t: now - 60000, level: 'ok', msg: 'ROS 2 Humble graph up · 13 nodes' },
      { id: 2, t: now - 42000, level: 'info', msg: 'Map "plant_floor_v3" loaded from SLAM' },
      { id: 3, t: now - 20000, level: 'info', msg: 'Localised at Charging Dock (AMCL)' },
    ],
    snapshots: [],
  };
}

export function log(s, level, msg) {
  s.logs.push({ id: Date.now() + Math.random(), t: Date.now(), level, msg });
  if (s.logs.length > 80) s.logs.shift();
}

export function missionTitle(m) {
  if (m.type === 'tow') return `Tow ${m.payload} kg · ${stationById(m.from).short} → ${stationById(m.to).short}`;
  if (m.type === 'inspect') return `Inspect ${stationById(m.at).short}`;
  return `Go to ${stationById(m.to).short}`;
}

export function missionStages(m) {
  if (m.type === 'tow') return [
    { nav: m.from, label: 'Drive to pickup' },
    { wait: 2.5, label: 'Couple trolley', end: (s) => { s.payload = m.payload; log(s, 'info', `Trolley coupled · ${m.payload} kg`); } },
    { nav: m.to, label: 'Tow to drop' },
    { wait: 2.5, label: 'Release trolley', end: (s) => { s.payload = 0; log(s, 'info', 'Trolley released'); } },
  ];
  if (m.type === 'inspect') return [
    { nav: m.at, label: 'Drive to site' },
    { wait: 6, label: 'Camera inspection', start: (s) => setPreset(s, 'rack'), mid: (s) => takeSnapshot(s, 'auto') },
    { wait: 2, label: 'Stow arm', start: (s) => setPreset(s, 'stow') },
  ];
  return [{ nav: m.to, label: 'Navigate' }];
}

export function setGoal(s, target, label, adhoc = false) {
  const path = planPath(s.pose, target);
  if (!path) { log(s, 'err', `No path to ${label}`); return false; }
  s.goal = { x: target.x, y: target.y, label, adhoc };
  s.path = path.slice(1);
  s.pathTotal = pathLength(s.pose, s.path);
  return true;
}

export function setPreset(s, name) {
  const p = ARM_PRESETS[name];
  s.arm.preset = name;
  if (p.sequence) { s.arm.seq = p.sequence; s.arm.seqIdx = 0; s.arm.tgt = [...p.sequence[0]]; s.arm.dwell = 0; }
  else { s.arm.seq = null; s.arm.tgt = [...p.joints]; }
}

export function takeSnapshot(s, source = 'manual') {
  const { station, dist } = nearestStation(s.pose.x, s.pose.y);
  s.snapshots.unshift({
    id: newId('IMG'), t: Date.now(), joints: [...s.arm.cur], source,
    where: dist < 1.6 ? station.label : `(${s.pose.x.toFixed(1)}, ${s.pose.y.toFixed(1)})`,
  });
  if (s.snapshots.length > 24) s.snapshots.pop();
  log(s, 'ok', `Frame captured${source === 'auto' ? ' (auto)' : ''} · ${s.snapshots[0].id}`);
}

function stepArm(s, dt) {
  const a = s.arm;
  let settled = true;
  a.cur = a.cur.map((v, i) => {
    const d = a.tgt[i] - v, max = ARM.joints[i].speed * dt;
    if (Math.abs(d) > 0.05) settled = false;
    return Math.abs(d) <= max ? a.tgt[i] : v + Math.sign(d) * max;
  });
  if (a.seq && settled) {
    a.dwell += dt;
    if (a.dwell > 0.6) {
      a.seqIdx++;
      a.dwell = 0;
      if (a.seqIdx >= a.seq.length) { a.seq = null; a.preset = 'stow'; }
      else a.tgt = [...a.seq[a.seqIdx]];
    }
  }
  return settled;
}

function personAhead(s) {
  const { x, y, th } = s.pose, p = s.person;
  const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
  if (d > 1.1) return false;
  return (dx * Math.cos(th) + dy * Math.sin(th)) / d > 0.35;
}

function drive(s, dt) {
  if (!s.path.length) return { v: 0, w: 0, arrived: !!s.goal };
  let tgt = s.path[0];
  if (Math.hypot(tgt.x - s.pose.x, tgt.y - s.pose.y) < 0.15) {
    s.path.shift();
    if (!s.path.length) return { v: 0, w: 0, arrived: true };
    tgt = s.path[0];
  }
  const err = wrap(Math.atan2(tgt.y - s.pose.y, tgt.x - s.pose.x) - s.pose.th);
  const w = clamp(2.4 * err, -SPEC.maxTurn, SPEC.maxTurn);
  const vmax = s.payload ? SPEC.opSpeed : SPEC.maxSpeed;
  let v = Math.abs(err) > 0.7 ? 0 : vmax * Math.cos(err) ** 2;
  v = Math.min(v, pathLength(s.pose, s.path) * 0.9 + 0.08);
  s.blocked = personAhead(s);
  if (s.blocked) v = 0;
  return { v, w: s.blocked ? 0 : w, arrived: false };
}

function stepMission(s, dt) {
  let m = s.missions.find((x) => x.id === s.activeId);
  if (!m && s.queueRunning) {
    m = s.missions.find((x) => x.status === 'queued');
    if (m) {
      m.status = 'active'; m.stage = 0; m.started = Date.now();
      s.activeId = m.id; s.stageEntered = false;
      log(s, 'info', `Mission ${m.id} started · ${missionTitle(m)}`);
    }
  }
  if (!m) return;
  const stages = missionStages(m);
  const st = stages[m.stage];
  if (st.nav) {
    if (!s.goal) {
      const target = stationById(st.nav);
      if (!s.stageEntered) {
        s.stageEntered = true;
        if (!setGoal(s, target, target.label)) { m.status = 'failed'; s.activeId = null; }
      } else {
        // goal cleared: either we arrived or an ad-hoc goal interrupted us
        const d = Math.hypot(target.x - s.pose.x, target.y - s.pose.y);
        if (d < 0.5) advance(s, m, stages);
        else setGoal(s, target, target.label);
      }
    }
  } else {
    if (!s.stageEntered) { s.stageEntered = true; s.stageTimer = 0; m.midDone = false; st.start?.(s); }
    s.stageTimer += dt;
    if (st.mid && !m.midDone && s.stageTimer > st.wait * 0.55) { m.midDone = true; st.mid(s); }
    if (s.stageTimer >= st.wait) { st.end?.(s); advance(s, m, stages); }
  }
}

function advance(s, m, stages) {
  m.stage++;
  s.stageEntered = false;
  if (m.stage >= stages.length) {
    m.status = 'done'; m.finished = Date.now();
    s.activeId = null; s.completed++;
    log(s, 'ok', `Mission ${m.id} complete`);
  }
}

export function missionProgress(s, m) {
  const stages = missionStages(m);
  if (m.status === 'done') return 1;
  if (m.status !== 'active') return 0;
  let frac = 0;
  const st = stages[m.stage];
  if (st?.nav && s.goal && !s.goal.adhoc && s.pathTotal > 0) frac = 1 - pathLength(s.pose, s.path) / s.pathTotal;
  else if (st?.wait && s.stageEntered) frac = Math.min(1, s.stageTimer / st.wait);
  return (m.stage + clamp(frac, 0, 1)) / stages.length;
}

export function step(s, dtReal) {
  const dt = dtReal * s.simSpeed;
  s.t += dt;

  // walking operator in the aisle (dynamic obstacle)
  const p = s.person;
  if (!(Math.hypot(p.x - s.pose.x, p.y - s.pose.y) < 0.7)) p.x += p.dir * 0.45 * dt;
  if (p.x > 9) p.dir = -1;
  if (p.x < 3) p.dir = 1;

  let v = 0, w = 0;
  if (!s.estop) {
    const armMoving = !stepArm(s, dt);
    s.armMoving = armMoving;
    if (s.mode === 'manual') {
      v = -s.teleop.y * (s.payload ? SPEC.opSpeed : SPEC.maxSpeed);
      w = s.teleop.x * SPEC.maxTurn;
      const look = 0.36 * Math.sign(v) + v * dt;
      const nx = s.pose.x + Math.cos(s.pose.th) * look;
      const ny = s.pose.y + Math.sin(s.pose.th) * look;
      s.blocked = v !== 0 && (isOccupied(nx, ny) || (v > 0 && personAhead(s)));
      if (s.blocked) v = 0;
    } else {
      if (!(s.goal && s.goal.adhoc)) stepMission(s, dt);
      if (s.goal) {
        const r = drive(s, dt);
        v = r.v; w = r.w;
        if (r.arrived) {
          log(s, 'ok', `Reached ${s.goal.label}`);
          s.goal = null; s.path = []; s.pathTotal = 0;
        }
      } else s.blocked = false;
    }
  } else s.armMoving = false;

  s.pose.th = wrap(s.pose.th + w * dt);
  s.pose.x += Math.cos(s.pose.th) * v * dt;
  s.pose.y += Math.sin(s.pose.th) * v * dt;
  s.odo += Math.abs(v) * dt;
  s.vel = { v, w };

  // power model (report §3.1.3): fixed loads + motors scaled with speed and towed mass
  const base = LOADS.reduce((a, l) => a + l.amps, 0);
  const motor = (Math.abs(v) > 0.01 ? 1.6 + 6.4 * (Math.abs(v) / SPEC.opSpeed) * ((SPEC.robotMass + s.payload) / (SPEC.robotMass + SPEC.maxTow)) : 0) + Math.abs(w) * 0.8;
  const armI = s.armMoving ? 1.0 : 0.3;
  const target = base + motor + armI;
  s.battery.current += (target - s.battery.current) * Math.min(1, dtReal * 3);
  s.battery.motorI = motor; s.battery.armI = armI;
  s.battery.ah = Math.max(0, s.battery.ah - (s.battery.current * dt) / 3600);
  const soc = s.battery.ah / s.battery.cap;
  s.battery.voltage = 10.6 + 2.0 * soc - s.battery.current * 0.012;
  if (soc < 0.2 && !s.battery.warned) { s.battery.warned = true; log(s, 'warn', 'Battery below 20% — return to dock advised'); }

  const heat = (k, load) => { s.motors[k] += ((28 + load * 2.2) - s.motors[k]) * dtReal * 0.05; };
  heat('lt', motor / 2 + Math.max(0, -w) * 0.5);
  heat('rt', motor / 2 + Math.max(0, w) * 0.5);
  heat('drv', motor * 0.9 + 3);

  const rays = [];
  for (let i = 0; i < 72; i++) {
    const r = castRay(s.pose.x, s.pose.y, s.pose.th + (i / 72) * Math.PI * 2, SPEC.lidarRange, s.person);
    rays.push(r);
  }
  s.lidar = rays;
}
