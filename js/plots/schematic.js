// Top-down schematic view — Wilkin bow shock with flow arrows
// Similar to Figure 3/4 of Van Dokkum et al. (2026)

import { wilkinR } from '../physics/bowshock.js';
import { DEFAULTS, degToRad } from '../physics/constants.js';

let canvas, ctx;
let dpr = 1;
let animTime = 0;
let currentParams = { ...DEFAULTS };

// Scene bounds in kpc
const VIEW = {
  xMin: -8, xMax: 20,  // along motion axis (BH moves in +x direction)
  yMin: -8, yMax: 8,   // perpendicular
  padLeft: 50, padRight: 20,
  padTop: 30, padBottom: 40,
};

export function initSchematic(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;

  resize();
  // Don't draw on init if canvas is hidden (zero size)
  if (canvas.width > 0 && canvas.height > 0) draw();

  window.addEventListener('resize', () => { resize(); if (canvas.width > 0 && canvas.height > 0) draw(); });
}

export function updateSchematic(params) {
  Object.assign(currentParams, params);
  draw();
}

export function animateSchematic(time) {
  animTime = time;
  draw();
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}

function toX(x) {
  const w = canvas.width / dpr - VIEW.padLeft - VIEW.padRight;
  return VIEW.padLeft + w * (x - VIEW.xMin) / (VIEW.xMax - VIEW.xMin);
}

function toY(y) {
  const h = canvas.height / dpr - VIEW.padTop - VIEW.padBottom;
  return VIEW.padTop + h * (1 - (y - VIEW.yMin) / (VIEW.yMax - VIEW.yMin));
}

function draw() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;
  if (w < 10 || h < 10) return; // Skip drawing if canvas is too small

  const R0 = currentParams.R_0 ?? DEFAULTS.R_0;
  const v_star = currentParams.v_star ?? DEFAULTS.v_star;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, w, h);

  drawGrid(w, h);
  drawAxes(w, h);
  drawWake(R0);
  drawBowShockProfile(R0);
  drawFlowArrows(R0, v_star);
  drawBH(R0);
  drawLabels(w, h, R0, v_star);
  drawScaleBar(w, h);

  ctx.restore();
}

function drawGrid(w, h) {
  ctx.strokeStyle = '#0d0d25';
  ctx.lineWidth = 0.5;

  for (let x = Math.ceil(VIEW.xMin); x <= VIEW.xMax; x += 2) {
    const cx = toX(x);
    ctx.beginPath();
    ctx.moveTo(cx, VIEW.padTop);
    ctx.lineTo(cx, h - VIEW.padBottom);
    ctx.stroke();
  }
  for (let y = Math.ceil(VIEW.yMin); y <= VIEW.yMax; y += 2) {
    const cy = toY(y);
    ctx.beginPath();
    ctx.moveTo(VIEW.padLeft, cy);
    ctx.lineTo(w - VIEW.padRight, cy);
    ctx.stroke();
  }
}

function drawAxes(w, h) {
  ctx.strokeStyle = '#1a1a3a';
  ctx.lineWidth = 1;

  // Central axis (motion direction)
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(VIEW.padLeft, toY(0));
  ctx.lineTo(w - VIEW.padRight, toY(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Tick labels
  ctx.fillStyle = '#444466';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (let x = Math.ceil(VIEW.xMin / 5) * 5; x <= VIEW.xMax; x += 5) {
    ctx.fillText(x + ' kpc', toX(x), h - VIEW.padBottom + 14);
  }
}

function drawBowShockProfile(R0) {
  // Draw Wilkin profile as a 2D cross-section (top half + bottom half)
  const nPts = 200;

  // Upper profile
  ctx.beginPath();
  for (let i = 0; i <= nPts; i++) {
    const theta = 0.01 + (Math.PI * 0.88) * i / nPts;
    const R = wilkinR(theta, R0);
    // x = along motion axis (BH at origin, moving in +x → shock opens to -x)
    // y = perpendicular
    const sx = -R * Math.cos(theta); // negative because shock opens behind BH in this view
    const sy = R * Math.sin(theta);

    if (i === 0) ctx.moveTo(toX(sx), toY(sy));
    else ctx.lineTo(toX(sx), toY(sy));
  }
  ctx.strokeStyle = '#00ccff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00ccff66';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Lower profile (mirror)
  ctx.beginPath();
  for (let i = 0; i <= nPts; i++) {
    const theta = 0.01 + (Math.PI * 0.88) * i / nPts;
    const R = wilkinR(theta, R0);
    const sx = -R * Math.cos(theta);
    const sy = -R * Math.sin(theta);

    if (i === 0) ctx.moveTo(toX(sx), toY(sy));
    else ctx.lineTo(toX(sx), toY(sy));
  }
  ctx.strokeStyle = '#00ccff';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00ccff66';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Fill the shock interior with a very subtle gradient
  ctx.beginPath();
  for (let i = 0; i <= nPts; i++) {
    const theta = 0.01 + (Math.PI * 0.88) * i / nPts;
    const R = wilkinR(theta, R0);
    const sx = -R * Math.cos(theta);
    const sy = R * Math.sin(theta);
    if (i === 0) ctx.moveTo(toX(sx), toY(sy));
    else ctx.lineTo(toX(sx), toY(sy));
  }
  for (let i = nPts; i >= 0; i--) {
    const theta = 0.01 + (Math.PI * 0.88) * i / nPts;
    const R = wilkinR(theta, R0);
    const sx = -R * Math.cos(theta);
    const sy = -R * Math.sin(theta);
    ctx.lineTo(toX(sx), toY(sy));
  }
  ctx.closePath();
  const gradRadius = Math.abs(toX(0) - toX(-6)) || 100;
  const grad = ctx.createRadialGradient(toX(R0), toY(0), 5, toX(R0), toY(0), gradRadius);
  grad.addColorStop(0, 'rgba(0, 204, 255, 0.08)');
  grad.addColorStop(0.5, 'rgba(136, 68, 255, 0.04)');
  grad.addColorStop(1, 'rgba(136, 68, 255, 0.01)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Wireframe grid lines on the shock surface (like the paper figure)
  ctx.strokeStyle = '#00ccff22';
  ctx.lineWidth = 0.5;

  // Meridional lines (constant phi)
  for (let ring = 1; ring <= 6; ring++) {
    const frac = ring / 7;
    ctx.beginPath();
    const theta = 0.01 + (Math.PI * 0.88) * frac;
    const R = wilkinR(theta, R0);
    const sx = -R * Math.cos(theta);
    const sy_top = R * Math.sin(theta);
    ctx.moveTo(toX(sx), toY(-sy_top));
    ctx.lineTo(toX(sx), toY(sy_top));
    ctx.stroke();
  }

  // Latitudinal lines (constant theta, shown as horizontal arcs)
  for (let ring = 1; ring <= 8; ring++) {
    const theta = 0.01 + (Math.PI * 0.85) * ring / 9;
    const R = wilkinR(theta, R0);
    const sy = R * Math.sin(theta);
    const sx = -R * Math.cos(theta);

    // Draw small circle cross-section indicator
    ctx.beginPath();
    ctx.ellipse(toX(sx), toY(0), 1, Math.abs(toY(0) - toY(sy)), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFlowArrows(R0, v_star) {
  // Upstream flow arrows (gas flowing toward BH from the right, in BH rest frame)
  const arrowColor = '#ff884488';
  const arrowColorBright = '#ff8844cc';

  // Free-stream arrows (upstream, far from shock)
  ctx.strokeStyle = arrowColor;
  ctx.fillStyle = arrowColor;
  ctx.lineWidth = 1.5;

  for (let y = -6; y <= 6; y += 1.5) {
    const xStart = -7;
    const xEnd = -4;

    // Animate: shift arrows
    const offset = ((animTime * 0.001 * v_star / 954) % 3);
    const xs = xStart - offset;

    drawArrow(toX(xs + 3), toY(y), toX(xs), toY(y), 8, arrowColor);
  }

  // Deflected flow arrows along the shock surface
  ctx.strokeStyle = arrowColorBright;
  ctx.fillStyle = arrowColorBright;
  ctx.lineWidth = 2;

  const arrowAngles = [0.3, 0.5, 0.7, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4];
  for (const theta of arrowAngles) {
    if (theta >= Math.PI * 0.85) continue;
    const R = wilkinR(theta, R0);
    const sx = -R * Math.cos(theta);
    const sy = R * Math.sin(theta);

    // Tangent direction along shock surface (flow direction)
    const dtheta = 0.05;
    const R2 = wilkinR(theta + dtheta, R0);
    const sx2 = -R2 * Math.cos(theta + dtheta);
    const sy2 = R2 * Math.sin(theta + dtheta);

    const dx = sx2 - sx;
    const dy = sy2 - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const arrowLen = 1.2;

    // Upper shock
    drawArrow(
      toX(sx), toY(sy),
      toX(sx + dx / len * arrowLen), toY(sy + dy / len * arrowLen),
      7, arrowColorBright
    );

    // Lower shock (mirror)
    drawArrow(
      toX(sx), toY(-sy),
      toX(sx + dx / len * arrowLen), toY(-sy - dy / len * arrowLen),
      7, arrowColorBright
    );
  }

  // Wake flow arrows (inside the wake, flowing backward)
  ctx.strokeStyle = '#8844ff88';
  ctx.fillStyle = '#8844ff88';
  for (let xw = 2; xw < 16; xw += 2.5) {
    drawArrow(toX(xw), toY(0.3), toX(xw + 1.5), toY(0.3), 6, '#8844ff66');
    drawArrow(toX(xw), toY(-0.3), toX(xw + 1.5), toY(-0.3), 6, '#8844ff66');
  }
}

function drawArrow(x1, y1, x2, y2, headSize, color) {
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  // Shaft
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headSize * Math.cos(angle - 0.4),
    y2 - headSize * Math.sin(angle - 0.4)
  );
  ctx.lineTo(
    x2 - headSize * Math.cos(angle + 0.4),
    y2 - headSize * Math.sin(angle + 0.4)
  );
  ctx.closePath();
  ctx.fill();
}

function drawWake(R0) {
  // Wake tube behind BH — tapered, fading
  const wakeStart = R0 * 0.3;
  const wakeEnd = 18;
  const wakeWidth = R0 * 1.2;

  const grad = ctx.createLinearGradient(toX(wakeStart), 0, toX(wakeEnd), 0);
  grad.addColorStop(0, 'rgba(0, 204, 255, 0.12)');
  grad.addColorStop(0.3, 'rgba(136, 68, 255, 0.08)');
  grad.addColorStop(1, 'rgba(136, 68, 255, 0.02)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(toX(wakeStart), toY(wakeWidth));

  // Upper edge: tapers gradually
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const x = wakeStart + (wakeEnd - wakeStart) * t;
    const y = wakeWidth * (1 - t * 0.3);
    ctx.lineTo(toX(x), toY(y));
  }

  // Lower edge
  for (let i = 40; i >= 0; i--) {
    const t = i / 40;
    const x = wakeStart + (wakeEnd - wakeStart) * t;
    const y = -wakeWidth * (1 - t * 0.3);
    ctx.lineTo(toX(x), toY(y));
  }

  ctx.closePath();
  ctx.fill();

  // Wake center line
  ctx.strokeStyle = '#8844ff44';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(toX(wakeStart), toY(0));
  ctx.lineTo(toX(wakeEnd), toY(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // "Galaxy" marker at far end of wake
  ctx.fillStyle = '#ff884466';
  ctx.beginPath();
  ctx.arc(toX(wakeEnd + 0.5), toY(0), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff884488';
  ctx.font = '10px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Host Galaxy', toX(wakeEnd + 0.5), toY(0) + 18);
}

function drawBH(R0) {
  // SMBH at origin
  const bx = toX(R0);
  const by = toY(0);

  // Accretion glow
  const glowGrad = ctx.createRadialGradient(bx, by, 2, bx, by, 20);
  glowGrad.addColorStop(0, 'rgba(255, 102, 34, 0.6)');
  glowGrad.addColorStop(0.5, 'rgba(255, 102, 34, 0.15)');
  glowGrad.addColorStop(1, 'rgba(255, 102, 34, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(bx, by, 20, 0, Math.PI * 2);
  ctx.fill();

  // BH sphere
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(bx, by, 5, 0, Math.PI * 2);
  ctx.fill();

  // Ring
  ctx.strokeStyle = '#ff6622';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(bx, by, 9, 3, 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#ff8844';
  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SMBH', bx, by - 16);

  // Standoff distance annotation
  ctx.strokeStyle = '#00ccff66';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(0) - 3);
  ctx.lineTo(toX(0), toY(0) - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, by - 3);
  ctx.lineTo(bx, by - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // R0 dimension line
  ctx.strokeStyle = '#00ccff88';
  ctx.lineWidth = 1;
  const dimY = toY(0) - 18;
  ctx.beginPath();
  ctx.moveTo(toX(0), dimY);
  ctx.lineTo(bx, dimY);
  ctx.stroke();
  // Arrowheads
  drawArrow(toX(0) + 1, dimY, toX(0), dimY, 4, '#00ccff88');
  drawArrow(bx - 1, dimY, bx, dimY, 4, '#00ccff88');

  ctx.fillStyle = '#00ccff';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`R₀ = ${R0.toFixed(1)} kpc`, (toX(0) + bx) / 2, dimY - 5);

  // Velocity arrow
  const velArrowLen = 40;
  ctx.lineWidth = 2;
  drawArrow(bx + 8, by, bx + 8 + velArrowLen, by, 10, '#00ff88cc');
  ctx.fillStyle = '#00ff88';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`v★ = ${(currentParams.v_star ?? 954)} km/s`, bx + 12 + velArrowLen, by + 4);
}

function drawLabels(w, h, R0, v_star) {
  // Title
  ctx.fillStyle = '#8888aa';
  ctx.font = '12px "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Bow Shock Schematic (Side View)', VIEW.padLeft, 18);

  // Annotations
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillStyle = '#00ccff88';
  ctx.textAlign = 'center';

  // "flow surface" label on the shock
  const labelTheta = 0.6;
  const labelR = wilkinR(labelTheta, R0);
  const lx = -labelR * Math.cos(labelTheta);
  const ly = labelR * Math.sin(labelTheta);
  ctx.fillText('Shock Surface', toX(lx) - 30, toY(ly) - 8);

  // Wake label
  ctx.fillStyle = '#8844ff88';
  ctx.fillText('Wake', toX(10), toY(0) - 14);

  // CGM label
  ctx.fillStyle = '#ff884466';
  ctx.textAlign = 'left';
  ctx.fillText('CGM gas', toX(-7), toY(5));

  // Mach number
  const mach = v_star / (0.013 * Math.sqrt(currentParams.T_cgm ?? 1e6));
  ctx.fillStyle = '#555570';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Mach ${mach.toFixed(1)}`, w - VIEW.padRight - 5, 18);
}

function drawScaleBar(w, h) {
  // 5 kpc scale bar
  const barLen = toX(5) - toX(0);
  const bx = w - VIEW.padRight - barLen - 10;
  const by = h - 12;

  ctx.strokeStyle = '#555570';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + barLen, by);
  ctx.stroke();

  // End ticks
  ctx.beginPath();
  ctx.moveTo(bx, by - 3); ctx.lineTo(bx, by + 3);
  ctx.moveTo(bx + barLen, by - 3); ctx.lineTo(bx + barLen, by + 3);
  ctx.stroke();

  ctx.fillStyle = '#555570';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('5 kpc', bx + barLen / 2, by - 6);
}
