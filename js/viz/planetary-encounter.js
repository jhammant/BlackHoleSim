// Planetary Encounter Mode — "What happens to a solar system in its path"
// Pre-simulates gravitational interaction so planets are dramatically ejected.

import * as THREE from 'three';

const AU_SCALE = 0.02;

const PLANETS = [
  ['Mercury', 0.39, 0.003, 0xaaaaaa],
  ['Venus',   0.72, 0.006, 0xddaa55],
  ['Earth',   1.0,  0.006, 0x4488cc],
  ['Mars',    1.52, 0.004, 0xcc5533],
  ['Jupiter', 5.2,  0.015, 0xddaa77],
  ['Saturn',  9.5,  0.013, 0xccbb88],
  ['Uranus', 19.2,  0.009, 0x88bbcc],
  ['Neptune',30.0,  0.008, 0x4466cc],
];

let encounterGroup;
let starMesh, planetMeshes = [], orbitLines = [];
let bhIndicator, bhTrail;
let encounterParams = {
  mass: Math.pow(10, 7.3),
  velocity: 954,
  closestApproach: 50,
  timeline: 0.5,
  mode: 'flyby',
};
let infoEl = null;
let isActive = false;

// Pre-simulated planet states: array of {planets: [{x,y,z}...], bhX, bhZ}
let simFrames = null;
let lastSimKey = '';

export function createEncounterScene(scene, infoPanelEl) {
  infoEl = infoPanelEl;
  encounterGroup = new THREE.Group();
  encounterGroup.visible = false;

  // Star (Sun analog)
  const starGeo = new THREE.SphereGeometry(0.03, 32, 32);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
  starMesh = new THREE.Mesh(starGeo, starMat);
  encounterGroup.add(starMesh);

  // Star glow
  const glowGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffdd44, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending,
  });
  encounterGroup.add(new THREE.Mesh(glowGeo, glowMat));

  // Planets
  PLANETS.forEach(([name, radiusAU, size, color]) => {
    const pMesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({ color })
    );
    pMesh.userData = { name, radiusAU, originalRadius: radiusAU, angle: Math.random() * Math.PI * 2 };
    planetMeshes.push(pMesh);
    encounterGroup.add(pMesh);

    // Orbit ring
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radiusAU * AU_SCALE, 0, Math.sin(a) * radiusAU * AU_SCALE));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x333366, transparent: true, opacity: 0.4 })
    );
    orbitLines.push(line);
    encounterGroup.add(line);
  });

  // BH indicator
  const bhGeo = new THREE.SphereGeometry(0.04, 32, 32);
  bhIndicator = new THREE.Mesh(bhGeo, new THREE.MeshBasicMaterial({ color: 0x000000 }));

  // BH glow ring
  const bhGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.12, 32),
    new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  );
  bhIndicator.add(bhGlow);
  encounterGroup.add(bhIndicator);

  // BH trail
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(300), 3));
  bhTrail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.4 }));
  encounterGroup.add(bhTrail);

  // Shock cone
  const shockMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 0.4, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  );
  shockMesh.rotation.x = Math.PI;
  bhIndicator.add(shockMesh);

  scene.add(encounterGroup);
}

export function setEncounterActive(active) {
  isActive = active;
  if (encounterGroup) encounterGroup.visible = active;
}

export function setEncounterParams(params) {
  Object.assign(encounterParams, params);
  // Invalidate simulation when params change
  const key = `${encounterParams.mass}_${encounterParams.velocity}_${encounterParams.closestApproach}_${encounterParams.mode}`;
  if (key !== lastSimKey) {
    runSimulation();
    lastSimKey = key;
  }
}

/* ---------- Pre-simulation ---------- */

function runSimulation() {
  const STEPS = 300;
  const M = encounterParams.mass;
  const isDirect = encounterParams.mode === 'direct';
  const dMin = isDirect ? 0 : encounterParams.closestApproach;

  // BH traversal: it crosses from z = -3 to z = +3 (scene units)
  // That's ±150 AU at AU_SCALE=0.02
  const BH_RANGE = 3.0;

  // Initialize planet states
  const planets = PLANETS.map(([name, rAU, size, color], i) => {
    const angle = planetMeshes[i]?.userData.angle || (i * 0.7);
    return {
      x: Math.cos(angle) * rAU * AU_SCALE,
      y: 0,
      z: Math.sin(angle) * rAU * AU_SCALE,
      vx: 0, vy: 0, vz: 0,
      rAU,
      disrupted: false,
      originalColor: color,
    };
  });

  simFrames = [];

  for (let step = 0; step <= STEPS; step++) {
    const t = step / STEPS;
    const bhZ = (t - 0.5) * 2 * BH_RANGE;
    const bhX = dMin * AU_SCALE;

    // Save frame
    simFrames.push({
      t,
      bhX, bhZ,
      planets: planets.map(p => ({ x: p.x, y: p.y, z: p.z, disrupted: p.disrupted })),
    });

    // Physics step: apply BH gravity to each planet
    const dt = 1 / STEPS;
    for (const p of planets) {
      const dx = bhX - p.x;
      const dy = -p.y;
      const dz = bhZ - p.z;
      const dist2 = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(dist2) || 0.001;
      const distAU = dist / AU_SCALE;

      // Gravitational acceleration: G*M/r^2, scaled for visual effect
      // M is in solar masses. Real tidal radius ~ (M)^(1/3) AU.
      // We want strong disruption when BH is within ~100 AU
      const accelMag = M * 2e-8 * AU_SCALE / (dist2 + 0.0001) * dt;

      if (distAU < 800) {
        p.vx += (dx / dist) * accelMag;
        p.vy += (dy / dist) * accelMag * 0.3;
        p.vz += (dz / dist) * accelMag;

        if (accelMag > 0.0002) p.disrupted = true;
      }

      // Solar gravity (weak restoring force for undisrupted planets)
      if (!p.disrupted) {
        const sr = Math.sqrt(p.x * p.x + p.z * p.z) || 0.001;
        // Tangential orbital velocity
        const orbSpeed = 0.0004 / Math.sqrt(Math.max(p.rAU, 0.1));
        p.vx += (-p.z / sr) * orbSpeed;
        p.vz += (p.x / sr) * orbSpeed;
        // Radial restoring
        const target = p.rAU * AU_SCALE;
        const radialForce = (sr - target) * 0.02;
        p.vx -= (p.x / sr) * radialForce * dt;
        p.vz -= (p.z / sr) * radialForce * dt;
      }

      // Damping for undisrupted (keeps orbits stable)
      if (!p.disrupted) {
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vz *= 0.97;
      }

      // Integrate position
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
    }
  }
}

/* ---------- Rendering ---------- */

export function updateEncounter(time, camera) {
  if (!isActive || !encounterGroup) return;

  // Ensure simulation exists
  if (!simFrames) runSimulation();

  const t = encounterParams.timeline;
  const M_bh = encounterParams.mass;
  const v_bh = encounterParams.velocity;
  const d_min = encounterParams.closestApproach;
  const isDirect = encounterParams.mode === 'direct';

  // Find the simulation frame for this timeline position
  const frameIdx = Math.min(simFrames.length - 1, Math.floor(t * (simFrames.length - 1)));
  const nextIdx = Math.min(simFrames.length - 1, frameIdx + 1);
  const frame = simFrames[frameIdx];
  const nextFrame = simFrames[nextIdx];
  const frac = (t * (simFrames.length - 1)) - frameIdx;

  // BH position (interpolated)
  const bhX = frame.bhX + (nextFrame.bhX - frame.bhX) * frac;
  const bhZ = frame.bhZ + (nextFrame.bhZ - frame.bhZ) * frac;
  bhIndicator.position.set(bhX, 0, bhZ);

  // BH trail
  const trailPos = bhTrail.geometry.attributes.position.array;
  const trailCount = Math.min(100, frameIdx + 1);
  for (let i = 0; i < trailCount; i++) {
    const fi = Math.max(0, frameIdx - i);
    trailPos[i * 3] = simFrames[fi].bhX;
    trailPos[i * 3 + 1] = 0;
    trailPos[i * 3 + 2] = simFrames[fi].bhZ;
  }
  bhTrail.geometry.attributes.position.needsUpdate = true;
  bhTrail.geometry.setDrawRange(0, trailCount);

  // Update planets from simulation
  planetMeshes.forEach((mesh, idx) => {
    const fp = frame.planets[idx];
    const np = nextFrame.planets[idx];
    mesh.position.set(
      fp.x + (np.x - fp.x) * frac,
      fp.y + (np.y - fp.y) * frac,
      fp.z + (np.z - fp.z) * frac,
    );

    // Color shift to red when disrupted
    if (fp.disrupted) {
      mesh.material.color.lerp(new THREE.Color(0xff2200), 0.02);
    }

    // Orbit line fades when disrupted
    if (orbitLines[idx]) {
      orbitLines[idx].material.opacity = fp.disrupted ? Math.max(0.05, 0.4 * (1 - t * 2)) : 0.4;
    }
  });

  // Star tidal stretching on direct hit
  if (isDirect && Math.abs(t - 0.5) < 0.15) {
    const stretch = 1 + (1 - Math.abs(t - 0.5) / 0.15) * 2;
    starMesh.scale.set(1, 1, stretch);
    starMesh.material.color.lerp(new THREE.Color(0xff4400), 0.02);
  } else {
    starMesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
  }

  // Distance for info
  const distToBH_AU = Math.sqrt(bhX * bhX + bhZ * bhZ) / AU_SCALE;
  const tidalR = Math.pow(M_bh, 1 / 3);
  updateInfoCallout(t, distToBH_AU, tidalR, d_min, v_bh, M_bh);
}

function updateInfoCallout(t, dist, tidalR, dMin, vel, mass) {
  if (!infoEl) return;

  const isEasy = document.body.classList.contains('mode-easy');
  const crossingDays = (200 * 1.496e8 / vel / 86400).toFixed(0);
  let phase, description;

  if (isEasy) {
    if (t < 0.2) {
      phase = "IT'S COMING";
      description = `A 20-million-sun black hole is heading this way at ${(vel * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph. ` +
        `It will cross the entire solar system in just ${crossingDays} days. The outer planets are already starting to wobble.`;
    } else if (t < 0.4) {
      phase = 'CHAOS BEGINS';
      description = `Neptune and Uranus are being yanked out of their orbits. ` +
        `The black hole's gravity is ${mass.toExponential(1)} times stronger than our Sun. Moons are ripped from planets.`;
    } else if (t < 0.6) {
      phase = 'CLOSEST POINT';
      description = `The black hole is passing ${dMin === 0 ? 'right through the center' : dMin + ' AU from our star'}. ` +
        `A wall of million-degree gas is sweeping through. Atmospheres are blasted off.`;
    } else if (t < 0.8) {
      phase = 'FLUNG INTO SPACE';
      description = `Planets are being launched out of the solar system like pinballs. ` +
        `Some will wander space forever as rogue planets. Others are dragged along by the black hole.`;
    } else {
      phase = 'GONE';
      description = `The solar system is destroyed. Total time: ~${crossingDays} days. ` +
        `The star sits alone. The black hole moves on, unstoppable.`;
    }
  } else {
    if (t < 0.2) {
      phase = 'APPROACH';
      description = `BH approaching at ${vel} km/s (${(vel / 299792 * 100).toFixed(2)}% c). ` +
        `Crosses ~200 AU in ${crossingDays} days. Outer orbits perturbed.`;
    } else if (t < 0.4) {
      phase = 'OUTER DISRUPTION';
      description = `Tidal radius: ${tidalR.toFixed(0)} AU. Outer planet Hill spheres collapsing.`;
    } else if (t < 0.6) {
      phase = 'CLOSEST APPROACH';
      description = `BH at ${dMin} AU from star. M_BH = ${(mass / 1e7).toFixed(1)}×10⁷ M☉. Bow shock sweeping system.`;
    } else if (t < 0.8) {
      phase = 'SLINGSHOT';
      description = `Planets ejected at high velocity. Some captured into BH orbits.`;
    } else {
      phase = 'AFTERMATH';
      description = `System destroyed in ~${crossingDays} days. Surviving planets are rogue worlds.`;
    }
  }

  infoEl.innerHTML = `<h4>${phase}</h4><p>${description}</p>`;
}

export function getEncounterGroup() { return encounterGroup; }
