// Slider factory — creates parameter-bound slider rows

/**
 * Create a slider row element
 * @param {Object} config
 * @param {string} config.label - Display label (complex mode, e.g. "v★")
 * @param {string} config.easyLabel - Friendly label for easy mode (e.g. "Speed")
 * @param {string} config.tooltip - Tooltip explaining the parameter
 * @param {string} config.param - Parameter key
 * @param {number} config.min - Minimum value
 * @param {number} config.max - Maximum value
 * @param {number} config.step - Step size
 * @param {number} config.value - Initial value
 * @param {string} config.unit - Unit string (e.g. "km/s")
 * @param {string} config.easyUnit - Friendly unit for easy mode
 * @param {function} config.format - Optional value formatter
 * @param {function} config.easyFormat - Optional easy-mode formatter
 * @param {function} config.onChange - Callback(paramKey, value)
 * @returns {HTMLElement}
 */
export function createSlider(config) {
  const row = document.createElement('div');
  row.className = 'slider-row';

  const label = document.createElement('label');
  // Create both labels — CSS will show/hide based on mode
  const complexSpan = document.createElement('span');
  complexSpan.className = 'complex-only';
  complexSpan.textContent = config.label;

  const easySpan = document.createElement('span');
  easySpan.className = 'easy-only';
  easySpan.textContent = config.easyLabel || config.label;

  label.appendChild(complexSpan);
  label.appendChild(easySpan);
  if (config.tooltip) label.title = config.tooltip;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = config.min;
  input.max = config.max;
  input.step = config.step;
  input.value = config.value;
  input.dataset.param = config.param;
  if (config.tooltip) input.setAttribute('aria-label', config.tooltip);

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'slider-value';
  const formatVal = config.format || ((v) => `${v}${config.unit ? ' ' + config.unit : ''}`);
  const easyFormatVal = config.easyFormat || formatVal;
  valueDisplay.textContent = formatVal(config.value);

  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    // Use appropriate formatter based on current mode
    const isEasy = document.body.classList.contains('mode-easy');
    valueDisplay.textContent = (isEasy ? easyFormatVal : formatVal)(val);
    if (config.onChange) config.onChange(config.param, val);
  });

  row.appendChild(label);
  row.appendChild(input);
  row.appendChild(valueDisplay);

  return row;
}

/**
 * Create a group of sliders in a container
 * @param {HTMLElement} container
 * @param {Array} sliderConfigs
 * @param {function} onChange - Global change handler(param, value)
 */
export function createSliderGroup(container, sliderConfigs, onChange) {
  sliderConfigs.forEach(config => {
    config.onChange = onChange;
    container.appendChild(createSlider(config));
  });
}

// Common slider configurations for PV model
export const PV_SLIDERS = [
  { label: 'v★', easyLabel: 'Speed', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s',
    easyUnit: 'km/s', tooltip: 'Black hole velocity — how fast it plows through space',
    easyFormat: v => `${(v * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph` },
  { label: 'i', easyLabel: 'Tilt', param: 'i', min: 15, max: 75, step: 1, value: 29, unit: '°',
    tooltip: 'Inclination angle — our viewing angle to the wake' },
  { label: 'χ', easyLabel: 'Compress', param: 'chi', min: 2.0, max: 4.0, step: 0.1, value: 3.0, unit: '',
    tooltip: 'Compression ratio — how much the gas is squeezed in the shock' },
  { label: 'θ', easyLabel: 'Cone', param: 'theta', min: 30, max: 80, step: 1, value: 55, unit: '°',
    tooltip: 'Shock opening angle — how wide the bow shock opens' },
  { label: 'p', easyLabel: 'Glow', param: 'p', min: 0.2, max: 3.0, step: 0.1, value: 1.0, unit: '',
    tooltip: 'Emissivity index — how brightness varies across the shock' },
  { label: 'R_ring', easyLabel: 'Size', param: 'R_ring', min: 0.5, max: 4.0, step: 0.1, value: 1.5, unit: 'kpc',
    tooltip: 'Ring radius — size of the emitting region' },
];

// Common slider configurations for wake model
export const WAKE_SLIDERS = [
  { label: 'v₀', easyLabel: 'Peak', param: 'v0', min: -600, max: -50, step: 5, value: -301, unit: 'km/s',
    tooltip: 'Peak wake velocity — how fast the gas moves in the wake',
    easyFormat: v => `${Math.abs(v)} km/s` },
  { label: 'Δr_del', easyLabel: 'Delay', param: 'dr_delay', min: 0, max: 40, step: 1, value: 16, unit: 'kpc',
    tooltip: 'Delay distance — how far gas travels before mixing begins' },
  { label: 'l_mix', easyLabel: 'Fade', param: 'l_mix', min: 5, max: 60, step: 1, value: 26, unit: 'kpc',
    tooltip: 'Mixing length — how quickly the wake fades out' },
  { label: 'v★', easyLabel: 'Speed', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s',
    tooltip: 'Black hole velocity',
    easyFormat: v => `${(v * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph` },
  { label: 'R_c', easyLabel: 'Curve', param: 'R_c', min: 0.5, max: 5.0, step: 0.1, value: 1.8, unit: 'kpc',
    tooltip: 'Radius of curvature — how curved the shock front is' },
];

// Encounter mode sliders
export const ENCOUNTER_SLIDERS = [
  { label: 'M_BH', easyLabel: 'Mass', param: 'enc_mass', min: 6, max: 9, step: 0.1, value: 7.3,
    unit: 'M☉', format: v => `10^${v.toFixed(1)} M☉`,
    easyFormat: v => {
      const m = Math.pow(10, v);
      if (m >= 1e8) return `${(m/1e8).toFixed(0)}00M suns`;
      if (m >= 1e7) return `${(m/1e7).toFixed(0)}0M suns`;
      return `${(m/1e6).toFixed(0)}M suns`;
    },
    tooltip: 'Black hole mass — in multiples of our Sun' },
  { label: 'v_BH', easyLabel: 'Speed', param: 'enc_vel', min: 200, max: 2000, step: 10, value: 954, unit: 'km/s',
    tooltip: 'Black hole approach speed',
    easyFormat: v => `${(v * 2236.94).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mph` },
  { label: 'd_min', easyLabel: 'Miss by', param: 'enc_dist', min: 0, max: 500, step: 5, value: 50, unit: 'AU',
    tooltip: 'Closest approach distance — how close it passes the star (1 AU = Earth-Sun distance)',
    easyFormat: v => v === 0 ? 'Direct hit!' : `${v} AU (${v}x Earth-Sun)` },
];
