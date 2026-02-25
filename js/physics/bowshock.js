// Bow shock geometry — Wilkin (1996) thin-shell solution
// Van Dokkum et al. (2026) Section 4

import { DEFAULTS, degToRad } from './constants.js';

/**
 * Wilkin (1996) bow shock shape: R(θ) = R₀ csc(θ) √(3(1 - θ cot(θ)))
 * θ: polar angle from apex (radians), 0 < θ < π
 * R₀: standoff distance
 * Returns distance from focus (BH position) in kpc
 */
export function wilkinR(theta, R0 = DEFAULTS.R_0) {
  if (theta <= 0.001) return R0;
  if (theta >= Math.PI - 0.001) return R0 * Math.sqrt(3 * Math.PI) / Math.sin(Math.PI - 0.001);
  const cscTheta = 1 / Math.sin(theta);
  const inner = 3 * (1 - theta * Math.cos(theta) / Math.sin(theta));
  if (inner < 0) return R0;
  return R0 * cscTheta * Math.sqrt(inner);
}

/**
 * Generate Wilkin shape points in 2D (r, z) for a range of theta
 * Returns array of {x, y} in kpc where x = perpendicular, y = along motion axis
 */
export function wilkinProfile(R0 = DEFAULTS.R_0, nPoints = 200) {
  const points = [];
  for (let i = 0; i <= nPoints; i++) {
    const theta = 0.01 + (Math.PI - 0.02) * i / nPoints;
    const R = wilkinR(theta, R0);
    const x = R * Math.sin(theta); // perpendicular to motion
    const y = -R * Math.cos(theta); // along motion axis (BH at origin, moving in -y)
    points.push({ x, y, theta, R });
  }
  return points;
}

/**
 * Standoff radius: R₀ = (2/3) R_c
 */
export function standoffRadius(R_c = DEFAULTS.R_c) {
  return (2 / 3) * R_c;
}

/**
 * Parabolic approximation for photometric profile:
 * R_phot(Δr) = √(2 R_c Δr)
 * Used for fast particle collision detection
 */
export function parabolicR(dr, R_c = DEFAULTS.R_c) {
  return Math.sqrt(2 * R_c * Math.abs(dr));
}

/**
 * Generate 3D surface vertices for the Wilkin bow shock
 * Returns Float32Array of positions [x,y,z, x,y,z, ...]
 * Axis convention: BH moves along +Z, shock opens toward -Z
 */
export function wilkinSurfaceVertices(R0 = DEFAULTS.R_0, nTheta = 80, nPhi = 64) {
  const vertices = [];
  const normals = [];
  const uvs = [];

  for (let i = 0; i <= nTheta; i++) {
    const theta = 0.01 + (Math.PI * 0.85) * i / nTheta;
    const R = wilkinR(theta, R0);
    const u = i / nTheta;

    for (let j = 0; j <= nPhi; j++) {
      const phi = 2 * Math.PI * j / nPhi;
      const v = j / nPhi;

      const x = R * Math.sin(theta) * Math.cos(phi);
      const y = R * Math.sin(theta) * Math.sin(phi);
      const z = -R * Math.cos(theta); // apex at z = -R0, opening toward -z

      vertices.push(x, y, z);

      // Approximate normal (outward from shock surface)
      const nx = Math.sin(theta) * Math.cos(phi);
      const ny = Math.sin(theta) * Math.sin(phi);
      const nz = -Math.cos(theta);
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normals.push(nx / len, ny / len, nz / len);
      uvs.push(u, v);
    }
  }

  // Build index array for triangles
  const indices = [];
  for (let i = 0; i < nTheta; i++) {
    for (let j = 0; j < nPhi; j++) {
      const a = i * (nPhi + 1) + j;
      const b = a + nPhi + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return { vertices, normals, uvs, indices, nTheta, nPhi };
}

/**
 * Test if a point (in BH rest frame) is inside the bow shock
 * pos: {x, y, z} in kpc, BH at origin, motion along +Z
 */
export function isInsideBowShock(pos, R0 = DEFAULTS.R_0) {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  if (r < 0.01) return true;
  const theta = Math.acos(-pos.z / r); // angle from apex direction
  const R_shock = wilkinR(theta, R0);
  return r < R_shock;
}
