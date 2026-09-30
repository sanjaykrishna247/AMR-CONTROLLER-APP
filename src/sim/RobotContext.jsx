import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createState, step, log, setGoal, setPreset, takeSnapshot, newId, missionTitle } from './engine';
import { ARM } from './robot';

const Ctx = createContext(null);

export function RobotProvider({ children }) {
  const ref = useRef(null);
  if (!ref.current) ref.current = createState();
  const [, setTick] = useState(0);

  useEffect(() => {
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      step(ref.current, Math.min(0.25, (now - last) / 1000));
      last = now;
      setTick((t) => t + 1);
    }, 80);
    return () => clearInterval(id);
  }, []);

  const api = useMemo(() => {
    const s = () => ref.current;
    const bump = () => setTick((t) => t + 1);
    const act = (fn) => (...args) => { fn(s(), ...args); bump(); };
    return {
      setMode: act((st, mode) => {
        if (st.mode === mode) return;
        st.mode = mode; st.teleop = { x: 0, y: 0 };
        if (mode === 'manual') { st.goal = null; st.path = []; }
        log(st, 'info', mode === 'manual' ? 'Manual teleoperation enabled' : 'Autonomous mode resumed');
      }),
      toggleEstop: act((st) => {
        st.estop = !st.estop;
        log(st, st.estop ? 'err' : 'ok', st.estop ? 'EMERGENCY STOP engaged' : 'E-stop released · systems armed');
      }),
      setSimSpeed: act((st, v) => { st.simSpeed = v; }),
      goTo: act((st, pt, label = 'map point') => {
        if (st.mode !== 'auto') { st.mode = 'auto'; }
        if (setGoal(st, pt, label, true)) log(st, 'info', `Navigation goal → ${label}`);
      }),
      cancelGoal: act((st) => { if (st.goal) log(st, 'warn', 'Navigation goal cancelled'); st.goal = null; st.path = []; }),
      toggleQueue: act((st) => { st.queueRunning = !st.queueRunning; log(st, 'info', st.queueRunning ? 'Mission queue running' : 'Mission queue paused'); }),
      addMission: act((st, m) => {
        const mission = { ...m, id: newId(), status: 'queued', stage: 0, created: Date.now() };
        st.missions.push(mission);
        log(st, 'info', `Queued ${mission.id} · ${missionTitle(mission)}`);
      }),
      removeMission: act((st, id) => {
        if (st.activeId === id) { st.activeId = null; st.goal = null; st.path = []; st.payload = 0; }
        st.missions = st.missions.filter((m) => m.id !== id);
      }),
      moveMission: act((st, id, dir) => {
        const q = st.missions;
        const i = q.findIndex((m) => m.id === id), j = i + dir;
        if (j < 0 || j >= q.length || q[j].status !== 'queued') return;
        [q[i], q[j]] = [q[j], q[i]];
      }),
      clearDone: act((st) => { st.missions = st.missions.filter((m) => m.status !== 'done' && m.status !== 'failed'); }),
      setJoint: act((st, i, val) => {
        st.arm.seq = null; st.arm.preset = null;
        st.arm.tgt[i] = Math.max(ARM.joints[i].min, Math.min(ARM.joints[i].max, val));
      }),
      setJoints: act((st, js) => { st.arm.seq = null; st.arm.preset = null; st.arm.tgt = [...js]; }),
      preset: act((st, name) => { setPreset(st, name); log(st, 'info', `Arm macro: ${name}`); }),
      setTeleop: (x, y) => { s().teleop = { x, y }; },
      snapshot: act((st) => takeSnapshot(st)),
    };
  }, []);

  return <Ctx.Provider value={{ s: ref.current, ...api }}>{children}</Ctx.Provider>;
}

export const useRobot = () => useContext(Ctx);
