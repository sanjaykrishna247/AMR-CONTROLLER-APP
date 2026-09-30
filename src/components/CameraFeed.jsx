import { armFK } from '../sim/robot';

const W = 640, H = 360, PX = W / 62; // ~62° horizontal field of view

// Scene items placed by yaw (deg, + = right) and elevation (deg above horizon at 60 cm camera height).
const TARGETS = [
  { id: 'BIN A-01-3', yaw: -69, elev: 20, kind: 'label' },
  { id: 'BIN A-02-3', yaw: -35, elev: 20, kind: 'label' },
  { id: 'BIN A-03-3', yaw: -1, elev: 20, kind: 'label' },
  { id: 'BIN A-01-2', yaw: -69, elev: 0, kind: 'label' },
  { id: 'BIN A-02-2', yaw: -35, elev: 0, kind: 'label' },
  { id: 'BIN A-03-2', yaw: -1, elev: 0, kind: 'label' },
  { id: 'PG-07 · 4.2 bar', yaw: 76, elev: 4, kind: 'gauge' },
  { id: 'FE-12 extinguisher', yaw: -100, elev: 18, kind: 'sign' },
  { id: 'Floor marking OK', yaw: 0, elev: -48, kind: 'floor' },
];

const BOXES = [
  [-83, 23, 9, 7], [-73, 23, 7, 9], [-61, 23, 10, 6], [-47, 23, 8, 8], [-38, 23, 9, 6], [-23, 23, 10, 9], [-9, 23, 7, 7], [3, 23, 11, 8],
  [-83, 3, 10, 9], [-67, 3, 8, 6], [-55, 3, 12, 11], [-39, 3, 9, 8], [-21, 3, 8, 10], [-7, 3, 10, 7], [7, 3, 9, 9],
  [-81, -17, 12, 10], [-61, -17, 14, 12], [-41, -17, 10, 9], [-25, -17, 12, 11], [-5, -17, 14, 10],
];

export function cameraView(joints) {
  const k = armFK(joints);
  return { yaw: joints[0], pitch: k.pitch + (k.c.z - 60) * 0.35, h: k.c.z };
}

export default function CameraFeed({ joints, zoom = 1, hud = true, rec = true, time }) {
  const { yaw, pitch, h } = cameraView(joints);
  const sx = (a) => a * PX, sy = (e) => -e * PX;
  const tf = `translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-sx(yaw)} ${-sy(pitch)})`;

  let lock = null;
  if (hud) {
    let best = 1e9;
    for (const t of TARGETS) {
      const px = (sx(t.yaw) - sx(yaw)) * zoom, py = (sy(t.elev) - sy(pitch)) * zoom;
      const d = Math.hypot(px, py);
      if (d < 80 && d < best) { best = d; lock = { ...t, px: px + W / 2, py: py + H / 2 }; }
    }
  }

  return (
    <svg className="camfeed" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Inspection camera feed">
      <defs>
        <linearGradient id="cwall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9b6ab" /><stop offset="1" stopColor="#d3d0c5" /></linearGradient>
        <linearGradient id="cfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9a597" /><stop offset="1" stopColor="#8e8a7c" /></linearGradient>
        <radialGradient id="vign" cx="50%" cy="50%" r="70%"><stop offset=".6" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".38" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="#8e8a7c" />
      <g transform={tf}>
        <rect x={sx(-200)} y={sy(90)} width={sx(400)} height={sy(-30) - sy(90)} fill="url(#cwall)" />
        <rect x={sx(-200)} y={sy(-30)} width={sx(400)} height={sy(-100) - sy(-30)} fill="url(#cfloor)" />
        {[-160, -120, -80, -40, 0, 40, 80, 120, 160].map((a) => (
          <line key={a} x1={sx(a * 0.35)} y1={sy(-30)} x2={sx(a)} y2={sy(-100)} stroke="#7f7b6e" strokeWidth="1" />
        ))}
        {/* hazard floor stripe */}
        <rect x={sx(-200)} y={sy(-46)} width={sx(400)} height={PX * 4} fill="#e2b33b" />
        {Array.from({ length: 80 }, (_, i) => (
          <path key={i} d={`M${sx(-200 + i * 5)} ${sy(-46)} l${PX * 2} 0 l${-PX * 2} ${PX * 4} l${-PX * 2} 0 Z`} fill="#2a2a26" />
        ))}

        {/* pallet rack */}
        {BOXES.map(([a, e, w, hh], i) => (
          <g key={i}>
            <rect x={sx(a)} y={sy(e + hh)} width={w * PX} height={hh * PX} fill={i % 3 ? '#b58a58' : '#a67c4d'} stroke="#7d5d38" strokeWidth="1" />
            <rect x={sx(a + w * 0.35)} y={sy(e + hh)} width={w * PX * 0.3} height={hh * PX} fill="#c79e6c" opacity=".55" />
          </g>
        ))}
        {[25, 5, -15].map((e) => (
          <rect key={e} x={sx(-86)} y={sy(e)} width={136 * PX} height={PX * 2.2} fill="#d9822b" stroke="#a85f1a" strokeWidth="1" />
        ))}
        {[-86, -52, -18, 16, 50].map((a) => (
          <g key={a}>
            <rect x={sx(a) - 6} y={sy(42)} width="12" height={sy(-32) - sy(42)} fill="#2f5d86" />
            {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={sx(a)} cy={sy(40 - i * 6)} r="1.5" fill="#1d3c58" />)}
          </g>
        ))}
        {TARGETS.filter((t) => t.kind === 'label').map((t) => (
          <g key={t.id} transform={`translate(${sx(t.yaw)} ${sy(t.elev)})`}>
            <rect x={-PX * 5} y={PX * 0.1} width={PX * 10} height={PX * 1.9} fill="#f7f5ee" />
            {Array.from({ length: 22 }, (_, i) => <rect key={i} x={-PX * 4.6 + i * PX * 0.26} y={PX * 0.3} width={(i * 7) % 3 === 0 ? 2.2 : 1.1} height={PX * 1.1} fill="#1b1b18" />)}
            <text x={PX * 1.4} y={PX * 1.35} fontSize={PX * 0.9} fill="#1b1b18" fontFamily="Geist Mono, monospace">{t.id.slice(4)}</text>
          </g>
        ))}

        {/* machine with gauge */}
        <rect x={sx(55)} y={sy(22)} width={sx(115) - sx(55)} height={sy(-32) - sy(22)} fill="#8f9892" stroke="#6a726c" strokeWidth="2" />
        <rect x={sx(92)} y={sy(16)} width={PX * 16} height={PX * 12} fill="#3b4540" rx="4" />
        {['#5fae5f', '#e2b33b', '#c9483b'].map((c, i) => <circle key={c} cx={sx(96 + i * 4)} cy={sy(10)} r={PX * 1.1} fill={c} />)}
        <g transform={`translate(${sx(76)} ${sy(4)})`}>
          <circle r={PX * 5} fill="#f4f2ea" stroke="#2c2c28" strokeWidth="4" />
          {Array.from({ length: 11 }, (_, i) => { const a = (-225 + i * 27) * Math.PI / 180; return <line key={i} x1={Math.cos(a) * PX * 3.6} y1={Math.sin(a) * PX * 3.6} x2={Math.cos(a) * PX * 4.4} y2={Math.sin(a) * PX * 4.4} stroke="#2c2c28" strokeWidth="2" />; })}
          <line x1="0" y1="0" x2={Math.cos(-0.5) * PX * 3.6} y2={Math.sin(-0.5) * PX * 3.6} stroke="#c9483b" strokeWidth="3" strokeLinecap="round" />
          <circle r="4" fill="#2c2c28" />
        </g>
        {/* extinguisher sign */}
        <g transform={`translate(${sx(-100)} ${sy(18)})`}>
          <rect x={-PX * 4} y={-PX * 4} width={PX * 8} height={PX * 8} fill="#c9362c" rx="3" />
          <rect x={-PX * 1.2} y={-PX * 2.4} width={PX * 2.4} height={PX * 5} rx={PX} fill="#fff" />
        </g>
        <rect x={sx(-106)} y={sy(2)} width={PX * 3} height={PX * 9} rx={PX} fill="#c9362c" />
      </g>
      <rect width={W} height={H} fill="url(#vign)" />

      {hud && (
        <g className="cam-hud">
          <line x1={W / 2 - 18} x2={W / 2 - 6} y1={H / 2} y2={H / 2} /><line x1={W / 2 + 6} x2={W / 2 + 18} y1={H / 2} y2={H / 2} />
          <line y1={H / 2 - 18} y2={H / 2 - 6} x1={W / 2} x2={W / 2} /><line y1={H / 2 + 6} y2={H / 2 + 18} x1={W / 2} x2={W / 2} />
          {lock && (
            <g transform={`translate(${lock.px} ${lock.py})`}>
              <path d="M-46 -20 v-8 h12 M34 -28 h12 v8 M46 20 v8 h-12 M-34 28 h-12 v-8" fill="none" className="lock" />
              <rect x="-46" y="32" width={lock.id.length * 7.2 + 14} height="18" rx="3" className="lock-tag" />
              <text x="-39" y="45" className="lock-text">{lock.id}</text>
            </g>
          )}
          <text x="16" y="26" className="hud-t">CAM-01 · 1080p · {zoom}×</text>
          {rec && <><circle cx={W - 64} cy="21" r="5" className="rec-dot" /><text x={W - 54} y="26" className="hud-t">REC</text></>}
          <text x="16" y={H - 16} className="hud-t">PAN {yaw.toFixed(0)}°  TILT {(pitch).toFixed(0)}°  H {h.toFixed(0)} cm</text>
          {time && <text x={W - 16} y={H - 16} textAnchor="end" className="hud-t">{time}</text>}
        </g>
      )}
    </svg>
  );
}
