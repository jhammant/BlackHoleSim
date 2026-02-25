// Planetary Encounter Mode — "What happens to a solar system in its path"
// Shows orbital disruption, tidal effects, and bow shock interaction

import * as THREE from 'three';

const AU_SCALE = 0.02; // visual scale: 1 AU = 0.02 scene units
const TIME_SCALE = 1.0; // adjustable with slider

// Planet data [name, orbital radius AU, size (visual), color]
const PLANETS = [
  ['Mercury', 0.39, 0.003, 0xaaaaaa],
  ['Venus', 0.72, 0.006, 0xddaa55],
  ['Earth', 1.0, 0.006, 0x4488cc],
  ['Mars', 1.52, 0.004, 0xcc5533],
  ['Jupiter', 5.2, 0.015, 0xddaa77],
  ['Saturn', 9.5, 0.013, 0xccbb88],
  ['Uranus', 19.2, 0.009, 0x88bbcc],
  ['Neptune', 30.0, 0.008, 0x4466cc],
];

let encounterGroup;
let starMesh, planetMeshes = [], orbitLines = [];
let bhIndicator;
let bhTrail;
let encounterParams = {
  mass: Math.pow(10, 7.3), // solar masses
  velocity: 954,           // km/s
  closestApproach: 50,     // AU
  timeline: 0.5,           // 0 = approach, 1 = aftermath
  mode: 'flyby',           // 'direct' or 'flyby'
};
let infoEl = null;
let isActive = false;

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
    color: 0xffdd44,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
  });
  encounterGroup.add(new THREE.Mesh(glowGeo, glowMat));

  // Planets
  PLANETS.forEach(([name, radiusAU, size, color]) => {
    const pGeo = new THREE.SphereGeometry(size, 16, 16);
    const pMat = new THREE.MeshBasicMaterial({ color });
    const pMesh = new THREE.Mesh(pGeo, pMat);
    pMesh.userData = { name, radiusAU, originalRadius: radiusAU, angle: Math.random() * Math.PI * 2 };
    planetMeshes.push(pMesh);
    encounterGroup.add(pMesh);

    // Orbit ring
    const orbitPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(
        Math.cos(a) * radiusAU * AU_SCALE,
        0,
        Math.sin(a) * radiusAU * AU_SCALE
      ));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x333366,
      transparent: true,
      opacity: 0.4,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLines.push(orbitLine);
    encounterGroup.add(orbitLine);
  });

  // BH indicator (approaching)
  const bhGeo = new THREE.SphereGeometry(0.04, 32, 32);
  const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  bhIndicator = new THREE.Mesh(bhGeo, bhMat);

  // BH glow
  const bhGlowGeo = new THREE.RingGeometry(0.05, 0.12, 32);
  const bhGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff6622,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const bhGlow = new THREE.Mesh(bhGlowGeo, bhGlowMat);
  bhIndicator.add(bhGlow);
  encounterGroup.add(bhIndicator);

  // BH trail
  const trailGeo = new THREE.BufferGeometry();
  const trailPositions = new Float32Array(300);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  const trailMat = new THREE.LineBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.4,
  });
  bhTrail = new THREE.Line(trailGeo, trailMat);
  encounterGroup.add(bhTrail);

  // Shock wave indicator (simplified cone)
  const shockGeo = new THREE.ConeGeometry(0.15, 0.4, 16, 1, true);
  const shockMat = new THREE.MeshBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const shockCone = new THREE.Mesh(shockGeo, shockMat);
  shockCone.rotation.x = Math.PI; // open toward direction of motion
  bhIndicator.add(shockCone);

  scene.add(encounterGroup);
}

export function setEncounterActive(active) {
  isActive = active;
  if (encounterGroup) encounterGroup.visible = active;
}

export function setEncounterParams(params) {
  Object.assign(encounterParams, params);
}

export function updateEncounter(time, camera) {
  if (!isActive || !encounterGroup) return;

  const t = encounterParams.timeline; // 0 to 1
  const M_bh = encounterParams.mass;
  const v_bh = encounterParams.velocity;
  const d_min = encounterParams.closestApproach;
  const isDirect = encounterParams.mode === 'direct';

  // BH position along its trajectory
  // At t=0: far approach, t=0.5: closest, t=1.0: departed
  const bhDist = (t - 0.5) * 2.0; // -1 to +1, in scene units (scaled)
  const approachOffset = isDirect ? 0 : d_min * AU_SCALE;

  bhIndicator.position.set(
    approachOffset,
    0,
    bhDist * 1.5 // z-axis approach
  );

  // BH trail
  const trailPos = bhTrail.geometry.attributes.position.array;
  const trailCount = 100;
  for (let i = 0; i < trailCount; i++) {
    const tt = t - i * 0.005;
    const bd = (tt - 0.5) * 2.0;
    trailPos[i * 3] = approachOffset;
    trailPos[i * 3 + 1] = 0;
    trailPos[i * 3 + 2] = bd * 1.5;
  }
  bhTrail.geometry.attributes.position.needsUpdate = true;
  bhTrail.geometry.setDrawRange(0, trailCount);

  // Tidal influence calculation
  const bhWorldPos = new THREE.Vector3();
  bhIndicator.getWorldPosition(bhWorldPos);
  const distToBH_AU = bhWorldPos.length() / AU_SCALE;

  // Hill sphere: r_Hill = a * (m_planet / (3 * M_BH))^(1/3)
  // Tidal radius: r_tidal = R_star * (M_BH / M_star)^(1/3)
  const tidalRadius = 1.0 * Math.pow(M_bh, 1 / 3); // in AU, simplified

  // Update planets
  planetMeshes.forEach((planet, idx) => {
    const data = planet.userData;
    const orbitR = data.originalRadius;

    // Orbital phase (speeds up for inner planets)
    const orbitalPeriod = Math.pow(orbitR, 1.5); // Kepler's law
    const phase = data.angle + time * 0.001 / orbitalPeriod;

    // Calculate tidal disruption
    const planetPos = new THREE.Vector3(
      Math.cos(phase) * orbitR * AU_SCALE,
      0,
      Math.sin(phase) * orbitR * AU_SCALE
    );

    const distPlanetToBH = planetPos.distanceTo(bhWorldPos) / AU_SCALE;

    // Hill sphere radius for this planet vs BH
    const hillR = orbitR * Math.pow(1 / (3 * M_bh), 1 / 3);

    // Disruption factor: how much the orbit is disturbed
    let disruption = 0;
    if (distPlanetToBH < tidalRadius * 5) {
      disruption = Math.min(1, tidalRadius / Math.max(distPlanetToBH, 0.1));
    }

    // Apply disruption to orbit
    if (t > 0.3 && disruption > 0.1) {
      // Orbit becomes eccentric and shifts
      const pull = new THREE.Vector3().copy(bhWorldPos).sub(planetPos);
      pull.normalize().multiplyScalar(disruption * 0.003);
      planetPos.add(pull);

      // Add vertical displacement (orbits tilting)
      planetPos.y += disruption * Math.sin(phase * 3) * orbitR * AU_SCALE * 0.3;

      // Color shift to red (heating from bow shock)
      if (disruption > 0.5) {
        planet.material.color.lerp(new THREE.Color(0xff2200), 0.01);
      }
    }

    // Slingshot effect for close encounters
    if (t > 0.6 && distPlanetToBH < d_min * 2 && disruption > 0.3) {
      const flingDir = new THREE.Vector3().copy(planetPos).sub(bhWorldPos).normalize();
      const flingSpeed = disruption * 0.01 * (t - 0.5);
      planetPos.add(flingDir.multiplyScalar(flingSpeed));
    }

    planet.position.copy(planetPos);

    // Update orbit line visibility
    if (orbitLines[idx]) {
      orbitLines[idx].material.opacity = Math.max(0.05, 0.4 * (1 - disruption));
    }
  });

  // Star tidal stretching near direct hit
  if (isDirect && Math.abs(t - 0.5) < 0.15) {
    const stretch = 1 + (1 - Math.abs(t - 0.5) / 0.15) * 2;
    const dir = new THREE.Vector3().copy(bhWorldPos).normalize();
    starMesh.scale.set(
      1 + (stretch - 1) * Math.abs(dir.x),
      1 + (stretch - 1) * Math.abs(dir.y),
      1 + (stretch - 1) * Math.abs(dir.z)
    );
    starMesh.material.color.lerp(new THREE.Color(0xff4400), 0.02);
  } else {
    starMesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
  }

  // Update info callout
  updateInfoCallout(t, distToBH_AU, tidalRadius, d_min, v_bh, M_bh);
}

function updateInfoCallout(t, dist, tidalR, dMin, vel, mass) {
  if (!infoEl) return;

  const isEasy = document.body.classList.contains('mode-easy');
  let phase, description;
  // 200 AU crossing time: 200 AU * 1.496e8 km/AU / vel km/s / 86400 s/day
  const crossingDays = (200 * 1.496e8 / vel / 86400).toFixed(0);

  if (isEasy) {
    // Teenager-friendly descriptions
    if (t < 0.2) {
      phase = 'IT\'S COMING';
      description = `A 20-million-sun black hole is heading this way at ${(vel * 2.237).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph. ` +
        `It will cross the entire solar system in just ${crossingDays} days. ` +
        `The outer planets are already starting to wobble.`;
    } else if (t < 0.4) {
      phase = 'CHAOS BEGINS';
      description = `Neptune and Uranus are being yanked out of their orbits. ` +
        `The black hole's gravity is ${(mass).toExponential(1)} times stronger than our Sun. ` +
        `Moons are ripped away from their planets.`;
    } else if (t < 0.6) {
      phase = 'CLOSEST POINT';
      description = `The black hole is passing ${dMin === 0 ? 'right through the center' : dMin + ' AU from our star (' + dMin + 'x the Earth-Sun distance)'}. ` +
        `A wall of gas heated to 1,000,000 degrees is sweeping through. ` +
        `Atmospheres are being blasted off planets like leaves in a hurricane.`;
    } else if (t < 0.8) {
      phase = 'FLUNG INTO SPACE';
      description = `Planets are being launched out of the solar system like pinballs. ` +
        `Some will wander through space forever as "rogue planets." ` +
        `Others are captured by the black hole and dragged along.`;
    } else {
      phase = 'GONE';
      description = `The solar system is destroyed. Total time: ~${crossingDays} days. ` +
        `The star sits alone with no planets. ` +
        `The black hole continues on, leaving devastation behind.`;
    }
  } else {
    // Complex mode descriptions
    if (t < 0.2) {
      phase = 'APPROACH';
      description = `BH approaching at ${vel} km/s (${(vel / 299792 * 100).toFixed(2)}% c). ` +
        `At this speed, it crosses ~200 AU in about ${crossingDays} days. ` +
        `Tidal forces beginning to perturb outer planet orbits.`;
    } else if (t < 0.4) {
      phase = 'OUTER DISRUPTION';
      description = `Tidal radius: ${tidalR.toFixed(0)} AU. ` +
        `Outer planets (Neptune, Uranus) orbits becoming chaotic. ` +
        `Hill spheres collapsing — planets can no longer hold moons.`;
    } else if (t < 0.6) {
      phase = 'CLOSEST APPROACH';
      description = `BH passing at ${dMin} AU from star. ` +
        `M_BH = ${(mass / 1e7).toFixed(1)}×10⁷ M☉. ` +
        `Bow shock (10⁶ K gas) sweeping through system. ` +
        `Inner planet atmospheres being stripped.`;
    } else if (t < 0.8) {
      phase = 'SLINGSHOT';
      description = `Planets flung out at high velocity. Some ejected into intergalactic space, ` +
        `others captured into extreme orbits around BH. ` +
        `Star's motion altered by gravitational impulse.`;
    } else {
      phase = 'AFTERMATH';
      description = `System destroyed in ~${crossingDays} days. ` +
        `Surviving planets are rogue worlds hurtling through space. ` +
        `Star left with no remaining bound planets.`;
    }
  }

  infoEl.innerHTML = `<h4>${phase}</h4><p>${description}</p>`;
}

export function getEncounterGroup() { return encounterGroup; }
