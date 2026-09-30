// Robot parameters taken from the design report (Chapter 3).
export const SPEC = {
  robotMass: 40,          // kg
  maxTow: 150,            // kg
  opSpeed: 0.5,           // m/s with payload
  maxSpeed: 0.6,          // m/s unloaded
  maxTurn: 1.2,           // rad/s
  wheelRadius: 0.12,      // m  (0.5 m/s ≈ 40 RPM)
  motorTorque: 9.5,       // Nm per motor
  motorRpm: 40,
  battery: { volts: 12, ah: 45 },
  runtime: 3.5,           // h at full load
  gradeability: 2,        // deg
  lidarRange: 6,          // m used in sim
};

// Arm: link lengths in cm. L1 = base column, L2/L3/L4 = links from the report.
export const ARM = {
  deck: 34,
  L1: 10, L2: 25, L3: 15, L4: 5,
  joints: [
    { key: 'base', name: 'Base yaw', motor: 'NEMA 17 stepper', rating: '2.94 N·m req.', min: -170, max: 170, speed: 50 },
    { key: 'shoulder', name: 'Shoulder pitch', motor: 'DS Servo 80 kg·cm', rating: '54 kg·cm req.', min: 0, max: 180, speed: 45 },
    { key: 'elbow', name: 'Elbow pitch', motor: 'MG996R 11 kg·cm', rating: '9.5 kg·cm req.', min: -150, max: 150, speed: 70 },
    { key: 'wrist', name: 'Camera tilt', motor: 'SG90 micro servo', rating: '1.32 kg·cm req.', min: -90, max: 90, speed: 90 },
  ],
};

export const ARM_PRESETS = {
  stow: { label: 'Stow', hint: 'Folded for travel', joints: [0, 95, -150, 55] },
  forward: { label: 'Look ahead', hint: 'Camera level, facing forward', joints: [0, 55, -45, -10] },
  rack: { label: 'Rack inspection', hint: 'Lift camera to ~80 cm', joints: [0, 80, -20, -60] },
  sweep: {
    label: 'Ground sweep', hint: 'Pan floor left → right',
    sequence: [[-60, 35, -60, -35], [60, 35, -60, -35], [0, 35, -60, -35], [0, 95, -150, 55]],
  },
};

const rad = (d) => (d * Math.PI) / 180;

// Planar forward kinematics in the arm's vertical plane: r = horizontal reach, z = height above ground (cm).
export function armFK([, t2, t3, t4]) {
  const s = { r: 0, z: ARM.deck + ARM.L1 };
  const a2 = rad(t2), a3 = rad(t2 + t3), a4 = rad(t2 + t3 + t4);
  const e = { r: s.r + ARM.L2 * Math.cos(a2), z: s.z + ARM.L2 * Math.sin(a2) };
  const w = { r: e.r + ARM.L3 * Math.cos(a3), z: e.z + ARM.L3 * Math.sin(a3) };
  const c = { r: w.r + ARM.L4 * Math.cos(a4), z: w.z + ARM.L4 * Math.sin(a4) };
  return { base: { r: 0, z: ARM.deck }, s, e, w, c, pitch: t2 + t3 + t4 };
}

// Inverse kinematics (report §3.2.7) for camera point (r, z) with a desired camera pitch (deg).
export function armIK(r, z, pitchDeg, yaw = 0) {
  const phi = rad(pitchDeg);
  const a = r - ARM.L4 * Math.cos(phi);
  const b = z - (ARM.deck + ARM.L1) - ARM.L4 * Math.sin(phi);
  const D = (a * a + b * b - ARM.L2 ** 2 - ARM.L3 ** 2) / (2 * ARM.L2 * ARM.L3);
  if (Math.abs(D) > 1) return null;
  const t3 = Math.atan2(-Math.sqrt(1 - D * D), D); // elbow-up solution
  const t2 = Math.atan2(b, a) - Math.atan2(ARM.L3 * Math.sin(t3), ARM.L2 + ARM.L3 * Math.cos(t3));
  const d2 = (t2 * 180) / Math.PI, d3 = (t3 * 180) / Math.PI;
  const d4 = pitchDeg - d2 - d3;
  const out = [yaw, d2, d3, d4];
  const ok = out.every((v, i) => v >= ARM.joints[i].min - 0.01 && v <= ARM.joints[i].max + 0.01);
  return ok ? out : null;
}

// Current draw per component (report §3.1.3), amps at 12 V.
export const LOADS = [
  { key: 'pi', label: 'Raspberry Pi 4 B+', amps: 2.0 },
  { key: 'driver', label: 'Cytron driver logic', amps: 0.2 },
  { key: 'lidar', label: 'RPLiDAR A1', amps: 0.5 },
  { key: 'display', label: 'Display & lights', amps: 1.5 },
];
