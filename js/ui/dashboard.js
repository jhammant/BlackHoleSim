// Dashboard overlay — derived quantities readout

import { computeDashboard } from '../physics/energetics.js';

let dashEl = null;
let easyDashEl = null;

// Complex mode rows (original)
const ROWS = [
  { key: 'M_BH', label: 'M_BH', format: v => `${(v / 1e7).toFixed(1)}×10⁷`, unit: 'M☉' },
  { key: 'R_0', label: 'R₀', format: v => v.toFixed(2), unit: 'kpc' },
  { key: 'R_c', label: 'R_c', format: v => v.toFixed(2), unit: 'kpc' },
  { key: 'mach', label: 'Mach', format: v => v.toFixed(1), unit: '' },
  { key: 't_wake', label: 't_wake', format: v => v.toFixed(1), unit: 'Myr' },
  { key: 'v_shock_tip', label: 'v_shock', format: v => v.toFixed(0), unit: 'km/s' },
  { key: 'v_los_wake', label: 'v_LOS', format: v => v.toFixed(0), unit: 'km/s' },
  { key: 'v_frac_c', label: 'v/c', format: v => (v * 100).toFixed(2) + '%', unit: '' },
];

// Easy mode rows — relatable comparisons
const EASY_ROWS = [
  {
    key: 'v_star',
    icon: '🚀',
    format: v => {
      const mph = (v * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const bulletX = Math.round(v / 0.46).toLocaleString(); // avg bullet ~460 m/s = 0.46 km/s
      return `<span class="easy-dash-value">${mph} mph</span><span class="easy-dash-comp">${bulletX}x faster than a bullet</span>`;
    }
  },
  {
    key: 'M_BH',
    icon: '⚫',
    format: v => {
      const suns = (v / 1e6).toFixed(0);
      const earths = (v * 333000).toExponential(1); // 1 sun = 333,000 earths
      return `<span class="easy-dash-value">${suns} million Suns</span><span class="easy-dash-comp">Heavier than 6 trillion Earths</span>`;
    }
  },
  {
    key: 'mach',
    icon: '💨',
    format: v => {
      return `<span class="easy-dash-value">Mach ${v.toFixed(0)}</span><span class="easy-dash-comp">${v.toFixed(0)}x the speed of sound in space gas</span>`;
    }
  },
  {
    key: 't_wake',
    icon: '⏱️',
    format: v => {
      const dinosaurX = (v / 66).toFixed(0);
      return `<span class="easy-dash-value">${v.toFixed(0)} million years old</span><span class="easy-dash-comp">${dinosaurX}x older than the dinosaur extinction</span>`;
    }
  },
];

export function initDashboard() {
  dashEl = document.getElementById('dashboard');

  // Create easy mode dashboard
  easyDashEl = document.createElement('div');
  easyDashEl.id = 'easy-dashboard';
  easyDashEl.className = 'easy-only';
  const sceneContainer = document.getElementById('scene-container');
  if (sceneContainer) sceneContainer.appendChild(easyDashEl);

  if (!dashEl && !easyDashEl) return;
  const data = computeDashboard();
  renderDashboard(data);
  renderEasyDashboard(data);
}

export function updateDashboard(params) {
  const data = computeDashboard(params);
  if (dashEl) renderDashboard(data);
  if (easyDashEl) renderEasyDashboard(data);
}

function renderDashboard(data) {
  if (!dashEl) return;
  dashEl.innerHTML = ROWS.map(row => {
    const val = data[row.key];
    if (val === undefined) return '';
    return `<div class="dash-row">
      <span class="dash-label">${row.label}</span>
      <span class="dash-value">${row.format(val)}<span class="dash-unit">${row.unit}</span></span>
    </div>`;
  }).join('');
}

function renderEasyDashboard(data) {
  if (!easyDashEl) return;
  easyDashEl.innerHTML = '<div class="easy-dash-title">Key Facts</div>' +
    EASY_ROWS.map(row => {
      const val = data[row.key];
      if (val === undefined) return '';
      return `<div class="easy-dash-row">
        <span class="easy-dash-icon">${row.icon}</span>
        <div class="easy-dash-content">${row.format(val)}</div>
      </div>`;
    }).join('');
}
