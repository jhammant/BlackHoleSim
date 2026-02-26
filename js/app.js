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
import { initEncounterDiagram, updateEncounterDiagram, stopAnimation } from './plots/encounter-diagram.js';
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
let animSpeed = 1; // Animation speed multiplier (0=paused, 1=normal, 3=fast)

const FUN_FACTS = [
  'This black hole moves 300\u00d7 faster than a bullet',
  'Its wake is longer than 2 Milky Way galaxies placed side by side',
  'It crosses an entire solar system in about 75 days',
  'It weighs as much as 20 million Suns \u2014 or 6 trillion Earths',
  'The trail of stars behind it is 200,000 light-years long',
  'It was kicked out of its galaxy by three colliding black holes',
  'The gas in its bow shock reaches 1,000,000\u00b0C \u2014 hotter than the Sun\'s surface',
  'At 0.3% light speed, it could cross the US in 5 seconds',
  'First confirmed by the James Webb Space Telescope in 2026',
  'At this speed, it would reach the Moon from Earth in 6.5 minutes',
  'It creates new stars as it moves \u2014 the wake glows with baby star clusters',
  'Nothing can stop it. It will travel through space essentially forever',
  'If it passed through our solar system, every planet would be flung into deep space',
  'The bow shock in front of it is larger than most galaxies',
  'It moves 70\u00d7 faster than the Space Station orbits Earth',
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
  const encounterCanvas = document.getElementById('encounter-canvas');
  if (encounterCanvas) {
    try { initEncounterDiagram(encounterCanvas); } catch (e) { console.warn('EncounterDiagram init deferred:', e); }
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
    const realDt = lastTime ? time - lastTime : 16;
    lastTime = time;
    const dt = realDt * animSpeed;
    const scaledTime = time * animSpeed;

    updateSMBH(scaledTime, camera);
    updateBowShockMesh(scaledTime, state.R_0);
    updateParticles(scaledTime, dt);
    updateWakeTrail(scaledTime);

    if (encounterActive) {
      updateEncounter(scaledTime, camera);
    }

    if (schematicActive) animateSchematic(scaledTime);
    if (planetViewActive) animatePlanetView(time); // planetview uses real time for auto-approach
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

  // Fun facts rotation with crossfade
  setInterval(() => {
    const el = document.getElementById('fun-fact-text');
    if (el && easyMode) {
      el.classList.add('fading');
      setTimeout(() => {
        el.textContent = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
        el.classList.remove('fading');
      }, 400);
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
      { label: 'v★', easyLabel: 'Speed', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s',
        tooltip: 'How fast the black hole moves through space',
        easyFormat: v => `${(v * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph` },
      { label: 'R₀', easyLabel: 'Standoff', param: 'R_0', min: 0.3, max: 3.0, step: 0.1, value: 1.2, unit: 'kpc',
        tooltip: 'Distance from the black hole to the shock front' },
      { label: 'R_c', easyLabel: 'Curve', param: 'R_c', min: 0.5, max: 5.0, step: 0.1, value: 1.8, unit: 'kpc',
        tooltip: 'How curved the shock front is' },
    ];
    createSliderGroup(schematicSliderPanel, SCHEMATIC_SLIDERS, (param, value) => {
      state[param] = value;
      if (param === 'R_c') {
        state.R_0 = standoffFromRc(value);
      }
      if (param === 'v_star') {
        setParticleParams({ v_star: value });
        updateVelocityReadout(value);
        updatePVDiagram(state);
        updateWakeProfile(state);
      }
      updateSchematic(state);
      updateDashboard(state);
    });
  }

  // Planet view sliders
  const pvSliderPanel2 = document.getElementById('planetview-sliders');
  if (pvSliderPanel2) {
    const PV_VIEW_SLIDERS = [
      { label: 'Dist', easyLabel: 'Distance', param: 'distance', min: 1, max: 5000, step: 10, value: 500, unit: 'ly',
        tooltip: 'How far away the black hole is from your planet',
        format: v => v < 1 ? `${(v*3.26).toFixed(1)} pc` : `${v} ly`,
        easyFormat: v => {
          if (v < 1) return 'Impact!';
          if (v < 100) return `${v} ly (very close!)`;
          return `${v.toLocaleString()} light-years`;
        }},
      { label: 'v★', easyLabel: 'Speed', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s',
        tooltip: 'Black hole approach speed',
        easyFormat: v => `${(v * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph` },
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
        updateEncounterDiagram({ mass: Math.pow(10, value) });
      } else if (param === 'enc_vel') {
        setEncounterParams({ velocity: value });
        updateEncounterDiagram({ velocity: value });
      } else if (param === 'enc_dist') {
        setEncounterParams({ closestApproach: value });
        updateEncounterDiagram({ closestApproach: value });
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
      stopAnimation(); // Stop auto-play when user scrubs manually
      const v = parseFloat(tlSlider.value);
      setEncounterParams({ timeline: v });
      updateEncounterDiagram({ timeline: v });
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
        updateEncounterDiagram({ mode: btn.dataset.mode });
      });
    });
  }
}

function setupToolbar() {
  // Speed slider — controls animation playback speed
  const speedSlider = document.getElementById('speed-slider');
  const speedLabel = document.getElementById('speed-label');
  if (speedSlider) {
    speedSlider.addEventListener('input', () => {
      animSpeed = parseFloat(speedSlider.value);
      if (speedLabel) {
        if (animSpeed === 0) speedLabel.textContent = 'Paused';
        else if (animSpeed === 1) speedLabel.textContent = '1x';
        else speedLabel.textContent = animSpeed.toFixed(1) + 'x';
      }
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
