// Factory floor used by the simulator. Units are metres, origin top-left, y grows downward.
export const WORLD = { w: 16, h: 10, cell: 0.4 };
export const COLS = Math.round(WORLD.w / WORLD.cell);
export const ROWS = Math.round(WORLD.h / WORLD.cell);

export const OBSTACLES = [
  { id: 'rackA', x: 2, y: 1.2, w: 6, h: 0.8, kind: 'rack', label: 'Rack A' },
  { id: 'rackB', x: 2, y: 3.6, w: 6, h: 0.8, kind: 'rack', label: 'Rack B' },
  { id: 'rackC', x: 10, y: 1.2, w: 4, h: 0.8, kind: 'rack', label: 'Rack C' },
  { id: 'cnc', x: 10, y: 5.6, w: 2.4, h: 2, kind: 'machine', label: 'CNC Cell' },
  { id: 'bench', x: 5.6, y: 8.8, w: 2.4, h: 0.8, kind: 'machine', label: 'Work Bench' },
  { id: 'wall1', x: 0, y: 6.4, w: 4.8, h: 0.2, kind: 'wall' },
  { id: 'wall2', x: 13.6, y: 4.4, w: 2.4, h: 0.2, kind: 'wall' },
  { id: 'pillar', x: 7.2, y: 6.8, w: 0.4, h: 0.4, kind: 'pillar' },
];

export const STATIONS = [
  { id: 'dock', label: 'Charging Dock', short: 'Dock', x: 1.0, y: 8.8, kind: 'dock' },
  { id: 'recv', label: 'Receiving Bay', short: 'Receiving', x: 1.2, y: 5.4, kind: 'bay' },
  { id: 'rackA', label: 'Rack A Aisle', short: 'Rack A', x: 5.0, y: 2.8, kind: 'rack' },
  { id: 'rackC', label: 'Rack C Aisle', short: 'Rack C', x: 12.0, y: 2.8, kind: 'rack' },
  { id: 'asm', label: 'Assembly Line A', short: 'Assembly', x: 9.2, y: 6.6, kind: 'bay' },
  { id: 'qc', label: 'QC Inspection Bay', short: 'QC Bay', x: 14.4, y: 7.4, kind: 'bay' },
  { id: 'dispatch', label: 'Dispatch Gate', short: 'Dispatch', x: 14.9, y: 2.8, kind: 'bay' },
];

export const stationById = (id) => STATIONS.find((s) => s.id === id);

const EPS = 1e-6;

function buildGrid() {
  const g = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) { g[r][c] = 1; continue; }
      const x0 = c * WORLD.cell, y0 = r * WORLD.cell, x1 = x0 + WORLD.cell, y1 = y0 + WORLD.cell;
      for (const o of OBSTACLES) {
        if (x0 < o.x + o.w - EPS && x1 > o.x + EPS && y0 < o.y + o.h - EPS && y1 > o.y + EPS) { g[r][c] = 1; break; }
      }
    }
  }
  return g;
}

function inflate(g) {
  const out = g.map((row) => Uint8Array.from(row));
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!g[r][c]) continue;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < ROWS && cc < COLS && !out[rr][cc]) out[rr][cc] = 2;
    }
  }
  return out;
}

export const GRID = buildGrid();
export const COSTMAP = inflate(GRID);

export const toCell = (x, y) => [
  Math.min(ROWS - 1, Math.max(0, Math.floor(y / WORLD.cell))),
  Math.min(COLS - 1, Math.max(0, Math.floor(x / WORLD.cell))),
];
const cellCenter = (r, c) => ({ x: (c + 0.5) * WORLD.cell, y: (r + 0.5) * WORLD.cell });

export const isOccupied = (x, y) => {
  if (x < 0 || y < 0 || x >= WORLD.w || y >= WORLD.h) return true;
  const [r, c] = toCell(x, y);
  return GRID[r][c] === 1;
};
const isBlocked = (r, c) => COSTMAP[r][c] !== 0;

function nearestFree(r, c) {
  for (let rad = 1; rad < 8; rad++) {
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr > 0 && cc > 0 && rr < ROWS - 1 && cc < COLS - 1 && !isBlocked(rr, cc)) return [rr, cc];
    }
  }
  return null;
}

function lineOfSight(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.ceil(d / 0.1);
  for (let i = 1; i < n; i++) {
    const x = a.x + ((b.x - a.x) * i) / n, y = a.y + ((b.y - a.y) * i) / n;
    const [r, c] = toCell(x, y);
    if (isBlocked(r, c)) return false;
  }
  return true;
}

// A* over the inflated costmap (8-connected), followed by line-of-sight smoothing.
export function planPath(from, to) {
  const start = toCell(from.x, from.y);
  let goal = toCell(to.x, to.y);
  if (isBlocked(goal[0], goal[1])) goal = nearestFree(goal[0], goal[1]);
  if (!goal) return null;

  const key = (r, c) => r * COLS + c;
  const g = new Map([[key(...start), 0]]);
  const came = new Map();
  const open = [{ r: start[0], c: start[1], f: 0 }];
  const closed = new Set();
  const h = (r, c) => Math.hypot(r - goal[0], c - goal[1]);

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.r, cur.c);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.r === goal[0] && cur.c === goal[1]) {
      const cells = [];
      let k = ck;
      while (k !== undefined) { cells.push([Math.floor(k / COLS), k % COLS]); k = came.get(k); }
      cells.reverse();
      const pts = cells.map(([r, c]) => cellCenter(r, c));
      pts[0] = { x: from.x, y: from.y };
      pts[pts.length - 1] = isBlocked(...toCell(to.x, to.y)) ? pts[pts.length - 1] : { x: to.x, y: to.y };
      const smooth = [pts[0]];
      let anchor = 0;
      for (let i = 2; i < pts.length; i++) {
        if (!lineOfSight(pts[anchor], pts[i])) { smooth.push(pts[i - 1]); anchor = i - 1; }
      }
      if (pts.length > 1) smooth.push(pts[pts.length - 1]);
      return smooth;
    }
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const r = cur.r + dr, c = cur.c + dc;
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
      if (isBlocked(r, c) && !(r === start[0] && c === start[1])) continue;
      if (dr && dc && (isBlocked(cur.r + dr, cur.c) || isBlocked(cur.r, cur.c + dc))) continue;
      const ng = g.get(ck) + (dr && dc ? Math.SQRT2 : 1);
      const nk = key(r, c);
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, ck);
        open.push({ r, c, f: ng + h(r, c) });
      }
    }
  }
  return null;
}

export const pathLength = (pose, path) => {
  let d = 0, p = pose;
  for (const q of path) { d += Math.hypot(q.x - p.x, q.y - p.y); p = q; }
  return d;
};

export function castRay(x, y, ang, maxR, person) {
  const step = 0.08;
  for (let d = 0.2; d <= maxR; d += step) {
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d;
    if (isOccupied(px, py)) return { d, hit: true, x: px, y: py };
    if (person && Math.hypot(px - person.x, py - person.y) < 0.22) return { d, hit: true, x: px, y: py };
  }
  return { d: maxR, hit: false, x: x + Math.cos(ang) * maxR, y: y + Math.sin(ang) * maxR };
}

export function nearestStation(x, y) {
  let best = null, bd = Infinity;
  for (const s of STATIONS) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return { station: best, dist: bd };
}
