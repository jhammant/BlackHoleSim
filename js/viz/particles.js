// CGM gas particle system — shock deflection simulation

import * as THREE from 'three';
import { wilkinR } from '../physics/bowshock.js';
import { DEFAULTS } from '../physics/constants.js';
import { getParticleSprite } from './scene3d.js';

const PARTICLE_COUNT = 15000;
const SPAWN_RANGE = 12; // kpc half-width of spawn region
const SPAWN_DEPTH = 15; // how far ahead particles spawn

let particleSystem;
let positions, velocities, colors, lifetimes;
let particleMaterial;
let currentParams = { v_star: DEFAULTS.v_star, R_0: DEFAULTS.R_0 };
let frameMode = 'bh'; // 'bh' = BH rest frame, 'cgm' = CGM rest frame

export function createParticles(scene) {
  const geo = new THREE.BufferGeometry();

  positions = new Float32Array(PARTICLE_COUNT * 3);
  velocities = new Float32Array(PARTICLE_COUNT * 3);
  colors = new Float32Array(PARTICLE_COUNT * 3);
  lifetimes = new Float32Array(PARTICLE_COUNT);

  // Initialize particles
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    resetParticle(i);
    // Spread initial positions throughout volume
    positions[i * 3 + 2] = -SPAWN_DEPTH + Math.random() * (SPAWN_DEPTH + 15);
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  particleMaterial = new THREE.PointsMaterial({
    size: 0.08,
    map: getParticleSprite(),
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  particleSystem = new THREE.Points(geo, particleMaterial);
  scene.add(particleSystem);

  return particleSystem;
}

function resetParticle(i) {
  const R0 = currentParams.R_0 || DEFAULTS.R_0;

  // Spawn upstream (in front of BH in BH rest frame)
  positions[i * 3] = (Math.random() - 0.5) * SPAWN_RANGE;
  positions[i * 3 + 1] = (Math.random() - 0.5) * SPAWN_RANGE;
  positions[i * 3 + 2] = -SPAWN_DEPTH - Math.random() * 3;

  // In BH rest frame, gas flows toward BH (positive z direction)
  velocities[i * 3] = 0;
  velocities[i * 3 + 1] = 0;
  velocities[i * 3 + 2] = 1; // will be scaled by v_star

  // Cool blue color upstream
  colors[i * 3] = 0.2 + Math.random() * 0.1;
  colors[i * 3 + 1] = 0.5 + Math.random() * 0.2;
  colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;

  lifetimes[i] = 0;
}

export function updateParticles(time, dt) {
  if (!particleSystem) return;

  const R0 = currentParams.R_0 || DEFAULTS.R_0;
  const speed = (currentParams.v_star || DEFAULTS.v_star) / 954; // normalized

  const dtScaled = dt * 0.003 * speed;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3;
    const iy = i * 3 + 1;
    const iz = i * 3 + 2;

    let px = positions[ix];
    let py = positions[iy];
    let pz = positions[iz];

    // Check distance from BH axis and distance to shock
    const rPerp = Math.sqrt(px * px + py * py);
    const r3d = Math.sqrt(px * px + py * py + pz * pz);

    if (r3d < 0.01) r3d = 0.01;

    // Compute polar angle from apex direction (-z)
    const theta = Math.acos(Math.max(-1, Math.min(1, -pz / (r3d || 0.01))));
    const R_shock = wilkinR(theta, R0);

    // Check if particle is near/inside shock
    const distToShock = r3d - R_shock;

    if (distToShock < 0 && pz > -R0 * 1.2) {
      // Inside shock — deflect tangentially along shock surface
      // Push particle outward
      const pushStr = 0.15;
      if (rPerp > 0.01) {
        velocities[ix] = (px / rPerp) * pushStr + velocities[ix] * 0.9;
        velocities[iy] = (py / rPerp) * pushStr + velocities[iy] * 0.9;
      }
      velocities[iz] = Math.abs(velocities[iz]) * 0.3 + 0.3; // slow down and deflect backward

      // Warm colors in shock
      colors[ix] = Math.min(1.0, colors[ix] + 0.02);
      colors[iy] = Math.max(0.2, colors[iy] - 0.01);
      colors[iz] = Math.max(0.1, colors[iz] - 0.02);
    } else if (distToShock < 0.5 && pz > -R0 * 2) {
      // Near shock — begin deflection
      const deflect = 0.05 * (1 - distToShock / 0.5);
      if (rPerp > 0.01) {
        velocities[ix] += (px / rPerp) * deflect;
        velocities[iy] += (py / rPerp) * deflect;
      }
      // Transition colors
      colors[ix] = Math.min(0.8, colors[ix] + 0.005);
      colors[iy] = Math.min(0.6, colors[iy] + 0.002);
    }

    // In wake region (behind BH, inside wake tube)
    if (pz > 0 && rPerp < R0 * 2) {
      // Dim purple in wake
      colors[ix] = Math.max(0.2, colors[ix] * 0.998);
      colors[iy] = Math.max(0.1, colors[iy] * 0.995);
      colors[iz] = Math.min(0.6, colors[iz] * 0.998 + 0.002);
      // Slow drift in wake
      velocities[iz] *= 0.99;
    }

    // Apply velocity
    positions[ix] += velocities[ix] * dtScaled;
    positions[iy] += velocities[iy] * dtScaled;
    positions[iz] += velocities[iz] * dtScaled;

    lifetimes[i] += dtScaled;

    // Recycle if too far behind or too far out
    if (pz > 18 || rPerp > SPAWN_RANGE * 1.2 || lifetimes[i] > 25) {
      resetParticle(i);
    }
  }

  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.geometry.attributes.color.needsUpdate = true;
}

export function setParticleParams(params) {
  if (params.v_star !== undefined) currentParams.v_star = params.v_star;
  if (params.R_0 !== undefined) currentParams.R_0 = params.R_0;
}

export function setFrameMode(mode) {
  frameMode = mode;
}
