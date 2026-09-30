import { useRef } from 'react';
import { WORLD, OBSTACLES, STATIONS, COSTMAP, ROWS, COLS } from '../sim/world';
import { useRobot } from '../sim/RobotContext';

const deg = (r) => (r * 180) / Math.PI;

export default function FactoryMap({ onPick, showLidar = true, showCostmap = false, showLabels = true, compact = false }) {
  const { s } = useRobot();
  const svg = useRef(null);
  const { x, y, th } = s.pose;

  const click = (e) => {
    if (!onPick) return;
    const pt = svg.current.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse());
    onPick({ x: +p.x.toFixed(2), y: +p.y.toFixed(2) });
  };

  const pathD = s.path.length ? `M${x},${y} ` + s.path.map((p) => `L${p.x},${p.y}`).join(' ') : '';
  const lidarPts = s.lidar.map((r) => `${r.x},${r.y}`).join(' ');

  return (
    <svg ref={svg} className={`fmap${onPick ? ' pickable' : ''}`} viewBox={`-0.1 -0.1 ${WORLD.w + 0.2} ${WORLD.h + 0.2}`} onClick={click} role="img" aria-label="Factory floor map">
      <defs>
        <pattern id="hatch" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.25" stroke="var(--map-hatch)" strokeWidth="0.06" />
        </pattern>
        <pattern id="grid1" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M1 0 L0 0 0 1" fill="none" stroke="var(--map-grid)" strokeWidth="0.015" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={WORLD.w} height={WORLD.h} rx="0.15" fill="var(--map-floor)" />
      <rect x="0" y="0" width={WORLD.w} height={WORLD.h} fill="url(#grid1)" />

      {/* safety walkway */}
      <rect x="2.4" y="4.9" width="7" height="0.6" fill="var(--map-walk)" />

      {showCostmap && COSTMAP.map((row, r) => Array.from(row).map((v, c) => v === 2 && (
        <rect key={`${r}-${c}`} x={c * WORLD.cell} y={r * WORLD.cell} width={WORLD.cell} height={WORLD.cell} fill="var(--map-inflate)" />
      )))}

      {OBSTACLES.map((o) => (
        <g key={o.id}>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} rx={o.kind === 'wall' ? 0.02 : 0.06}
            fill={o.kind === 'rack' ? 'url(#hatch)' : 'var(--map-obst)'} stroke="var(--map-obst-edge)" strokeWidth="0.03" />
          {o.kind === 'rack' && <rect x={o.x} y={o.y} width={o.w} height={o.h} rx="0.06" fill="var(--map-rack)" opacity=".5" />}
          {showLabels && o.label && !compact && (
            <text x={o.x + o.w / 2} y={o.y + o.h / 2 + 0.1} className="map-olabel" textAnchor="middle">{o.label}</text>
          )}
        </g>
      ))}
      <rect x="0.02" y="0.02" width={WORLD.w - 0.04} height={WORLD.h - 0.04} rx="0.15" fill="none" stroke="var(--map-wall)" strokeWidth="0.08" />

      {STATIONS.map((st) => (
        <g key={st.id} className="map-station" transform={`translate(${st.x} ${st.y})`}>
          <rect x="-0.34" y="-0.34" width="0.68" height="0.68" rx="0.1" fill="none" stroke="var(--map-station)" strokeWidth="0.035" strokeDasharray="0.1 0.07" />
          {st.kind === 'dock' && <path d="M-0.08 -0.16 L0.06 -0.02 L-0.04 -0.02 L0.08 0.16" fill="none" stroke="var(--map-station)" strokeWidth="0.05" strokeLinecap="round" strokeLinejoin="round" />}
          {showLabels && <text y="-0.46" textAnchor="middle" className="map-slabel">{compact ? st.short : st.label}</text>}
        </g>
      ))}

      {showLidar && s.lidar.length > 0 && (
        <g>
          <polygon points={lidarPts} fill="var(--map-lidar-fill)" stroke="none" />
          {s.lidar.filter((r) => r.hit).map((r, i) => <circle key={i} cx={r.x} cy={r.y} r="0.035" fill="var(--map-lidar)" />)}
        </g>
      )}

      {pathD && <path d={pathD} fill="none" stroke="var(--map-path)" strokeWidth="0.06" strokeDasharray="0.16 0.1" strokeLinecap="round" />}
      {s.goal && (
        <g transform={`translate(${s.goal.x} ${s.goal.y})`}>
          <circle r="0.22" fill="none" stroke="var(--map-path)" strokeWidth="0.05" />
          <circle r="0.07" fill="var(--map-path)" />
        </g>
      )}

      {/* walking operator */}
      <g transform={`translate(${s.person.x} ${s.person.y})`}>
        <circle r="0.4" fill="var(--map-person-halo)" />
        <circle r="0.17" fill="var(--map-person)" />
        {!compact && <text y="-0.5" textAnchor="middle" className="map-plabel">Operator</text>}
      </g>

      {/* robot + towed trolley */}
      <g transform={`translate(${x} ${y}) rotate(${deg(th)})`}>
        {s.payload > 0 && (
          <g>
            <line x1="-0.3" y1="0" x2="-0.55" y2="0" stroke="var(--map-robot)" strokeWidth="0.05" />
            <rect x="-1.15" y="-0.26" width="0.6" height="0.52" rx="0.05" fill="var(--map-trolley)" stroke="var(--map-robot)" strokeWidth="0.03" />
          </g>
        )}
        <rect x="-0.3" y="-0.23" width="0.6" height="0.46" rx="0.09" fill="var(--map-robot)" />
        <rect x="-0.2" y="-0.28" width="0.24" height="0.06" rx="0.02" fill="var(--map-robot-wheel)" />
        <rect x="-0.2" y="0.22" width="0.24" height="0.06" rx="0.02" fill="var(--map-robot-wheel)" />
        <path d="M0.12 -0.11 L0.26 0 L0.12 0.11 Z" fill="var(--map-robot-nose)" />
        <circle cx="-0.06" cy="0" r="0.06" fill="var(--map-robot-nose)" opacity=".7" />
      </g>
      {s.blocked && (
        <text x={x} y={y - 0.5} textAnchor="middle" className="map-warn">Yielding</text>
      )}
    </svg>
  );
}
