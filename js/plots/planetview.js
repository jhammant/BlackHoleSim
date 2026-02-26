// Planet's Eye View — What the night sky looks like as RBH-1 approaches
// Realistic star density with Milky Way concentration, clusters, and background galaxies.
// Gravitational lensing distorts stars near the BH. Bow shock appears as a ring/arc.

import { DEFAULTS } from '../physics/constants.js';

let canvas, ctx;
let dpr = 1;
let animTime = 0;
let currentParams = {
  distance: 500,
  v_star: DEFAULTS.v_star,
  M_BH: DEFAULTS.M_BH,
};

let stars = [];
let galaxies = [];
let nebulaPatches = [];
let dustLanes = [];
const STAR_COUNT = 2200; // more stars needed to make MW band visibly dense

export function initPlanetView(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;
  generateSky();
  resize();
  if (canvas.width > 0 && canvas.height > 0) draw();
  window.addEventListener('resize', () => { resize(); if (canvas.width > 0) draw(); });
}

export function updatePlanetView(params) {
  Object.assign(currentParams, params);
  draw();
}

let autoAnimate = false;
let autoStartTime = 0;
let autoStartDist = 5000;

export function animatePlanetView(time) {
  animTime = time;
  if (autoAnimate) {
    if (!autoStartTime) autoStartTime = time;
    const elapsed = (time - autoStartTime) * 0.001;
    const duration = Math.max(8, autoStartDist / 250); // scale duration to starting distance
    const t = Math.min(1, elapsed / duration);
    const dist = autoStartDist * Math.pow(1 - t, 3);
    currentParams.distance = Math.max(0.01, dist);
    const slider = document.querySelector('#planetview-sliders input[type="range"]');
    if (slider) slider.value = currentParams.distance;
    if (t >= 1) autoAnimate = false;
  }
  draw();
}

export function startAutoApproach() {
  autoAnimate = true;
  autoStartTime = 0;
  autoStartDist = currentParams.distance; // start from current slider position
}

/* ---------- Sky generation ---------- */

function gaussRand() {
  const u = Math.random() || 0.001;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function mwBandDist(x, y) {
  // Milky Way center line: y = 0.58 - 0.3x  (diagonal band)
  return Math.abs(0.3 * x + y - 0.58) / Math.sqrt(0.09 + 1);
}

function generateSky() {
  stars = [];
  galaxies = [];
  nebulaPatches = [];
  dustLanes = [];

  // Background galaxies (fuzzy elliptical blobs) — placed AWAY from MW band
  for (let i = 0; i < 8; i++) {
    let gx, gy;
    do {
      gx = 0.05 + Math.random() * 0.9;
      gy = 0.05 + Math.random() * 0.72;
    } while (mwBandDist(gx, gy) < 0.06); // keep galaxies outside the MW band
    galaxies.push({
      x: gx, y: gy,
      size: 1.5 + Math.random() * 5,
      angle: Math.random() * Math.PI,
      brightness: 0.05 + Math.random() * 0.1,
      elongation: 0.25 + Math.random() * 0.75,
    });
  }

  // Nebula patches — emission nebulae IN the MW band
  for (let i = 0; i < 5; i++) {
    const t = 0.1 + Math.random() * 0.8;
    nebulaPatches.push({
      x: t,
      y: (0.58 - t * 0.3) + gaussRand() * 0.02,
      radius: 0.015 + Math.random() * 0.035,
      rgb: [
        [255, 80, 80],   // Hα red (most common)
        [80, 120, 220],  // reflection blue
        [200, 60, 100],  // pink HII region
        [100, 200, 150], // planetary nebula teal
      ][Math.floor(Math.random() * 4)],
      brightness: 0.02 + Math.random() * 0.03,
    });
  }

  // Dust lanes — dark patches that CUT THROUGH the MW band (like the Great Rift)
  // These are regions where stars are suppressed
  dustLanes = [
    { t0: 0.25, t1: 0.55, offset: -0.005, width: 0.012 }, // main rift
    { t0: 0.50, t1: 0.70, offset: 0.008, width: 0.008 },  // secondary lane
    { t0: 0.10, t1: 0.30, offset: 0.003, width: 0.006 },  // minor lane
  ];

  // Star cluster centers — placed ON the MW band for realism
  const clusterCenters = [];
  for (let i = 0; i < 8; i++) {
    const t = 0.1 + Math.random() * 0.8;
    clusterCenters.push({
      x: t + gaussRand() * 0.03,
      y: (0.58 - t * 0.3) + gaussRand() * 0.025,
      spread: 0.006 + Math.random() * 0.01,
      count: 12 + Math.floor(Math.random() * 20),
    });
  }

  for (let i = 0; i < STAR_COUNT; i++) {
    let x, y;
    const roll = Math.random();

    if (roll < 0.60) {
      // ---- 60% Milky Way band — TIGHT concentration ----
      const t = Math.random();
      const bandCenterY = 0.58 - t * 0.3;
      x = t + gaussRand() * 0.04;            // tight along the band
      y = bandCenterY + gaussRand() * 0.018;  // very narrow vertical spread
    } else if (roll < 0.72) {
      // ---- 12% Cluster stars — tight bright groups ----
      const c = clusterCenters[Math.floor(Math.random() * clusterCenters.length)];
      x = c.x + gaussRand() * c.spread;
      y = c.y + gaussRand() * c.spread;
    } else if (roll < 0.82) {
      // ---- 10% MW halo — wider spread around the band ----
      const t = Math.random();
      x = t + gaussRand() * 0.12;
      y = (0.58 - t * 0.3) + gaussRand() * 0.06;
    } else {
      // ---- 18% Field stars — sparse, scattered everywhere ----
      x = Math.random();
      y = Math.random() * 0.83;
    }

    x = Math.max(0.005, Math.min(0.995, x));
    y = Math.max(0.005, Math.min(0.83, y));

    // Check if this star falls in a dust lane (suppress it)
    if (isInDustLane(x, y)) {
      // 80% chance star is blocked by dust
      if (Math.random() < 0.80) continue;
    }

    const mwd = mwBandDist(x, y);
    const inCore = mwd < 0.012;
    const inBand = mwd < 0.04;
    const inHalo = mwd < 0.08;

    let brightness, size;
    if (inCore) {
      // Dense core: many faint tiny stars (unresolved star field)
      brightness = 0.08 + Math.random() * 0.25;
      size = 0.15 + Math.random() * 0.6;
    } else if (inBand) {
      brightness = 0.12 + Math.random() * 0.4;
      size = 0.2 + Math.random() * 1.0;
    } else if (inHalo) {
      brightness = 0.2 + Math.random() * 0.5;
      size = 0.3 + Math.random() * 1.5;
    } else {
      // Sparse field: fewer but brighter/more prominent individual stars
      brightness = 0.3 + Math.random() * 0.7;
      size = 0.5 + Math.random() * 2.5;
    }

    // Spectral class color — more variety in the MW band
    const cr = Math.random();
    let hue;
    if (inBand) {
      // MW band: mix of spectral types
      if (cr < 0.10) hue = 'blue';
      else if (cr < 0.25) hue = 'orange';
      else if (cr < 0.35) hue = 'red';
      else if (cr < 0.50) hue = 'yellow';
      else hue = 'white';
    } else {
      // Field: brighter stars tend to be bluer or redder (giants)
      if (cr < 0.08) hue = 'blue';
      else if (cr < 0.15) hue = 'orange';
      else if (cr < 0.18) hue = 'red';
      else if (cr < 0.28) hue = 'yellow';
      else hue = 'white';
    }

    stars.push({
      x, y, size, brightness, hue,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.3 + Math.random() * 2.5,
      depth: Math.random(),
    });
  }
}

function isInDustLane(x, y) {
  // Check if point (x,y) falls inside one of the dark dust lanes
  for (const lane of dustLanes) {
    if (x < lane.t0 || x > lane.t1) continue;
    // MW band center at this x position
    const bandY = 0.58 - x * 0.3 + lane.offset;
    if (Math.abs(y - bandY) < lane.width) return true;
  }
  return false;
}

/* ---------- Drawing ---------- */

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}

function draw() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  if (w < 10 || h < 10) return;

  const dist = currentParams.distance;
  const M_BH = currentParams.M_BH;
  const v = currentParams.v_star;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Impact blackout
  if (dist < 1) {
    if (dist < 0.3) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText("You wouldn't feel a thing.", w / 2, h / 2 - 20);
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillStyle = '#666688';
      ctx.fillText('At 954 km/s, the bow shock vaporizes everything instantly.', w / 2, h / 2 + 10);
      ctx.fillText('The planet is shredded by tidal forces before it even arrives.', w / 2, h / 2 + 30);
      ctx.restore();
      return;
    }
    const flashI = 1 - (dist - 0.05) / 0.95;
    ctx.fillStyle = `rgba(255,200,150,${flashI * 0.8})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Sky background gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#020208');
  sky.addColorStop(0.5, '#040410');
  sky.addColorStop(0.85, '#080614');
  sky.addColorStop(1, '#0c0a18');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Milky Way diffuse glow (subtle background before stars)
  drawMilkyWayGlow(w, h);

  // Nebula patches
  drawNebulae(w, h);

  // Where the BH is in the sky
  const cx = w * 0.5;
  const cy = h * 0.38;

  // Angular scale for features (grows as BH gets closer)
  const angularScale = Math.max(5, 200 / Math.sqrt(Math.max(dist, 0.5)));

  // Draw galaxies (behind everything)
  drawGalaxies(w, h, cx, cy, angularScale, dist);

  // Stars
  drawStars(w, h, cx, cy, angularScale, dist);

  // Gravitational lensing (distorted light ring)
  drawLensing(cx, cy, angularScale, dist, w, h);

  // Bow shock glow (ring/arc shape — the paraboloid seen head-on)
  drawBowShock(cx, cy, angularScale, dist, w, h);

  // Black hole shadow
  drawShadow(cx, cy, angularScale, dist);

  // Horizon
  drawHorizon(w, h);

  // Info overlay
  drawInfo(w, h, dist, v, M_BH);

  ctx.restore();
}

function drawMilkyWayGlow(w, h) {
  // Diagonal diffuse band of light
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.28);

  const grad = ctx.createLinearGradient(0, -h * 0.6, 0, h * 0.6);
  grad.addColorStop(0, 'rgba(30,30,60,0)');
  grad.addColorStop(0.35, 'rgba(35,30,55,0)');
  grad.addColorStop(0.44, 'rgba(50,42,70,0.04)');
  grad.addColorStop(0.48, 'rgba(60,48,80,0.07)');
  grad.addColorStop(0.50, 'rgba(65,52,85,0.09)');
  grad.addColorStop(0.52, 'rgba(60,48,80,0.07)');
  grad.addColorStop(0.56, 'rgba(50,42,70,0.04)');
  grad.addColorStop(0.65, 'rgba(35,30,55,0)');
  grad.addColorStop(1, 'rgba(30,30,60,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();
}

function drawNebulae(w, h) {
  for (const n of nebulaPatches) {
    const nx = n.x * w;
    const ny = n.y * h;
    const nr = n.radius * Math.max(w, h);
    const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    const [r, g, b] = n.rgb;
    grad.addColorStop(0, `rgba(${r},${g},${b},${n.brightness})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${n.brightness * 0.4})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
  }
}

function drawGalaxies(w, h, cx, cy, scale, dist) {
  for (const g of galaxies) {
    let gx = g.x * w;
    let gy = g.y * h;

    // Lensing displacement for galaxies too
    const dx = gx - cx;
    const dy = gy - cy;
    const r = Math.sqrt(dx * dx + dy * dy);
    const lensR = scale * 2.5;
    if (r < lensR * 3 && r > 1 && dist < 3000) {
      const strength = Math.max(0, 1 - r / (lensR * 3)) * scale * 0.2 * Math.min(1, 500 / dist);
      const angle = Math.atan2(dy, dx);
      gx += Math.cos(angle) * strength;
      gy += Math.sin(angle) * strength;
    }

    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(g.angle);
    ctx.scale(1, g.elongation);

    const gGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, g.size);
    gGrad.addColorStop(0, `rgba(180,170,200,${g.brightness})`);
    gGrad.addColorStop(0.4, `rgba(160,150,180,${g.brightness * 0.4})`);
    gGrad.addColorStop(1, 'rgba(100,90,120,0)');
    ctx.fillStyle = gGrad;
    ctx.beginPath();
    ctx.arc(0, 0, g.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function starColor(hue, b) {
  const a = Math.min(1, b);
  switch (hue) {
    case 'blue':   return `rgba(${170*b|0},${195*b|0},${255*b|0},${a})`;
    case 'orange': return `rgba(${255*b|0},${190*b|0},${130*b|0},${a})`;
    case 'red':    return `rgba(${255*b|0},${140*b|0},${120*b|0},${a})`;
    case 'yellow': return `rgba(${255*b|0},${240*b|0},${180*b|0},${a})`;
    default:       return `rgba(${250*b|0},${248*b|0},${245*b|0},${a})`;
  }
}

function drawStars(w, h, cx, cy, scale, dist) {
  const t = animTime * 0.001;
  const lensR = scale * 2.5;
  const bhNorm = dist / 5000;

  for (const s of stars) {
    let sx = s.x * w;
    let sy = s.y * h;

    const twinkle = 0.7 + 0.3 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
    let b = s.brightness * twinkle;
    let sz = s.size * twinkle;
    let hue = s.hue;

    const dx = sx - cx;
    const dy = sy - cy;
    const r = Math.sqrt(dx * dx + dy * dy);

    // Gravitational lensing: push stars outward from BH center
    if (r < lensR * 4 && r > 1 && dist < 4000) {
      const lensStrength = Math.max(0, 1 - r / (lensR * 4));
      const push = lensStrength * lensStrength * scale * 0.5 * Math.min(1, 800 / dist);
      const angle = Math.atan2(dy, dx);
      sx += Math.cos(angle) * push;
      sy += Math.sin(angle) * push;

      // Stars near the Einstein ring get brightened (magnification)
      const ringDist = Math.abs(r - lensR * 1.5);
      if (ringDist < lensR * 0.5) {
        const magnify = 1 + (1 - ringDist / (lensR * 0.5)) * 2 * Math.min(1, 500 / dist);
        b *= magnify;
        sz *= Math.sqrt(magnify);
      }
    }

    // Stars very close to center: absorbed by shadow
    if (r < scale * 0.4 && dist < 2000) {
      const shadowFade = r / (scale * 0.4);
      b *= shadowFade * shadowFade;
    }

    // Bow shock dimming: stars behind shock front get slightly reddened/dimmed
    if (s.depth > bhNorm && dist < 3000) {
      b *= 0.7;
      if (hue === 'white' || hue === 'blue') hue = 'orange'; // shock-reddened
    }

    ctx.fillStyle = starColor(hue, b);
    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fill();

    // Bright stars get diffraction spikes
    if (s.brightness > 0.8 && s.size > 1.5) {
      ctx.strokeStyle = starColor(hue, b * 0.6);
      ctx.lineWidth = 0.4;
      const sp = sz * 3;
      ctx.beginPath();
      ctx.moveTo(sx - sp, sy); ctx.lineTo(sx + sp, sy);
      ctx.moveTo(sx, sy - sp); ctx.lineTo(sx, sy + sp);
      ctx.stroke();
    }
  }
}

function drawLensing(cx, cy, scale, dist, w, h) {
  if (dist > 4000) return;
  const ringR = scale * 1.5;
  const intensity = Math.min(0.6, 50 / Math.max(dist, 1));

  // Einstein ring — arc of amplified/distorted background light
  ctx.strokeStyle = `rgba(200,185,255,${intensity * 0.5})`;
  ctx.lineWidth = Math.max(1, scale * 0.12);
  ctx.shadowColor = `rgba(180,160,255,${intensity * 0.3})`;
  ctx.shadowBlur = scale * 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Lensed arc images (distorted galaxy/star images around the ring)
  const arcCount = Math.min(16, Math.floor(25 / Math.sqrt(Math.max(dist, 10) / 30)));
  for (let i = 0; i < arcCount; i++) {
    const angle = (i / arcCount) * Math.PI * 2 + animTime * 0.00005;
    const wobble = ringR * (0.92 + 0.16 * Math.sin(angle * 5 + i * 1.3));
    const ax = cx + Math.cos(angle) * wobble;
    const ay = cy + Math.sin(angle) * wobble;
    const ab = 0.2 + 0.3 * Math.sin(angle * 3 + animTime * 0.0003);
    ctx.fillStyle = `rgba(190,180,240,${ab * intensity})`;
    ctx.beginPath();
    // Tangential arcs (stretched along the ring)
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle + Math.PI / 2);
    ctx.scale(2.5, 1);
    ctx.arc(0, 0, 1 + scale * 0.04, 0, Math.PI * 2);
    ctx.restore();
    ctx.fill();
  }
}

function drawBowShock(cx, cy, scale, dist, w, h) {
  // The bow shock is a paraboloid. Seen head-on, it appears as a RING
  // at the standoff distance (shock is ahead of the BH).
  // R_0 ~ 1.2 kpc ~ 3900 ly, but we scale for visual purposes.
  if (dist > 5000) return;

  const intensity = Math.min(0.5, 80 / Math.max(dist, 1));

  // Shock ring radius (larger than BH shadow, represents the standoff)
  const shockR = scale * 3.2;

  // Outer diffuse shock glow — ring-shaped, not centered
  ctx.lineWidth = Math.max(2, scale * 0.3);
  ctx.strokeStyle = `rgba(0,180,255,${intensity * 0.25})`;
  ctx.shadowColor = `rgba(0,160,255,${intensity * 0.2})`;
  ctx.shadowBlur = scale * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, shockR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner brighter edge (compressed gas)
  ctx.lineWidth = Math.max(1, scale * 0.12);
  ctx.strokeStyle = `rgba(50,200,255,${intensity * 0.4})`;
  ctx.shadowColor = `rgba(0,220,255,${intensity * 0.15})`;
  ctx.shadowBlur = scale * 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, shockR * 0.85, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Filled diffuse glow between rings (the shocked gas region)
  const shockFill = ctx.createRadialGradient(cx, cy, shockR * 0.6, cx, cy, shockR * 1.2);
  shockFill.addColorStop(0, 'rgba(0,0,0,0)');
  shockFill.addColorStop(0.5, `rgba(0,100,200,${intensity * 0.04})`);
  shockFill.addColorStop(0.75, `rgba(0,150,255,${intensity * 0.06})`);
  shockFill.addColorStop(0.9, `rgba(0,100,200,${intensity * 0.03})`);
  shockFill.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shockFill;
  ctx.beginPath();
  ctx.arc(cx, cy, shockR * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Approaching edge brighter (Doppler beaming — front is bluer/brighter)
  ctx.strokeStyle = `rgba(100,220,255,${intensity * 0.3})`;
  ctx.lineWidth = Math.max(1, scale * 0.15);
  ctx.beginPath();
  ctx.arc(cx, cy, shockR * 0.9, -0.6, 0.6);
  ctx.stroke();
}

function drawShadow(cx, cy, scale, dist) {
  const shadowR = Math.max(2, scale * 0.25);

  // Absolute dark void
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(cx, cy, shadowR, 0, Math.PI * 2);
  ctx.fill();

  // Photon ring — thin bright ring at the edge of the shadow
  if (dist < 3000) {
    const ri = Math.min(0.8, 60 / Math.max(dist, 1));
    ctx.strokeStyle = `rgba(255,140,50,${ri})`;
    ctx.lineWidth = Math.max(0.5, scale * 0.04);
    ctx.shadowColor = `rgba(255,120,30,${ri * 0.4})`;
    ctx.shadowBlur = scale * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, shadowR * 1.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Asymmetric accretion glow (relativistic beaming)
    const accGrad = ctx.createRadialGradient(
      cx - shadowR * 0.3, cy, shadowR * 0.4,
      cx, cy, shadowR * 2.2
    );
    accGrad.addColorStop(0, `rgba(255,100,30,${ri * 0.25})`);
    accGrad.addColorStop(0.5, `rgba(255,80,20,${ri * 0.08})`);
    accGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = accGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, shadowR * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHorizon(w, h) {
  const hy = h * 0.85;

  const gGrad = ctx.createLinearGradient(0, hy, 0, h);
  gGrad.addColorStop(0, '#0a0815');
  gGrad.addColorStop(1, '#0d0a18');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, hy, w, h - hy);

  ctx.strokeStyle = '#1a1530';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hy);
  ctx.lineTo(w, hy);
  ctx.stroke();

  // Landscape silhouette
  ctx.fillStyle = '#08060f';
  ctx.beginPath();
  ctx.moveTo(0, hy);
  for (let x = 0; x <= w; x += 3) {
    const hill = Math.sin(x * 0.008) * 8 + Math.sin(x * 0.02) * 4 + Math.sin(x * 0.05) * 2;
    ctx.lineTo(x, hy - Math.max(0, hill));
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

function formatCountdown(days) {
  if (days > 365.25 * 1e6) return `${(days / (365.25 * 1e6)).toFixed(1)} million years`;
  if (days > 365.25 * 1000) return `${(days / (365.25 * 1000)).toFixed(1)}k years`;
  if (days > 365.25) {
    const yr = Math.floor(days / 365.25);
    const d = Math.floor(days % 365.25);
    return yr > 10 ? `${yr.toLocaleString()} years` : `${yr}y ${d}d`;
  }
  if (days > 1) return `${Math.floor(days)} days`;
  if (days > 1/24) return `${Math.floor(days * 24)} hours`;
  return `${Math.floor(days * 24 * 60)} minutes`;
}

function drawInfo(w, h, dist, v, M_BH) {
  const dist_km = dist * 9.461e12;
  const time_s = dist_km / v;
  const time_days = time_s / 86400;
  const time_yr = time_s / (365.25 * 86400);

  let timeStr;
  if (time_yr > 1e6) timeStr = (time_yr / 1e6).toFixed(1) + ' Myr';
  else if (time_yr > 1000) timeStr = (time_yr / 1000).toFixed(1) + 'k yr';
  else timeStr = time_yr.toFixed(0) + ' yr';

  const einsteinAngle = Math.sqrt(4 * 6.674e-11 * M_BH * 1.989e30 / (2.998e8 ** 2 * dist * 9.461e15));
  const einsteinAs = einsteinAngle * 206265;

  // --- Big countdown timer (always visible, top-right) ---
  const countdownText = dist < 0.5 ? 'IMPACT' : formatCountdown(time_days);
  const countdownLabel = dist < 0.5 ? '' : 'TIME TO IMPACT';

  ctx.textAlign = 'right';
  if (dist >= 0.5) {
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#555570';
    ctx.fillText(countdownLabel, w - 15, 26);
  }
  ctx.font = `bold ${dist < 50 ? 22 : 18}px "JetBrains Mono", monospace`;
  // Color shifts from cyan → orange → red as it gets closer
  if (dist > 500) ctx.fillStyle = '#00ccff';
  else if (dist > 50) ctx.fillStyle = '#ff8844';
  else ctx.fillStyle = '#ff4466';
  ctx.fillText(countdownText, w - 15, dist >= 0.5 ? 44 : 35);

  // --- Info panel (left side) ---
  const px = 15, py = 15;
  ctx.fillStyle = 'rgba(5,5,16,0.75)';
  ctx.fillRect(px, py, 200, 105);
  ctx.strokeStyle = '#1a1a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, 200, 105);

  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';

  const lines = [
    { label: 'Distance', value: dist < 1 ? `${(dist*3.26).toFixed(1)} pc` : `${dist.toFixed(0)} ly`, color: '#00ccff' },
    { label: 'Arrival', value: timeStr, color: '#ff8844' },
    { label: 'Apparent \u03B8_E', value: einsteinAs > 1 ? `${einsteinAs.toFixed(1)}"` : `${(einsteinAs*1000).toFixed(1)} mas`, color: '#8888aa' },
    { label: 'v_approach', value: `${v} km/s`, color: '#00ccff' },
    { label: 'M_BH', value: `${(M_BH/1e7).toFixed(1)}\u00d710\u2077 M\u2609`, color: '#8888aa' },
  ];

  lines.forEach((l, i) => {
    const ly = py + 18 + i * 17;
    ctx.fillStyle = '#555570';
    ctx.fillText(l.label, px + 8, ly);
    ctx.fillStyle = l.color;
    ctx.fillText(l.value, px + 100, ly);
  });

  // Description
  ctx.fillStyle = '#444460';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  const descY = h * 0.85 + 20;

  if (dist > 2000) {
    ctx.fillText('A faint anomalous source appears — something is bending starlight...', w / 2, descY);
  } else if (dist > 500) {
    ctx.fillText('A growing ring of distorted light. Stars are bending around an invisible mass.', w / 2, descY);
  } else if (dist > 50) {
    ctx.fillText('The bow shock ring glows blue. The sky is warping. There is no escape.', w / 2, descY);
  } else if (dist > 5) {
    ctx.fillText('The sky tears open. Tidal forces shatter the planet\'s crust.', w / 2, descY);
  } else {
    ctx.fillText('Light bends in circles. Time itself is distorted.', w / 2, descY);
  }
}
