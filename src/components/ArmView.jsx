import { useRef, useState } from 'react';
import { ARM, armFK, armIK } from '../sim/robot';

const VB = { r0: -34, r1: 72, z1: 104 };
const Y = (z) => VB.z1 - z;
const rad = (d) => (d * Math.PI) / 180;

export default function ArmView({ joints, target, onReach }) {
  const svg = useRef(null);
  const [mark, setMark] = useState(null);
  const k = armFK(joints);
  const sh = k.s;
  const reach = ARM.L2 + ARM.L3 + ARM.L4;
  const pitch = rad(k.pitch);
  const fov = rad(22);

  const click = (e) => {
    if (!onReach) return;
    const pt = svg.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse());
    const r = p.x, z = VB.z1 - p.y;
    let sol = null;
    for (const ph of [0, -20, 20, -40, 40, -65, 65, -90]) { sol = armIK(r, z, ph, joints[0]); if (sol) break; }
    setMark({ r, z, ok: !!sol });
    if (sol) onReach(sol);
  };

  const tk = target ? armFK(target) : null;

  return (
    <svg ref={svg} className="armview" viewBox={`${VB.r0} 0 ${VB.r1 - VB.r0} ${VB.z1 + 2}`} onClick={click} role="img" aria-label="Arm side view">
      <defs>
        <pattern id="armgrid" width="10" height="10" patternUnits="userSpaceOnUse" y={Y(0) % 10}>
          <path d="M10 0 L0 0 0 10" fill="none" stroke="var(--line)" strokeWidth="0.25" />
        </pattern>
      </defs>
      <rect x={VB.r0} y="0" width={VB.r1 - VB.r0} height={VB.z1} fill="url(#armgrid)" />

      {/* reach envelope */}
      <path d={`M ${sh.r - reach} ${Y(sh.z)} A ${reach} ${reach} 0 0 1 ${sh.r + reach} ${Y(sh.z)}`} fill="var(--arm-env)" stroke="var(--arm-env-edge)" strokeWidth="0.35" strokeDasharray="1.4 1" />
      <path d={`M ${sh.r + reach} ${Y(sh.z)} A ${reach} ${reach} 0 0 1 ${sh.r + Math.sqrt(reach ** 2 - sh.z ** 2)} ${Y(0)}`} fill="none" stroke="var(--arm-env-edge)" strokeWidth="0.35" strokeDasharray="1.4 1" />

      {/* 60 cm reference */}
      <line x1={VB.r0} x2={VB.r1} y1={Y(60)} y2={Y(60)} stroke="var(--amber)" strokeWidth="0.35" strokeDasharray="2 1.4" />
      <text x={VB.r1 - 1.5} y={Y(60) - 1.4} textAnchor="end" className="arm-ref">Pallet label height · 60 cm</text>

      {/* ground + chassis */}
      <line x1={VB.r0} x2={VB.r1} y1={Y(0)} y2={Y(0)} stroke="var(--ink-3)" strokeWidth="0.6" />
      <rect x="-34" y={Y(ARM.deck)} width="56" height={ARM.deck - 7} rx="2.5" fill="var(--arm-body)" />
      <rect x="-34" y={Y(ARM.deck)} width="56" height="3" rx="1.2" fill="var(--arm-body-top)" />
      <circle cx="-4" cy={Y(6)} r="6" fill="var(--ink)" /><circle cx="-4" cy={Y(6)} r="2.2" fill="var(--arm-body-top)" />
      <circle cx="-28" cy={Y(3.5)} r="3.5" fill="var(--ink-2)" /><circle cx="16" cy={Y(3.5)} r="3.5" fill="var(--ink-2)" />
      <text x="-12" y={Y(18)} textAnchor="middle" className="arm-body-label">AMR-01</text>

      {/* ghost of target pose */}
      {tk && (
        <polyline points={[tk.s, tk.e, tk.w, tk.c].map((p) => `${p.r},${Y(p.z)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="1.2 1" opacity=".55" strokeLinecap="round" />
      )}

      {/* base column */}
      <rect x="-5" y={Y(sh.z)} width="10" height={ARM.L1} rx="1.5" fill="var(--arm-link-dark)" />

      {/* camera FOV */}
      <path d={`M ${k.c.r} ${Y(k.c.z)} L ${k.c.r + 34 * Math.cos(pitch + fov)} ${Y(k.c.z + 34 * Math.sin(pitch + fov))} L ${k.c.r + 34 * Math.cos(pitch - fov)} ${Y(k.c.z + 34 * Math.sin(pitch - fov))} Z`} fill="var(--arm-fov)" />

      {/* links */}
      <line x1={sh.r} y1={Y(sh.z)} x2={k.e.r} y2={Y(k.e.z)} stroke="var(--arm-link)" strokeWidth="4.2" strokeLinecap="round" />
      <line x1={k.e.r} y1={Y(k.e.z)} x2={k.w.r} y2={Y(k.w.z)} stroke="var(--arm-link)" strokeWidth="3.4" strokeLinecap="round" />
      <line x1={k.w.r} y1={Y(k.w.z)} x2={k.c.r} y2={Y(k.c.z)} stroke="var(--arm-link)" strokeWidth="2.6" strokeLinecap="round" />
      {[sh, k.e, k.w].map((p, i) => (
        <g key={i}><circle cx={p.r} cy={Y(p.z)} r={3 - i * 0.4} fill="var(--arm-joint)" /><circle cx={p.r} cy={Y(p.z)} r="0.9" fill="var(--surface)" /></g>
      ))}
      <g transform={`translate(${k.c.r} ${Y(k.c.z)}) rotate(${-k.pitch})`}>
        <rect x="-2.5" y="-2.6" width="6" height="5.2" rx="1" fill="var(--ink)" />
        <circle cx="3.6" cy="0" r="1.5" fill="var(--accent)" stroke="var(--ink)" strokeWidth="0.5" />
      </g>

      {mark && (
        <g transform={`translate(${mark.r} ${Y(mark.z)})`} className={mark.ok ? 'ik-ok' : 'ik-bad'}>
          {mark.ok ? <circle r="2" fill="none" strokeWidth="0.5" /> : <path d="M-1.8 -1.8 L1.8 1.8 M1.8 -1.8 L-1.8 1.8" strokeWidth="0.6" />}
        </g>
      )}

      <text x={VB.r0 + 1.5} y="5" className="arm-readout">Camera  r {k.c.r.toFixed(1)} cm · h {k.c.z.toFixed(1)} cm · pitch {k.pitch.toFixed(0)}°</text>
    </svg>
  );
}
