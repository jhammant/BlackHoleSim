// Planet's Eye View — What the night sky looks like as RBH-1 approaches
// Shows gravitational lensing ring, bow shock glow, and growing apparent size

import { DEFAULTS, degToRad } from '../physics/constants.js';

let canvas, ctx;
let dpr = 1;
let animTime = 0;
let currentParams = {
  distance: 500, // light-years from the BH
  v_star: DEFAULTS.v_star,
  M_BH: DEFAULTS.M_BH,
};

// Random star catalog for the night sky (generated once)
let stars = [];
const STAR_COUNT = 600;

export function initPlanetView(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;

  // Generate random star field
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 2,
      brightness: 0.3 + Math.random() * 0.7,
      hue: Math.random() < 0.3 ? 220 : Math.random() < 0.6 ? 40 : 0, // blue, warm, white
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 2,
    });
  }

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

export function animatePlanetView(time) {
  animTime = time;
  if (autoAnimate) {
    if (!autoStartTime) autoStartTime = time;
    const elapsed = (time - autoStartTime) * 0.001; // seconds
    // Go from 5000 ly to 0 over ~20 seconds, then hold at 0
    const t = Math.min(1, elapsed / 20);
    const dist = 5000 * Math.pow(1 - t, 3); // cubic ease — accelerates as it approaches
    currentParams.distance = Math.max(0.01, dist);
    // Update slider if it exists
    const slider = document.querySelector('#planetview-sliders input[type="range"]');
    if (slider) slider.value = currentParams.distance;
  }
  draw();
}

export function startAutoApproach() {
  autoAnimate = true;
  autoStartTime = 0;
  currentParams.distance = 5000;
}

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

  const dist = currentParams.distance; // light-years
  const M_BH = currentParams.M_BH;
  const v = currentParams.v_star;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Impact / blackout when very close
  if (dist < 1) {
    const fade = Math.max(0, dist);
    // Screen goes white flash then black
    if (dist < 0.3) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('You wouldn\'t feel a thing.', w / 2, h / 2 - 20);
      ctx.font = '12px "Inter", sans-serif';
      ctx.fillStyle = '#666688';
      ctx.fillText('At 954 km/s, the bow shock vaporizes everything instantly.', w / 2, h / 2 + 10);
      ctx.fillText('The planet is shredded by tidal forces before it even arrives.', w / 2, h / 2 + 30);
      ctx.restore();
      return;
    }
    // White flash transition
    const flashIntensity = 1 - (dist - 0.05) / 0.95;
    ctx.fillStyle = `rgba(255, 200, 150, ${flashIntensity * 0.8})`;
    ctx.fillRect(0, 0, w, h);
  }

  // Night sky background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#020208');
  skyGrad.addColorStop(0.7, '#050510');
  skyGrad.addColorStop(1, '#0a0815');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Milky Way band (subtle)
  drawMilkyWay(w, h);

  // Draw background stars with twinkle
  drawStars(w, h);

  // Center of view = where the BH is approaching from
  const cx = w * 0.5;
  const cy = h * 0.4;

  // Angular size of various features scales inversely with distance
  // Einstein ring angular radius ~ sqrt(4GM/c²d) ~ sqrt(M_BH/d) in appropriate units
  // At 500 ly with 2e7 solar masses, the Einstein ring would be tiny but we scale for visualization
  const angularScale = Math.max(5, 200 / Math.sqrt(dist));

  // Draw the BH and its effects
  drawGravitationalLensing(cx, cy, angularScale, dist, M_BH, w, h);
  drawBowShockGlow(cx, cy, angularScale, dist, v, w, h);
  drawBlackHoleShadow(cx, cy, angularScale, dist);

  // Info overlay
  drawInfoOverlay(w, h, dist, v, M_BH);

  // Horizon line
  drawHorizon(w, h);

  ctx.restore();
}

function drawMilkyWay(w, h) {
  // Subtle diagonal band
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.3);

  const bandGrad = ctx.createLinearGradient(0, -h, 0, h);
  bandGrad.addColorStop(0, 'rgba(40, 40, 80, 0)');
  bandGrad.addColorStop(0.35, 'rgba(40, 40, 80, 0)');
  bandGrad.addColorStop(0.45, 'rgba(60, 55, 90, 0.06)');
  bandGrad.addColorStop(0.5, 'rgba(70, 60, 100, 0.08)');
  bandGrad.addColorStop(0.55, 'rgba(60, 55, 90, 0.06)');
  bandGrad.addColorStop(0.65, 'rgba(40, 40, 80, 0)');
  bandGrad.addColorStop(1, 'rgba(40, 40, 80, 0)');

  ctx.fillStyle = bandGrad;
  ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.restore();
}

function drawStars(w, h) {
  const t = animTime * 0.001;

  for (const star of stars) {
    const sx = star.x * w;
    const sy = star.y * h * 0.85; // keep above horizon

    const twinkle = 0.7 + 0.3 * Math.sin(t * star.twinkleSpeed + star.twinklePhase);
    const b = star.brightness * twinkle;

    if (star.hue === 0) {
      ctx.fillStyle = `rgba(${255 * b}, ${250 * b}, ${245 * b}, ${b})`;
    } else if (star.hue === 220) {
      ctx.fillStyle = `rgba(${180 * b}, ${200 * b}, ${255 * b}, ${b})`;
    } else {
      ctx.fillStyle = `rgba(${255 * b}, ${220 * b}, ${180 * b}, ${b})`;
    }

    ctx.beginPath();
    ctx.arc(sx, sy, star.size * twinkle, 0, Math.PI * 2);
    ctx.fill();

    // Bright stars get a cross/spike
    if (star.brightness > 0.8 && star.size > 1.5) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.5;
      const spikeLen = star.size * 3 * twinkle;
      ctx.beginPath();
      ctx.moveTo(sx - spikeLen, sy); ctx.lineTo(sx + spikeLen, sy);
      ctx.moveTo(sx, sy - spikeLen); ctx.lineTo(sx, sy + spikeLen);
      ctx.stroke();
    }
  }
}

function drawGravitationalLensing(cx, cy, scale, dist, M_BH, w, h) {
  // Einstein ring — visible as a ring of distorted/brightened background stars
  const ringRadius = scale * 1.8;

  if (dist < 2000) {
    // Lensing ring glow
    ctx.strokeStyle = `rgba(200, 180, 255, ${Math.min(0.5, 30 / dist)})`;
    ctx.lineWidth = Math.max(1, scale * 0.15);
    ctx.shadowColor = 'rgba(180, 160, 255, 0.3)';
    ctx.shadowBlur = scale * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Distorted/brightened arc images of background stars
    const arcCount = Math.min(12, Math.floor(20 / Math.sqrt(dist / 50)));
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + animTime * 0.0001;
      const arcR = ringRadius * (0.9 + 0.2 * Math.sin(angle * 3 + animTime * 0.002));
      const ax = cx + Math.cos(angle) * arcR;
      const ay = cy + Math.sin(angle) * arcR;

      const arcBright = 0.3 + 0.4 * Math.sin(angle * 2 + animTime * 0.001);
      ctx.fillStyle = `rgba(200, 190, 255, ${arcBright * Math.min(1, 50 / dist)})`;
      ctx.beginPath();
      ctx.arc(ax, ay, 1 + scale * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBowShockGlow(cx, cy, scale, dist, v, w, h) {
  // Bow shock produces Hα and [OIII] emission — visible as a faint reddish/blue glow
  // around the BH, forming a parabolic shape opening away from observer
  if (dist > 5000) return;

  const shockRadius = scale * 2.5;
  const intensity = Math.min(0.6, 100 / dist);

  // Diffuse shock glow — crescent shape (we see the approaching side)
  const shockGrad = ctx.createRadialGradient(cx, cy, scale * 0.5, cx, cy, shockRadius);
  shockGrad.addColorStop(0, `rgba(0, 180, 255, ${intensity * 0.3})`);
  shockGrad.addColorStop(0.4, `rgba(0, 150, 255, ${intensity * 0.15})`);
  shockGrad.addColorStop(0.7, `rgba(100, 50, 200, ${intensity * 0.05})`);
  shockGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = shockGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, shockRadius, 0, Math.PI * 2);
  ctx.fill();

  // Bright rim on the approaching edge
  ctx.strokeStyle = `rgba(0, 200, 255, ${intensity * 0.4})`;
  ctx.lineWidth = Math.max(1, scale * 0.1);
  ctx.shadowColor = `rgba(0, 200, 255, ${intensity * 0.3})`;
  ctx.shadowBlur = scale * 0.8;
  ctx.beginPath();
  ctx.arc(cx, cy, shockRadius * 0.7, -0.8, 0.8);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawBlackHoleShadow(cx, cy, scale, dist) {
  // The black hole shadow — absolutely dark circle where no light escapes
  const shadowRadius = Math.max(2, scale * 0.3);

  // Dark shadow
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, shadowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Thin photon ring — the light bending around the event horizon
  if (dist < 3000) {
    const ringIntensity = Math.min(0.8, 80 / dist);
    ctx.strokeStyle = `rgba(255, 140, 50, ${ringIntensity})`;
    ctx.lineWidth = Math.max(0.5, scale * 0.05);
    ctx.shadowColor = `rgba(255, 120, 30, ${ringIntensity * 0.5})`;
    ctx.shadowBlur = scale * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, shadowRadius * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Accretion glow — asymmetric due to relativistic beaming
    const accGrad = ctx.createRadialGradient(
      cx - shadowRadius * 0.3, cy, shadowRadius * 0.5,
      cx, cy, shadowRadius * 2.5
    );
    accGrad.addColorStop(0, `rgba(255, 100, 30, ${ringIntensity * 0.3})`);
    accGrad.addColorStop(0.5, `rgba(255, 80, 20, ${ringIntensity * 0.1})`);
    accGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = accGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, shadowRadius * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHorizon(w, h) {
  const hy = h * 0.85;

  // Ground gradient
  const groundGrad = ctx.createLinearGradient(0, hy, 0, h);
  groundGrad.addColorStop(0, '#0a0815');
  groundGrad.addColorStop(1, '#0d0a18');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, hy, w, h - hy);

  // Horizon line
  ctx.strokeStyle = '#1a1530';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hy);
  ctx.lineTo(w, hy);
  ctx.stroke();

  // Silhouette of landscape
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

function drawInfoOverlay(w, h, dist, v, M_BH) {
  // Time to arrival
  const dist_km = dist * 9.461e12; // ly to km
  const time_seconds = dist_km / v;
  const time_years = time_seconds / (365.25 * 86400);

  let timeStr;
  if (time_years > 1e6) timeStr = (time_years / 1e6).toFixed(1) + ' Myr';
  else if (time_years > 1000) timeStr = (time_years / 1000).toFixed(1) + 'k yr';
  else timeStr = time_years.toFixed(0) + ' yr';

  // Angular size of Einstein ring
  const einsteinAngle = Math.sqrt(4 * 6.674e-11 * M_BH * 1.989e30 / (2.998e8 * 2.998e8 * dist * 9.461e15));
  const einsteinArcsec = einsteinAngle * 206265;

  // Info panel
  const px = 15;
  const py = 15;
  ctx.fillStyle = 'rgba(5, 5, 16, 0.75)';
  ctx.fillRect(px, py, 200, 105);
  ctx.strokeStyle = '#1a1a3a';
  ctx.lineWidth = 1;
  ctx.strokeRect(px, py, 200, 105);

  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';

  const lines = [
    { label: 'Distance', value: dist < 1 ? `${(dist * 3.26).toFixed(1)} pc` : `${dist.toFixed(0)} ly`, color: '#00ccff' },
    { label: 'Arrival', value: timeStr, color: '#ff8844' },
    { label: 'Apparent θ_E', value: einsteinArcsec > 1 ? `${einsteinArcsec.toFixed(1)}"` : `${(einsteinArcsec * 1000).toFixed(1)} mas`, color: '#8888aa' },
    { label: 'v_approach', value: `${v} km/s`, color: '#00ccff' },
    { label: 'M_BH', value: `${(M_BH / 1e7).toFixed(1)}×10⁷ M☉`, color: '#8888aa' },
  ];

  lines.forEach((line, i) => {
    const ly = py + 18 + i * 17;
    ctx.fillStyle = '#555570';
    ctx.fillText(line.label, px + 8, ly);
    ctx.fillStyle = line.color;
    ctx.fillText(line.value, px + 100, ly);
  });

  // Description at bottom
  ctx.fillStyle = '#444460';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  const descY = h * 0.85 + 20;

  if (dist > 1000) {
    ctx.fillText('A faint anomalous blue source appears in the sky...', w / 2, descY);
  } else if (dist > 100) {
    ctx.fillText('The Einstein ring becomes visible. Background stars distort around a dark void.', w / 2, descY);
  } else if (dist > 10) {
    ctx.fillText('The bow shock glows visibly. The sky warps. There is no escape.', w / 2, descY);
  } else {
    ctx.fillText('The sky tears open. Tidal forces shatter the planet.', w / 2, descY);
  }
}
