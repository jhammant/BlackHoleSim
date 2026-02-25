// Encounter Diagram — 2D top-down view of BH passing through a solar system
// Canvas 2D visualization for the "What If?" tab right panel

const PLANETS = [
  { name: 'Mercury', au: 0.39, color: '#aaaaaa', size: 2 },
  { name: 'Venus',   au: 0.72, color: '#ddaa55', size: 3 },
  { name: 'Earth',   au: 1.0,  color: '#4488cc', size: 3 },
  { name: 'Mars',    au: 1.52, color: '#cc5533', size: 2.5 },
  { name: 'Jupiter', au: 5.2,  color: '#ddaa77', size: 6 },
  { name: 'Saturn',  au: 9.5,  color: '#ccbb88', size: 5.5 },
  { name: 'Uranus',  au: 19.2, color: '#88bbcc', size: 4 },
  { name: 'Neptune', au: 30.0, color: '#4466cc', size: 4 },
];

let canvas, ctx, dpr = 1;
let params = {
  timeline: 0.5,
  mass: Math.pow(10, 7.3),
  velocity: 954,
  closestApproach: 50,
  mode: 'flyby',
};

// Pre-simulated planet positions (same approach as 3D encounter)
let simFrames = null;
let lastSimKey = '';
let planetAngles = PLANETS.map(() => Math.random() * Math.PI * 2);

export function initEncounterDiagram(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;
  resize();
  runSim();
  draw();
  window.addEventListener('resize', () => { resize(); draw(); });
}

export function updateEncounterDiagram(newParams) {
  Object.assign(params, newParams);
  const key = `${params.mass}_${params.velocity}_${params.closestApproach}_${params.mode}`;
  if (key !== lastSimKey) {
    runSim();
    lastSimKey = key;
  }
  draw();
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}

/* ---------- Simulation ---------- */

function runSim() {
  const STEPS = 300;
  const isDirect = params.mode === 'direct';
  const dMin = isDirect ? 0 : params.closestApproach;
  const M = params.mass;
  const BH_RANGE_AU = 80; // BH travels ±80 AU through the scene

  // Initialize planet states (AU coordinates, top-down)
  const pStates = PLANETS.map((p, i) => ({
    x: Math.cos(planetAngles[i]) * p.au,
    y: Math.sin(planetAngles[i]) * p.au,
    vx: 0, vy: 0,
    au: p.au,
    disrupted: false,
  }));

  simFrames = [];

  for (let step = 0; step <= STEPS; step++) {
    const t = step / STEPS;
    // BH moves along Y axis (top to bottom), offset by closestApproach on X
    const bhX = dMin;
    const bhY = (t - 0.5) * 2 * BH_RANGE_AU;

    simFrames.push({
      t, bhX, bhY,
      planets: pStates.map(p => ({ x: p.x, y: p.y, disrupted: p.disrupted })),
    });

    // Physics: BH gravity pull on each planet
    const dt = 1 / STEPS;
    for (const p of pStates) {
      const dx = bhX - p.x;
      const dy = bhY - p.y;
      const dist2 = dx * dx + dy * dy;
      const dist = Math.sqrt(dist2) || 0.01;

      // Gravitational acceleration scaled for AU coordinates
      // Stronger effect = more dramatic ejection
      const accel = M * 3e-7 / (dist2 + 0.5) * dt;

      if (dist < 200) {
        p.vx += (dx / dist) * accel;
        p.vy += (dy / dist) * accel;
        if (accel > 0.003) p.disrupted = true;
      }

      // Solar restoring force (for undisrupted planets)
      if (!p.disrupted) {
        const sr = Math.sqrt(p.x * p.x + p.y * p.y) || 0.01;
        const orbSpeed = 0.005 / Math.sqrt(Math.max(p.au, 0.3));
        // Tangential orbit
        p.vx += (-p.y / sr) * orbSpeed;
        p.vy += (p.x / sr) * orbSpeed;
        // Radial restoring
        const radial = (sr - p.au) * 0.03 * dt;
        p.vx -= (p.x / sr) * radial;
        p.vy -= (p.y / sr) * radial;
        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;
      }

      p.x += p.vx;
      p.y += p.vy;
    }
  }
}

/* ---------- Drawing ---------- */

function draw() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  if (w < 10 || h < 10) return;
  if (!simFrames) return;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.45; // center of solar system (offset left to make room for BH path)
  const cy = h * 0.5;

  // Scale: fit Neptune's orbit (30 AU) comfortably
  const scale = Math.min(w, h) * 0.013; // pixels per AU

  // Get current frame
  const t = params.timeline;
  const fi = Math.min(simFrames.length - 1, Math.floor(t * (simFrames.length - 1)));
  const ni = Math.min(simFrames.length - 1, fi + 1);
  const frame = simFrames[fi];
  const next = simFrames[ni];
  const frac = (t * (simFrames.length - 1)) - fi;

  const lerp = (a, b) => a + (b - a) * frac;

  // Draw orbit rings (dashed, faint)
  ctx.setLineDash([2, 4]);
  PLANETS.forEach((p, i) => {
    const disrupted = frame.planets[i].disrupted;
    ctx.strokeStyle = disrupted ? 'rgba(255,50,50,0.15)' : 'rgba(60,60,120,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, p.au * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // BH trajectory line (full path)
  const bhX0 = simFrames[0].bhX * scale + cx;
  const bhY0 = simFrames[0].bhY * scale + cy;
  const bhXN = simFrames[simFrames.length - 1].bhX * scale + cx;
  const bhYN = simFrames[simFrames.length - 1].bhY * scale + cy;

  ctx.strokeStyle = 'rgba(255,68,68,0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(bhX0, bhY0);
  ctx.lineTo(bhXN, bhYN);
  ctx.stroke();
  ctx.setLineDash([]);

  // BH trail (past path, solid)
  ctx.strokeStyle = 'rgba(255,68,68,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= fi; i++) {
    const sx = simFrames[i].bhX * scale + cx;
    const sy = simFrames[i].bhY * scale + cy;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();

  // Sun
  ctx.fillStyle = '#ffdd44';
  ctx.shadowColor = '#ffdd44';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Sun label
  ctx.fillStyle = '#ffdd44';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Sun', cx, cy + 14);

  // Planets
  PLANETS.forEach((p, i) => {
    const fp = frame.planets[i];
    const np = next.planets[i];
    const px = lerp(fp.x, np.x) * scale + cx;
    const py = lerp(fp.y, np.y) * scale + cy;
    const disrupted = fp.disrupted;

    // Planet trail (for disrupted planets)
    if (disrupted && fi > 10) {
      ctx.strokeStyle = `${p.color}44`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const startFrame = Math.max(0, fi - 40);
      for (let j = startFrame; j <= fi; j++) {
        const tx = simFrames[j].planets[i].x * scale + cx;
        const ty = simFrames[j].planets[i].y * scale + cy;
        if (j === startFrame) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
    }

    // Planet dot
    ctx.fillStyle = disrupted ? '#ff4444' : p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();

    // Planet name label
    ctx.fillStyle = disrupted ? '#ff6666' : '#8888aa';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(p.name, px + p.size + 3, py + 3);
  });

  // Black hole
  const bhPx = lerp(frame.bhX, next.bhX) * scale + cx;
  const bhPy = lerp(frame.bhY, next.bhY) * scale + cy;

  // BH shock wave ring
  const shockR = 15 + scale * 3;
  const shockGrad = ctx.createRadialGradient(bhPx, bhPy, 3, bhPx, bhPy, shockR);
  shockGrad.addColorStop(0, 'rgba(0,200,255,0)');
  shockGrad.addColorStop(0.6, 'rgba(0,200,255,0.05)');
  shockGrad.addColorStop(0.85, 'rgba(0,200,255,0.12)');
  shockGrad.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.fillStyle = shockGrad;
  ctx.beginPath();
  ctx.arc(bhPx, bhPy, shockR, 0, Math.PI * 2);
  ctx.fill();

  // BH core (black with orange glow)
  ctx.fillStyle = '#000';
  ctx.shadowColor = '#ff6622';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(bhPx, bhPy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // BH photon ring
  ctx.strokeStyle = '#ff8844';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(bhPx, bhPy, 7, 0, Math.PI * 2);
  ctx.stroke();

  // BH label
  ctx.fillStyle = '#ff8844';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RBH-1', bhPx, bhPy - 14);

  // Arrow showing BH direction of motion
  const arrowY = bhPy + 12;
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bhPx, arrowY);
  ctx.lineTo(bhPx, arrowY + 15);
  ctx.lineTo(bhPx - 4, arrowY + 11);
  ctx.moveTo(bhPx, arrowY + 15);
  ctx.lineTo(bhPx + 4, arrowY + 11);
  ctx.stroke();

  // Scale bar
  const scaleBarAU = 10;
  const scaleBarPx = scaleBarAU * scale;
  const sbx = w - 20 - scaleBarPx;
  const sby = h - 20;
  ctx.strokeStyle = '#555570';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sbx, sby); ctx.lineTo(sbx + scaleBarPx, sby);
  ctx.moveTo(sbx, sby - 3); ctx.lineTo(sbx, sby + 3);
  ctx.moveTo(sbx + scaleBarPx, sby - 3); ctx.lineTo(sbx + scaleBarPx, sby + 3);
  ctx.stroke();
  ctx.fillStyle = '#555570';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${scaleBarAU} AU`, sbx + scaleBarPx / 2, sby - 6);

  // Title
  ctx.fillStyle = '#666688';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('TOP-DOWN VIEW', 10, 16);

  ctx.restore();
}
