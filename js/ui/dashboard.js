// Dashboard overlay — derived quantities readout

import { computeDashboard } from '../physics/energetics.js';

let dashEl = null;

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

export function initDashboard() {
  dashEl = document.getElementById('dashboard');
  if (!dashEl) return;
  renderDashboard(computeDashboard());
}

export function updateDashboard(params) {
  if (!dashEl) return;
  const data = computeDashboard(params);
  renderDashboard(data);
}

function renderDashboard(data) {
  dashEl.innerHTML = ROWS.map(row => {
    const val = data[row.key];
    if (val === undefined) return '';
    return `<div class="dash-row">
      <span class="dash-label">${row.label}</span>
      <span class="dash-value">${row.format(val)}<span class="dash-unit">${row.unit}</span></span>
    </div>`;
  }).join('');
}
