// Position-Velocity model — Equations 1-8
// Van Dokkum et al. (2026) Section 5

import { DEFAULTS, degToRad } from './constants.js';

/**
 * Eq 3: Wake baseline LOS velocity
 * v_LOS,wake = v_* (1 - 1/χ) sin(i)
 */
export function wakeLOSVelocity(v_star = DEFAULTS.v_star, chi = DEFAULTS.chi, i_deg = DEFAULTS.i) {
  const i = degToRad(i_deg);
  return v_star * (1 - 1 / chi) * Math.sin(i);
}

/**
 * Eq 1: Tangential flow velocity on shock surface
 * v_t(θ) = v_* sin(θ)
 */
export function tangentialVelocity(theta, v_star = DEFAULTS.v_star) {
  return v_star * Math.sin(theta);
}

/**
 * Eq 6: Azimuthal averaging factor
 * ⟨cos φ⟩(ξ) = (ξ / √(1-ξ²)) asinh(√(1-ξ²) / |ξ|)
 * ξ = x/a where x is projected position, a is aperture radius
 */
export function azimuthalAverage(xi) {
  const absXi = Math.abs(xi);
  if (absXi >= 0.999) return 1.0;
  if (absXi < 0.001) return 0.0;
  const sqrt1mxi2 = Math.sqrt(1 - xi * xi);
  return (xi / sqrt1mxi2) * Math.asinh(sqrt1mxi2 / absXi);
}

/**
 * Eq 7: Limb brightening weight W_p
 * Emissivity-weighted projection factor.
 * For a cylindrical shell seen from the side, ε ∝ (projected distance)^p
 * W_p modifies the amplitude based on how limb-brightened the emission is.
 *
 * Integration is over the half-circle visible to the observer (φ from -π/2 to π/2),
 * weighted by emissivity along the line of sight through the shell.
 */
export function limbBrighteningWeight(xi, p = DEFAULTS.p) {
  const absXi = Math.abs(xi);
  if (absXi >= 0.999) return 1.0;

  // For p=0 (uniform emissivity), W_p = 1 everywhere
  if (Math.abs(p) < 0.01) return 1.0;

  // Numerical integration over the visible half-shell
  // The line of sight at position ξ intersects the shell at angles
  // where the chord length provides the emissivity weighting
  const N = 80;
  let sumNum = 0, sumDen = 0;

  // φ ranges over the half-circle facing observer (-π/2 to π/2)
  for (let k = 0; k < N; k++) {
    const phi = -Math.PI / 2 + Math.PI * (k + 0.5) / N;
    const cosPhi = Math.cos(phi);

    // Path length through shell at this angle = 1/|sin(α)| where α is
    // angle between LOS and shell surface. For thin shell, weight by
    // distance from projected center: d = sqrt(ξ² cos²φ + sin²φ)
    const d = Math.sqrt(absXi * absXi * cosPhi * cosPhi + Math.sin(phi) * Math.sin(phi));
    const eps = Math.pow(Math.max(d, 0.01), -p); // limb brightening: brighter at edges

    sumNum += eps * cosPhi;
    sumDen += eps;
  }

  if (sumDen < 1e-10) return 1.0;
  return sumNum / sumDen;
}

/**
 * Eq 8: Full PV model velocity at projected position x
 * v_model(x) = -v_LOS,wake + v_* sin(θ) cos(θ) cos(i) ⟨cos φ⟩(x/a) W_p(x)
 *
 * Returns velocity in km/s (negative = receding)
 */
export function pvModelVelocity(x_kpc, params = {}) {
  const v_star = params.v_star ?? DEFAULTS.v_star;
  const i_deg = params.i ?? DEFAULTS.i;
  const chi = params.chi ?? DEFAULTS.chi;
  const theta_deg = params.theta ?? DEFAULTS.theta;
  const p = params.p ?? DEFAULTS.p;
  const R_ring = params.R_ring ?? DEFAULTS.R_ring;

  const i = degToRad(i_deg);
  const theta = degToRad(theta_deg);

  const v_wake = wakeLOSVelocity(v_star, chi, i_deg);
  const xi = x_kpc / R_ring;

  if (Math.abs(xi) >= 1.0) {
    return -v_wake; // Outside aperture, just wake velocity
  }

  const avgCos = azimuthalAverage(xi);
  const Wp = limbBrighteningWeight(xi, p);

  const v_model = -v_wake + v_star * Math.sin(theta) * Math.cos(theta) * Math.cos(i) * avgCos * Wp;

  return v_model;
}

/**
 * Generate a full PV model curve
 * Returns array of {x, v} where x is in kpc and v in km/s
 */
export function pvModelCurve(params = {}, nPoints = 200) {
  const R_ring = params.R_ring ?? DEFAULTS.R_ring;
  const curve = [];

  for (let i = 0; i <= nPoints; i++) {
    const x = -R_ring + 2 * R_ring * i / nPoints;
    const v = pvModelVelocity(x, params);
    curve.push({ x, v });
  }

  return curve;
}
