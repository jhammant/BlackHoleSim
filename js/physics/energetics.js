// Energetics and derived quantities — Equation 23
// Van Dokkum et al. (2026) Section 7

import { DEFAULTS, soundSpeed, machNumber, degToRad, KPC, KM_S, MYR, M_SUN } from './constants.js';

/**
 * Eq 23: BH mass estimate from momentum balance
 * M_* ≳ 2ε ρ_ext v_* π R₀² t_wake
 *
 * Returns mass in solar masses
 */
export function bhMassEstimate(params = {}) {
  const rho_ext = params.rho_ext ?? DEFAULTS.rho_ext;
  const v_star = params.v_star ?? DEFAULTS.v_star;
  const R0 = params.R_0 ?? DEFAULTS.R_0;
  const t_wake_myr = params.t_wake ?? DEFAULTS.t_wake;
  const epsilon = params.epsilon ?? 1.0; // efficiency factor

  const R0_m = R0 * KPC;
  const v_m = v_star * KM_S;
  const t_s = t_wake_myr * MYR;

  const M_kg = 2 * epsilon * rho_ext * v_m * Math.PI * R0_m * R0_m * t_s;
  return M_kg / M_SUN;
}

/**
 * Wake age: t_wake = wake_length / (v_* cos i)
 * Returns age in Myr
 */
export function wakeAge(params = {}) {
  const wake_length = params.wake_length ?? DEFAULTS.wake_length;
  const v_star = params.v_star ?? DEFAULTS.v_star;
  const i_deg = params.i ?? DEFAULTS.i;

  const i = degToRad(i_deg);
  const L_m = wake_length * KPC;
  const v_m = v_star * KM_S;
  const t_s = L_m / (v_m * Math.cos(i));
  return t_s / MYR;
}

/**
 * Standoff radius from R_c
 */
export function standoffFromRc(R_c = DEFAULTS.R_c) {
  return (2 / 3) * R_c;
}

/**
 * Compute all derived dashboard quantities
 */
export function computeDashboard(params = {}) {
  const v_star = params.v_star ?? DEFAULTS.v_star;
  const i_deg = params.i ?? DEFAULTS.i;
  const R_c = params.R_c ?? DEFAULTS.R_c;
  const T = params.T_cgm ?? DEFAULTS.T_cgm;

  const R0 = standoffFromRc(R_c);
  const cs = soundSpeed(T);
  const mach = machNumber(v_star, T);
  const age = wakeAge({ ...params, R_0: R0 });
  const mass = bhMassEstimate({ ...params, R_0: R0, t_wake: age });

  // Shock velocity at tip
  const v_shock_tip = v_star;

  // Wake LOS velocity
  const chi = params.chi ?? DEFAULTS.chi;
  const i = degToRad(i_deg);
  const v_los_wake = v_star * (1 - 1 / chi) * Math.sin(i);

  // Velocity as fraction of c
  const v_frac_c = v_star / 2.998e5;

  return {
    M_BH: mass,
    R_0: R0,
    R_c: R_c,
    mach: mach,
    c_s: cs,
    t_wake: age,
    v_shock_tip: v_shock_tip,
    v_los_wake: v_los_wake,
    v_frac_c: v_frac_c,
    v_star: v_star,
  };
}
