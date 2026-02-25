// App bootstrap — event bus, parameter state, animation loop

import { DEFAULTS } from './physics/constants.js';
import { initScene, getScene, getCamera, registerAnimationCallback, animate } from './viz/scene3d.js';
import { createSMBH, updateSMBH } from './viz/smbh-object.js';
import { createBowShockMesh, updateBowShockMesh } from './viz/bowshock-mesh.js';
import { createParticles, updateParticles, setParticleParams } from './viz/particles.js';
import { createWakeTrail, updateWakeTrail } from './viz/wake-trail.js';
import { createEncounterScene, setEncounterActive, setEncounterParams, updateEncounter } from './viz/planetary-encounter.js';
import { initPVDiagram, updatePVDiagram } from './plots/pv-diagram.js';
import { initWakeProfile, updateWakeProfile } from './plots/wake-profile.js';
import { initSchematic, updateSchematic, animateSchematic } from './plots/schematic.js';
import { initPlanetView, updatePlanetView, animatePlanetView, startAutoApproach } from './plots/planetview.js';
import { createSliderGroup, PV_SLIDERS, WAKE_SLIDERS, ENCOUNTER_SLIDERS } from './ui/sliders.js';
import { initDashboard, updateDashboard } from './ui/dashboard.js';
import { initTabs } from './ui/tabs.js';
import { standoffFromRc } from './physics/energetics.js';

// Global parameter state
const state = { ...DEFAULTS };
let lastTime = 0;
let encounterActive = false;
let schematicActive = false;
let planetViewActive = false;
let easyMode = true; // Start in easy mode

const FUN_FACTS = [
  'This black hole is moving 300\u00d7 faster than a bullet',
  'Its wake is longer than 2 Milky Way galaxies side by side',
  'It crosses an entire solar system in about 75 days',
  'It weighs as much as 20 million Suns',
  'The trail of stars it leaves behind is 200,000 light-years long',
  'It was kicked out of its galaxy by three colliding black holes',
  'The gas in its bow shock is heated to 1,000,000\u00b0C',
  'It\'s moving at 0.3% the speed of light \u2014 fast enough to cross the US in 5 seconds',
  'First confirmed by JWST in 2026',
];

export async function init() {
  // Initialize tabs
  initTabs();

  // Initialize 3D scene
  const sceneContainer = document.getElementById('scene-container');
  initScene(sceneContainer);

  const scene = getScene();
  const camera = getCamera();

  // Create 3D objects
  createSMBH(scene);
  createBowShockMesh(scene, state.R_0);
  createParticles(scene);
  createWakeTrail(scene, state);

  // Create encounter scene (hidden by default)
  const encounterInfo = document.getElementById('encounter-info');
  createEncounterScene(scene, encounterInfo);

  // Initialize plots
  const pvCanvas = document.getElementById('pv-canvas');
  const wakeCanvas = document.getElementById('wake-canvas');
  const schematicCanvas = document.getElementById('schematic-canvas');
  if (pvCanvas) await initPVDiagram(pvCanvas);
  if (wakeCanvas) await initWakeProfile(wakeCanvas);
  if (schematicCanvas) {
    try { initSchematic(schematicCanvas); } catch (e) { console.warn('Schematic init deferred:', e); }
  }
  const planetviewCanvas = document.getElementById('planetview-canvas');
  if (planetviewCanvas) {
    try { initPlanetView(planetviewCanvas); } catch (e) { console.warn('PlanetView init deferred:', e); }
  }

  // Initialize dashboard
  initDashboard();

  // Setup sliders
  setupSliders();

  // Setup toolbar
  setupToolbar();

  // Register animation callback
  registerAnimationCallback((time) => {
    const dt = lastTime ? time - lastTime : 16;
    lastTime = time;

    updateSMBH(time, camera);
    updateBowShockMesh(time, state.R_0);
    updateParticles(time, dt);
    updateWakeTrail(time);

    if (encounterActive) {
      updateEncounter(time, camera);
    }

    if (schematicActive) animateSchematic(time);
    if (planetViewActive) animatePlanetView(time);
  });

  // Start animation
  animate(0);

  // Update header velocity readout
  updateVelocityReadout(state.v_star);

  // Easy/Complex mode toggle
  setupModeToggle();

  // Splash screen
  const splashBtn = document.getElementById('splash-enter');
  if (splashBtn) {
    splashBtn.addEventListener('click', () => {
      document.getElementById('intro-splash').classList.add('hidden');
      setTimeout(() => { document.getElementById('intro-splash').style.display = 'none'; }, 700);
    });
  }

  // Fun facts rotation
  setInterval(() => {
    const el = document.getElementById('fun-fact-text');
    if (el && easyMode) {
      el.textContent = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
    }
  }, 5000);

  // Set initial mode
  setMode('easy');
}

function setupSliders() {
  // PV sliders
  const pvSliderPanel = document.getElementById('pv-sliders');
  if (pvSliderPanel) {
    createSliderGroup(pvSliderPanel, PV_SLIDERS, (param, value) => {
      state[param] = value;
      updatePVDiagram(state);
      updateDashboard(state);
      if (param === 'v_star') {
        setParticleParams({ v_star: value });
        updateWakeProfile(state);
        updateVelocityReadout(value);
      }
      if (param === 'R_c') {
        state.R_0 = standoffFromRc(value);
        setParticleParams({ R_0: state.R_0 });
      }
    });
  }

  // Wake sliders
  const wakeSliderPanel = document.getElementById('wake-sliders');
  if (wakeSliderPanel) {
    createSliderGroup(wakeSliderPanel, WAKE_SLIDERS, (param, value) => {
      state[param] = value;
      updateWakeProfile(state);
      updateDashboard(state);
      if (param === 'v_star') {
        setParticleParams({ v_star: value });
        updatePVDiagram(state);
        updateVelocityReadout(value);
      }
      if (param === 'R_c') {
        state.R_0 = standoffFromRc(value);
        setParticleParams({ R_0: state.R_0 });
      }
    });
  }

  // Schematic sliders
  const schematicSliderPanel = document.getElementById('schematic-sliders');
  if (schematicSliderPanel) {
    const SCHEMATIC_SLIDERS = [
      { label: 'v★', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s' },
      { label: 'R₀', param: 'R_0', min: 0.3, max: 3.0, step: 0.1, value: 1.2, unit: 'kpc' },
      { label: 'R_c', param: 'R_c', min: 0.5, max: 5.0, step: 0.1, value: 1.8, unit: 'kpc' },
    ];
    createSliderGroup(schematicSliderPanel, SCHEMATIC_SLIDERS, (param, value) => {
      state[param] = value;
      if (param === 'R_c') {
        state.R_0 = standoffFromRc(value);
      }
      updateSchematic(state);
      updateDashboard(state);
    });
  }

  // Planet view sliders
  const pvSliderPanel2 = document.getElementById('planetview-sliders');
  if (pvSliderPanel2) {
    const PV_VIEW_SLIDERS = [
      { label: 'Dist', param: 'distance', min: 1, max: 5000, step: 10, value: 500, unit: 'ly',
        format: v => v < 1 ? `${(v*3.26).toFixed(1)} pc` : `${v} ly` },
      { label: 'v★', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s' },
    ];
    createSliderGroup(pvSliderPanel2, PV_VIEW_SLIDERS, (param, value) => {
      updatePlanetView({ [param]: value });
    });
  }

  // Auto-approach button for planet view
  if (pvSliderPanel2) {
    const btn = document.createElement('button');
    btn.className = 'splash-btn';
    btn.style.cssText = 'margin-top:10px;padding:8px 20px;font-size:12px;width:100%;';
    btn.textContent = 'Watch It Approach';
    btn.addEventListener('click', startAutoApproach);
    pvSliderPanel2.appendChild(btn);
  }

  // Encounter sliders
  const encSliderPanel = document.getElementById('encounter-sliders');
  if (encSliderPanel) {
    createSliderGroup(encSliderPanel, ENCOUNTER_SLIDERS, (param, value) => {
      if (param === 'enc_mass') {
        setEncounterParams({ mass: Math.pow(10, value) });
      } else if (param === 'enc_vel') {
        setEncounterParams({ velocity: value });
      } else if (param === 'enc_dist') {
        setEncounterParams({ closestApproach: value });
      }
    });

    // Timeline slider
    const timelineRow = document.createElement('div');
    timelineRow.className = 'timeline-slider';
    timelineRow.innerHTML = `
      <div class="slider-row">
        <label style="min-width:60px">Timeline</label>
        <input type="range" min="0" max="1" step="0.005" value="0.5" id="timeline-slider">
        <span class="slider-value" id="timeline-value">Closest</span>
      </div>
    `;
    encSliderPanel.appendChild(timelineRow);

    const tlSlider = document.getElementById('timeline-slider');
    const tlValue = document.getElementById('timeline-value');
    tlSlider.addEventListener('input', () => {
      const v = parseFloat(tlSlider.value);
      setEncounterParams({ timeline: v });
      const phases = ['Approach', 'Disruption', 'Closest', 'Slingshot', 'Aftermath'];
      tlValue.textContent = phases[Math.min(4, Math.floor(v * 5))];
    });

    // Mode toggle
    const modeRow = document.createElement('div');
    modeRow.className = 'slider-row';
    modeRow.style.marginTop = '8px';
    modeRow.innerHTML = `
      <label style="min-width:60px">Mode</label>
      <div class="toggle-group">
        <button class="toggle-btn active" data-mode="flyby">Near Miss</button>
        <button class="toggle-btn" data-mode="direct">Direct Hit</button>
      </div>
    `;
    encSliderPanel.appendChild(modeRow);

    modeRow.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modeRow.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setEncounterParams({ mode: btn.dataset.mode });
      });
    });
  }
}

function setupToolbar() {
  // Frame toggle
  const frameToggles = document.querySelectorAll('#frame-toggle .toggle-btn');
  frameToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      frameToggles.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Frame mode switching would affect particle simulation
    });
  });

  // Speed slider
  const speedSlider = document.getElementById('speed-slider');
  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      // Speed control for animation
    });
  }

  // Vectors checkbox
  const vectorsToggle = document.getElementById('vectors-toggle');
  if (vectorsToggle) {
    vectorsToggle.addEventListener('change', () => {
      // Toggle velocity arrows
    });
  }
}

// Tab change handler — activate/deactivate encounter mode
window.addEventListener('tabchange', (e) => {
  const tab = e.detail.tab;
  encounterActive = (tab === 'tab-encounter');
  schematicActive = (tab === 'tab-schematic');
  planetViewActive = (tab === 'tab-planetview');
  setEncounterActive(encounterActive);

  // Resize plots on tab switch
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 50);
});

function updateVelocityReadout(v) {
  const el = document.getElementById('velocity-value');
  if (el) el.textContent = `${v.toFixed(0)} km/s`;
  const fracEl = document.getElementById('velocity-frac');
  if (fracEl) fracEl.textContent = `(${(v / 299792 * 100).toFixed(2)}% c)`;
  const humanEl = document.getElementById('velocity-human');
  if (humanEl) humanEl.textContent = `(${(v * 2236.94).toLocaleString('en', {maximumFractionDigits:0})} mph)`;
}

function setupModeToggle() {
  const toggleBtns = document.querySelectorAll('#mode-toggle .toggle-btn');
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setMode(btn.dataset.mode);
    });
  });
}

function setMode(mode) {
  easyMode = (mode === 'easy');
  document.body.className = `mode-${mode}`;

  // Update tab labels
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const label = easyMode ? btn.dataset.easy : btn.dataset.complex;
    if (label) btn.textContent = label;
  });

  // Show/hide fun facts
  const ff = document.getElementById('fun-facts');
  if (ff) ff.style.display = easyMode ? 'block' : 'none';

  // Trigger resize for any visible plots
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}
