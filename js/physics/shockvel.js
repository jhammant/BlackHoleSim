// Shock velocity vs position — Equation 13
// Van Dokkum et al. (2026) Section 4

import { DEFAULTS } from './constants.js';

/**
 * Eq 13: Shock velocity as function of distance along wake
 * v_s(r) = v_* (1 + 2(r_apex - r) / R_c)^(-0.5)
 *
 * r: distance from galaxy (kpc)
 * r_apex: position of BH (= r_star)
 * R_c: radius of curvature at apex
 * v_*: BH velocity
 *
 * Returns shock velocity in km/s
 */
export function shockVelocity(r, params = {}) {
  const v_star = params.v_star ?? DEFAULTS.v_star;
  const r_star = params.r_star ?? DEFAULTS.r_star;
  const R_c = params.R_c ?? DEFAULTS.R_c;

  const dr = r_star - r; // distance behind apex
  if (dr < 0) return v_star; // ahead of apex

  const factor = 1 + 2 * dr / R_c;
  if (factor <= 0) return 0;

  return v_star * Math.pow(factor, -0.5);
}

/**
 * Generate shock velocity curve
 * Returns array of {r, v} where r is in kpc and v in km/s
 */
export function shockVelocityCurve(params = {}, nPoints = 300) {
  const r_star = params.r_star ?? DEFAULTS.r_star;
  const curve = [];

  for (let i = 0; i <= nPoints; i++) {
    const r = r_star * i / nPoints;
    const v = shockVelocity(r, params);
    curve.push({ r, v });
  }

  return curve;
}
