// Physical constants and paper defaults for RBH-1
// Van Dokkum et al. (2026, ApJL 998:L27)

// --- Physical Constants ---
export const G = 6.674e-11;           // m³ kg⁻¹ s⁻²
export const M_SUN = 1.989e30;        // kg
export const PC = 3.086e16;           // meters per parsec
export const KPC = 3.086e19;          // meters per kiloparsec
export const KM_S = 1e3;             // m/s per km/s
export const YR = 3.156e7;           // seconds per year
export const MYR = 3.156e13;         // seconds per Myr
export const AU = 1.496e11;          // meters per AU
export const R_SUN = 6.957e8;        // solar radius in meters
export const C_LIGHT = 2.998e5;      // speed of light in km/s

// --- Paper Default Parameters ---
export const DEFAULTS = {
  // Black hole
  v_star: 954,           // km/s — BH velocity
  M_BH: 2e7,            // solar masses — BH mass estimate
  i: 29,                 // degrees — inclination angle

  // Bow shock geometry
  R_c: 1.8,             // kpc — radius of curvature
  R_0: 1.2,             // kpc — standoff radius (2/3 R_c)

  // PV model parameters (Eq 1-8)
  chi: 3.0,             // velocity ratio v_shock / v_wake
  theta: 55,            // degrees — half-opening angle of visible shell
  p: 1.0,               // emissivity power-law index
  R_ring: 1.5,          // kpc — ring aperture radius

  // Wake model (Eq 19)
  v0: -301,             // km/s — initial wake velocity
  dr_delay: 16,         // kpc — delay distance before mixing starts
  l_mix: 26,            // kpc — mixing length scale

  // CGM properties
  T_cgm: 1e6,           // K — CGM temperature
  n_cgm: 1e-4,          // cm⁻³ — CGM number density
  rho_ext: 1.67e-25,    // kg/m³ — CGM mass density (~0.1 mp/cm³)

  // Wake geometry
  wake_length: 62,      // kpc — total wake length
  r_star: 62,           // kpc — distance from galaxy to BH

  // Derived
  t_wake: 73,           // Myr — wake age
};

// Sound speed in CGM: c_s ≈ 0.013 √T km/s (for ideal gas, gamma=5/3, mu=0.6)
export function soundSpeed(T = DEFAULTS.T_cgm) {
  return 0.013 * Math.sqrt(T); // km/s
}

// Mach number
export function machNumber(v_star = DEFAULTS.v_star, T = DEFAULTS.T_cgm) {
  return v_star / soundSpeed(T);
}

// Unit conversion helpers
export function degToRad(deg) { return deg * Math.PI / 180; }
export function radToDeg(rad) { return rad * 180 / Math.PI; }
export function kpcToM(kpc) { return kpc * KPC; }
export function mToKpc(m) { return m / KPC; }
export function solarToKg(msun) { return msun * M_SUN; }
