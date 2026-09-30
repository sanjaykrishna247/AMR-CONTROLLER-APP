import { useRef, useState } from 'react';

export default function Joystick({ onChange, disabled, size = 168, labels = ['Fwd', 'Rev', 'L', 'R'] }) {
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, active: false });

  const update = (e) => {
    const r = base.current.getBoundingClientRect();
    const R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const d = Math.hypot(dx, dy), lim = R * 0.62;
    if (d > lim) { dx *= lim / d; dy *= lim / d; }
    setKnob({ x: dx, y: dy, active: true });
    onChange(+(dx / lim).toFixed(2), +(dy / lim).toFixed(2));
  };
  const down = (e) => { if (disabled) return; e.currentTarget.setPointerCapture(e.pointerId); update(e); };
  const move = (e) => { if (knob.active) update(e); };
  const up = () => { setKnob({ x: 0, y: 0, active: false }); onChange(0, 0); };

  return (
    <div
      ref={base}
      className={`joy${disabled ? ' disabled' : ''}${knob.active ? ' active' : ''}`}
      style={{ width: size, height: size }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    >
      <span className="joy-l top">{labels[0]}</span>
      <span className="joy-l bottom">{labels[1]}</span>
      <span className="joy-l left">{labels[2]}</span>
      <span className="joy-l right">{labels[3]}</span>
      <div className="joy-ring" />
      <div className="joy-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
