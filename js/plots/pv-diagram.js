// Position-Velocity Diagram — Canvas 2D
// Implements Eq 8 model curve with observed data overlay

import { pvModelCurve } from '../physics/velocity.js';
import { DEFAULTS } from '../physics/constants.js';

let canvas, ctx;
let observedData = null;
let currentParams = {};
let dpr = 1;

// Plot bounds
const PLOT = {
  xMin: -3, xMax: 3,     // kpc
  yMin: -800, yMax: 200,  // km/s
  padLeft: 60, padRight: 20,
  padTop: 20, padBottom: 45,
};

export async function initPVDiagram(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  dpr = window.devicePixelRatio || 1;

  // Load observed data
  try {
    const resp = await fetch('data/observed-pv.json');
    const json = await resp.json();
    observedData = json.points;
  } catch (e) {
    console.warn('Could not load observed PV data:', e);
  }

  currentParams = { ...DEFAULTS };
  resize();
  draw();

  window.addEventListener('resize', () => { resize(); draw(); });
}

export function updatePVDiagram(params) {
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
  const { padLeft, padRight } = PLOT;
  const w = canvas.width / dpr - padLeft - padRight;
  return padLeft + w * (x - PLOT.xMin) / (PLOT.xMax - PLOT.xMin);
}

function toCanvasY(y) {
  const { padTop, padBottom } = PLOT;
  const h = canvas.height / dpr - padTop - padBottom;
  return padTop + h * (1 - (y - PLOT.yMin) / (PLOT.yMax - PLOT.yMin));
}

function draw() {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  drawGrid(w, h);
  drawAxes(w, h);
  drawModelCurve();
  if (observedData) drawObservedData();
  drawLabels(w, h);

  ctx.restore();
}

function drawGrid(w, h) {
  ctx.strokeStyle = '#1a1a3a';
  ctx.lineWidth = 0.5;

  // Vertical grid
  for (let x = Math.ceil(PLOT.xMin); x <= PLOT.xMax; x++) {
    const cx = toCanvasX(x);
    ctx.beginPath();
    ctx.moveTo(cx, PLOT.padTop);
    ctx.lineTo(cx, h - PLOT.padBottom);
    ctx.stroke();
  }

  // Horizontal grid
  for (let y = Math.ceil(PLOT.yMin / 200) * 200; y <= PLOT.yMax; y += 200) {
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

  // X axis
  ctx.beginPath();
  ctx.moveTo(PLOT.padLeft, h - PLOT.padBottom);
  ctx.lineTo(w - PLOT.padRight, h - PLOT.padBottom);
  ctx.stroke();

  // Y axis
  ctx.beginPath();
  ctx.moveTo(PLOT.padLeft, PLOT.padTop);
  ctx.lineTo(PLOT.padLeft, h - PLOT.padBottom);
  ctx.stroke();

  // Tick labels
  ctx.fillStyle = '#555570';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';

  for (let x = Math.ceil(PLOT.xMin); x <= PLOT.xMax; x++) {
    ctx.fillText(x.toString(), toCanvasX(x), h - PLOT.padBottom + 14);
  }

  ctx.textAlign = 'right';
  for (let y = Math.ceil(PLOT.yMin / 200) * 200; y <= PLOT.yMax; y += 200) {
    ctx.fillText(y.toString(), PLOT.padLeft - 6, toCanvasY(y) + 4);
  }

  // Zero line
  if (PLOT.yMin < 0 && PLOT.yMax > 0) {
    ctx.strokeStyle = '#252550';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PLOT.padLeft, toCanvasY(0));
    ctx.lineTo(w - PLOT.padRight, toCanvasY(0));
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawModelCurve() {
  const curve = pvModelCurve(currentParams, 300);

  ctx.strokeStyle = '#00ccff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00ccff44';
  ctx.shadowBlur = 6;
  ctx.beginPath();

  let started = false;
  for (const pt of curve) {
    const cx = toCanvasX(pt.x);
    const cy = toCanvasY(pt.v);
    if (!started) {
      ctx.moveTo(cx, cy);
      started = true;
    } else {
      ctx.lineTo(cx, cy);
    }
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawObservedData() {
  ctx.fillStyle = '#ff8844';
  ctx.strokeStyle = '#ff884488';
  ctx.lineWidth = 1.5;

  for (const pt of observedData) {
    const cx = toCanvasX(pt.x);
    const cy = toCanvasY(pt.v);

    // Error bar
    const eyTop = toCanvasY(pt.v + pt.v_err);
    const eyBot = toCanvasY(pt.v - pt.v_err);
    ctx.beginPath();
    ctx.moveTo(cx, eyTop);
    ctx.lineTo(cx, eyBot);
    ctx.stroke();

    // Caps
    ctx.beginPath();
    ctx.moveTo(cx - 3, eyTop);
    ctx.lineTo(cx + 3, eyTop);
    ctx.moveTo(cx - 3, eyBot);
    ctx.lineTo(cx + 3, eyBot);
    ctx.stroke();

    // Point
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLabels(w, h) {
  // Axis labels
  ctx.fillStyle = '#8888aa';
  ctx.font = '11px "Inter", sans-serif';

  ctx.textAlign = 'center';
  ctx.fillText('Projected Position (kpc)', (PLOT.padLeft + w - PLOT.padRight) / 2, h - 5);

  ctx.save();
  ctx.translate(13, (PLOT.padTop + h - PLOT.padBottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('LOS Velocity (km/s)', 0, 0);
  ctx.restore();

  // Legend
  const lx = w - PLOT.padRight - 120;
  const ly = PLOT.padTop + 15;

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ccff';
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx + 18, ly);
  ctx.stroke();
  ctx.fillStyle = '#8888aa';
  ctx.textAlign = 'left';
  ctx.font = '10px "Inter", sans-serif';
  ctx.fillText('Model (Eq 8)', lx + 23, ly + 3);

  ctx.fillStyle = '#ff8844';
  ctx.beginPath();
  ctx.arc(lx + 9, ly + 16, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8888aa';
  ctx.fillText('Observed', lx + 23, ly + 19);
}
