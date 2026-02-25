// Wake velocity model — Delayed mixing (Equation 19)
// Van Dokkum et al. (2026) Section 6

import { DEFAULTS } from './constants.js';

/**
 * Eq 19: Delayed-mixing wake velocity model
 * v(r) = v₀ exp(-max(0, (r_* - r) - Δr_delay) / l_mix)
 *
 * r: distance from galaxy center (kpc), 0 = galaxy, r_* = BH position
 * v₀: initial wake velocity (km/s, negative = receding)
 * r_*: BH distance from galaxy (kpc)
 * Δr_delay: delay distance before mixing begins (kpc)
 * l_mix: mixing length scale (kpc)
 *
 * Returns velocity in km/s
 */
export function wakeVelocity(r, params = {}) {
  const v0 = params.v0 ?? DEFAULTS.v0;
  const r_star = params.r_star ?? DEFAULTS.r_star;
  const dr_delay = params.dr_delay ?? DEFAULTS.dr_delay;
  const l_mix = params.l_mix ?? DEFAULTS.l_mix;

  // Distance behind the BH
  const dist_behind = r_star - r;

  // Mixing starts only after delay distance
  const mixing_dist = Math.max(0, dist_behind - dr_delay);

  // Exponential decay of wake velocity toward ambient
  return v0 * Math.exp(-mixing_dist / l_mix);
}

/**
 * Generate full wake velocity profile
 * Returns array of {r, v} where r is in kpc and v in km/s
 */
export function wakeVelocityCurve(params = {}, nPoints = 300) {
  const r_star = params.r_star ?? DEFAULTS.r_star;
  const curve = [];

  for (let i = 0; i <= nPoints; i++) {
    const r = r_star * i / nPoints;
    const v = wakeVelocity(r, params);
    curve.push({ r, v });
  }

  return curve;
}
