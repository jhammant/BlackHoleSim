// Slider factory — creates parameter-bound slider rows

/**
 * Create a slider row element
 * @param {Object} config
 * @param {string} config.label - Display label (e.g. "v★")
 * @param {string} config.param - Parameter key
 * @param {number} config.min - Minimum value
 * @param {number} config.max - Maximum value
 * @param {number} config.step - Step size
 * @param {number} config.value - Initial value
 * @param {string} config.unit - Unit string (e.g. "km/s")
 * @param {function} config.format - Optional value formatter
 * @param {function} config.onChange - Callback(paramKey, value)
 * @returns {HTMLElement}
 */
export function createSlider(config) {
  const row = document.createElement('div');
  row.className = 'slider-row';

  const label = document.createElement('label');
  label.textContent = config.label;
  label.title = config.param;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = config.min;
  input.max = config.max;
  input.step = config.step;
  input.value = config.value;
  input.dataset.param = config.param;

  const valueDisplay = document.createElement('span');
  valueDisplay.className = 'slider-value';
  const formatVal = config.format || ((v) => `${v}${config.unit ? ' ' + config.unit : ''}`);
  valueDisplay.textContent = formatVal(config.value);

  input.addEventListener('input', () => {
    const val = parseFloat(input.value);
    valueDisplay.textContent = formatVal(val);
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
  { label: 'v★', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s' },
  { label: 'i', param: 'i', min: 15, max: 75, step: 1, value: 29, unit: '°' },
  { label: 'χ', param: 'chi', min: 2.0, max: 4.0, step: 0.1, value: 3.0, unit: '' },
  { label: 'θ', param: 'theta', min: 30, max: 80, step: 1, value: 55, unit: '°' },
  { label: 'p', param: 'p', min: 0.2, max: 3.0, step: 0.1, value: 1.0, unit: '' },
  { label: 'R_ring', param: 'R_ring', min: 0.5, max: 4.0, step: 0.1, value: 1.5, unit: 'kpc' },
];

// Common slider configurations for wake model
export const WAKE_SLIDERS = [
  { label: 'v₀', param: 'v0', min: -600, max: -50, step: 5, value: -301, unit: 'km/s' },
  { label: 'Δr_del', param: 'dr_delay', min: 0, max: 40, step: 1, value: 16, unit: 'kpc' },
  { label: 'l_mix', param: 'l_mix', min: 5, max: 60, step: 1, value: 26, unit: 'kpc' },
  { label: 'v★', param: 'v_star', min: 400, max: 1600, step: 10, value: 954, unit: 'km/s' },
  { label: 'R_c', param: 'R_c', min: 0.5, max: 5.0, step: 0.1, value: 1.8, unit: 'kpc' },
];

// Encounter mode sliders
export const ENCOUNTER_SLIDERS = [
  { label: 'M_BH', param: 'enc_mass', min: 6, max: 9, step: 0.1, value: 7.3,
    unit: 'M☉', format: v => `10^${v.toFixed(1)} M☉` },
  { label: 'v_BH', param: 'enc_vel', min: 200, max: 2000, step: 10, value: 954, unit: 'km/s' },
  { label: 'd_min', param: 'enc_dist', min: 0, max: 500, step: 5, value: 50, unit: 'AU' },
];
