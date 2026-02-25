// Wake Velocity Profile Plot — Canvas 2D
// Delayed-mixing model (Eq 19) + shock velocity (Eq 13)

import { wakeVelocityCurve } from '../physics/wake.js';
import { shockVelocityCurve } from '../physics/shockvel.js';
import { DEFAULTS } from '../physics/constants.js';

let canvas, ctx;
let observedData = null;
let currentParams = {};
let dpr = 1;

const PLOT = {
  xMin: 0, xMax: 65,      // kpc
  yMin: -400, yMax: 50,    // km/s
  padLeft: 60, padRight: 20,
  padTop: 20, padBottom: 45,
};

export async function initWakeProfile(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;

  try {
    const resp = await fetch('data/observed-wake.json');
    const json = await resp.json();
    observedData = json.points;
  } catch (e) {
    console.warn('Could not load observed wake data:', e);
  }

  currentParams = { ...DEFAULTS };
  resize();
  draw();

  window.addEventListener('resize', () => { resize(); draw(); });
}

export function updateWakeProfile(params) {
  Object.assign(currentParams, params);
  draw();
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}

function toCanvasX(x) {
  const w = canvas.width / dpr - PLOT.padLeft - PLOT.padRight;
  return PLOT.padLeft + w * (x - PLOT.xMin) / (PLOT.xMax - PLOT.xMin);
}

function toCanvasY(y) {
  const h = canvas.height / dpr - PLOT.padTop - PLOT.padBottom;
  return PLOT.padTop + h * (1 - (y - PLOT.yMin) / (PLOT.yMax - PLOT.yMin));
}

function draw() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  drawGrid(w, h);
  drawAxes(w, h);
  drawShockVelocity();
  drawWakeCurve();
  if (observedData) drawObservedData();
  drawLabels(w, h);

  ctx.restore();
}

function drawGrid(w, h) {
  ctx.strokeStyle = '#1a1a3a';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= PLOT.xMax; x += 10) {
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, PLOT.padTop);
    ctx.lineTo(cx, h - PLOT.padBottom);
    ctx.stroke();
  }

  for (let y = Math.ceil(PLOT.yMin / 100) * 100; y <= PLOT.yMax; y += 100) {
    const cy = toCanvasY(y);
    ctx.beginPath();
    ctx.moveTo(PLOT.padLeft, cy);
    ctx.lineTo(w - PLOT.padRight, cy);
    ctx.stroke();
  }
}

function drawAxes(w, h) {
  ctx.strokeStyle = '#3a3a6a';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(PLOT.padLeft, h - PLOT.padBottom);
  ctx.lineTo(w - PLOT.padRight, h - PLOT.padBottom);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(PLOT.padLeft, PLOT.padTop);
  ctx.lineTo(PLOT.padLeft, h - PLOT.padBottom);
  ctx.stroke();

  ctx.fillStyle = '#555570';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';

  for (let x = 0; x <= PLOT.xMax; x += 10) {
    ctx.fillText(x.toString(), toCanvasX(x), h - PLOT.padBottom + 14);
  }

  ctx.textAlign = 'right';
  for (let y = Math.ceil(PLOT.yMin / 100) * 100; y <= PLOT.yMax; y += 100) {
    ctx.fillText(y.toString(), PLOT.padLeft - 6, toCanvasY(y) + 4);
  }

  // Zero line
  ctx.strokeStyle = '#252550';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(PLOT.padLeft, toCanvasY(0));
  ctx.lineTo(w - PLOT.padRight, toCanvasY(0));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawWakeCurve() {
  const curve = wakeVelocityCurve(currentParams, 400);

  ctx.strokeStyle = '#00ccff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ccff44';
  ctx.shadowBlur = 6;
  ctx.beginPath();

  let started = false;
  for (const pt of curve) {
    if (pt.r < PLOT.xMin || pt.r > PLOT.xMax) continue;
    const cx = toCanvasX(pt.r);
    const cy = toCanvasY(pt.v);
    if (!started) { ctx.moveTo(cx, cy); started = true; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawShockVelocity() {
  const curve = shockVelocityCurve(currentParams, 400);

  ctx.strokeStyle = '#8844ff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();

  let started = false;
  for (const pt of curve) {
    if (pt.r < PLOT.xMin || pt.r > PLOT.xMax) continue;
    // Negate for comparison with wake (both shown as negative in plot)
    const cy = toCanvasY(-pt.v);
    const cx = toCanvasX(pt.r);
    if (cy < PLOT.padTop || cy > (canvas.height / dpr - PLOT.padBottom)) continue;
    if (!started) { ctx.moveTo(cx, cy); started = true; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawObservedData() {
  ctx.fillStyle = '#ff8844';
  ctx.strokeStyle = '#ff884488';
  ctx.lineWidth = 1.5;

  for (const pt of observedData) {
    const cx = toCanvasX(pt.r);
    const cy = toCanvasY(pt.v);

    const eyTop = toCanvasY(pt.v + pt.v_err);
    const eyBot = toCanvasY(pt.v - pt.v_err);
    ctx.beginPath();
    ctx.moveTo(cx, eyTop);
    ctx.lineTo(cx, eyBot);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 3, eyTop);
    ctx.lineTo(cx + 3, eyTop);
    ctx.moveTo(cx - 3, eyBot);
    ctx.lineTo(cx + 3, eyBot);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLabels(w, h) {
  ctx.fillStyle = '#8888aa';
  ctx.font = '11px "Inter", sans-serif';

  ctx.textAlign = 'center';
  ctx.fillText('Distance from Galaxy (kpc)', (PLOT.padLeft + w - PLOT.padRight) / 2, h - 5);

  ctx.save();
  ctx.translate(13, (PLOT.padTop + h - PLOT.padBottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Velocity (km/s)', 0, 0);
  ctx.restore();

  // Legend
  const lx = PLOT.padLeft + 15;
  const ly = PLOT.padTop + 15;

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ccff';
  ctx.beginPath();
  ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly); ctx.stroke();
  ctx.fillStyle = '#8888aa';
  ctx.textAlign = 'left';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Wake (Eq 19)', lx + 23, ly + 3);

  ctx.strokeStyle = '#8844ff';
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(lx, ly + 16); ctx.lineTo(lx + 18, ly + 16); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('Shock vel (Eq 13)', lx + 23, ly + 19);

  ctx.fillStyle = '#ff8844';
  ctx.beginPath();
  ctx.arc(lx + 9, ly + 32, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8888aa';
  ctx.fillText('Observed', lx + 23, ly + 35);
}
