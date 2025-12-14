/**
 * SliderControl - Numeric input with range slider
 *
 * Provides an interactive slider control for numeric values with optional:
 * - Value transformation (e.g., logarithmic scale)
 * - Custom formatting for display
 * - Min/max labels
 * - Real-time value display with units
 *
 * Configuration:
 * {
 *   id: string,              // Unique identifier
 *   label: string,           // Display label
 *   min: number,             // Minimum slider value
 *   max: number,             // Maximum slider value
 *   step: number,            // Step size for slider
 *   value: number,           // Initial slider value (pre-transform)
 *   unit: string,            // Display unit (e.g., "x", "%", "ms")
 *   format: function,        // Value formatting function (post-transform)
 *   transform: function,     // Value transformation function (e.g., log scale)
 *   showValue: boolean,      // Show real-time value display (default: true)
 *   showLabels: boolean,     // Show min/max labels (default: false)
 *   labels: object,          // Custom labels { min: string, max: string }
 *   onChange: function       // Change handler (receives transformed value)
 * }
 *
 * Example Usage:
 * ```javascript
 * const speedSlider = new SliderControl({
 *   id: 'speed-slider',
 *   label: 'Speed',
 *   min: -10,
 *   max: 10,
 *   value: 0,
 *   step: 1,
 *   unit: 'x',
 *   format: (val) => val.toFixed(2),
 *   transform: (val) => Math.pow(10, val / 10 - 1),
 *   showValue: true,
 *   showLabels: true,
 *   labels: { min: '0.01x', max: '1.0x' },
 *   onChange: (value) => simulation.setTimeScale(value)
 * });
 * ```
 */

import { BaseControl } from '../BaseControl.js';

export class SliderControl extends BaseControl {
  /**
   * Constructor for SliderControl
   * @param {Object} config - Configuration object (see class documentation)
   */
  constructor(config) {
    super(config);

    // Validate required numeric parameters
    if (typeof config.min !== 'number') {
      throw new Error(`SliderControl '${this.id}': min must be a number`);
    }
    if (typeof config.max !== 'number') {
      throw new Error(`SliderControl '${this.id}': max must be a number`);
    }
    if (typeof config.value !== 'number') {
      throw new Error(`SliderControl '${this.id}': value must be a number`);
    }

    // Slider configuration
    this.min = config.min;
    this.max = config.max;
    this.step = config.step !== undefined ? config.step : 1;

    // Value is stored in slider space (pre-transform)
    this._sliderValue = config.value;

    // Display options
    this.unit = config.unit || '';
    this.format = config.format || ((val) => val.toString());
    this.transform = config.transform || ((val) => val);
    this.showValue = config.showValue !== undefined ? config.showValue : true;
    this.showLabels = config.showLabels !== undefined ? config.showLabels : false;
    this.labels = config.labels || { min: this.min.toString(), max: this.max.toString() };

    // DOM element references
    this.sliderElement = null;
    this.valueDisplay = null;
    this.minLabel = null;
    this.maxLabel = null;
  }

  /**
   * Render the slider control
   * Creates the complete slider structure with header, slider input, labels, and value display
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered control element
   */
  render(parentElement) {
    if (!parentElement) {
      throw new Error(`SliderControl '${this.id}': parentElement is required`);
    }

    // Create main container
    this.container = this._createContainer();
    this.container.classList.add('slider-control');

    // Create header with label and value display
    const header = document.createElement('div');
    header.className = 'slider-header';

    // Label
    const label = document.createElement('div');
    label.className = 'slider-label';
    label.textContent = this.label;
    if (this.tooltip) {
      label.setAttribute('title', this.tooltip);
    }
    header.appendChild(label);

    // Value display (if enabled)
    if (this.showValue) {
      this.valueDisplay = document.createElement('div');
      this.valueDisplay.className = 'slider-value';
      this._updateValueDisplay();
      header.appendChild(this.valueDisplay);
    }

    this.container.appendChild(header);

    // Create slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    // Create the range input
    this.sliderElement = document.createElement('input');
    this.sliderElement.type = 'range';
    this.sliderElement.id = `${this.id}-input`;
    this.sliderElement.className = 'slider-input';
    this.sliderElement.min = this.min;
    this.sliderElement.max = this.max;
    this.sliderElement.step = this.step;
    this.sliderElement.value = this._sliderValue;

    // Add event listener for input changes
    this.sliderElement.addEventListener('input', this._handleInput.bind(this));

    sliderContainer.appendChild(this.sliderElement);
    this.container.appendChild(sliderContainer);

    // Create min/max labels (if enabled)
    if (this.showLabels) {
      const labelsContainer = document.createElement('div');
      labelsContainer.className = 'slider-labels';
      labelsContainer.style.display = 'flex';
      labelsContainer.style.justifyContent = 'space-between';
      labelsContainer.style.marginTop = 'var(--spacing-xs, 4px)';

      this.minLabel = document.createElement('div');
      this.minLabel.className = 'slider-label-min';
      this.minLabel.style.fontSize = 'var(--font-size-xs, 11px)';
      this.minLabel.style.color = 'var(--text-light, #95a5a6)';
      this.minLabel.textContent = this.labels.min;

      this.maxLabel = document.createElement('div');
      this.maxLabel.className = 'slider-label-max';
      this.maxLabel.style.fontSize = 'var(--font-size-xs, 11px)';
      this.maxLabel.style.color = 'var(--text-light, #95a5a6)';
      this.maxLabel.textContent = this.labels.max;

      labelsContainer.appendChild(this.minLabel);
      labelsContainer.appendChild(this.maxLabel);
      this.container.appendChild(labelsContainer);
    }

    // Append to parent
    parentElement.appendChild(this.container);

    // Apply initial enabled/disabled state
    if (!this._enabled) {
      this.sliderElement.disabled = true;
    }

    return this.container;
  }

  /**
   * Handle slider input event
   * Updates value, display, and emits change event
   * @private
   */
  _handleInput(event) {
    const newSliderValue = parseFloat(event.target.value);

    // Only emit change if value actually changed
    if (newSliderValue !== this._sliderValue) {
      this._sliderValue = newSliderValue;
      this._updateValueDisplay();

      // Emit change event with transformed value
      const transformedValue = this.transform(this._sliderValue);
      this.emit('change', transformedValue);
    }
  }

  /**
   * Update the value display element
   * Applies transformation and formatting
   * @private
   */
  _updateValueDisplay() {
    if (!this.valueDisplay) return;

    const transformedValue = this.transform(this._sliderValue);
    const formattedValue = this.format(transformedValue);
    this.valueDisplay.textContent = this.unit ? `${formattedValue}${this.unit}` : formattedValue;
  }

  /**
   * Get current value (transformed)
   * @returns {number} Current transformed value
   */
  getValue() {
    return this.transform(this._sliderValue);
  }

  /**
   * Set value (expects slider value, pre-transform)
   * @param {number} value - New slider value to set
   */
  setValue(value) {
    if (typeof value !== 'number') {
      console.warn(`SliderControl '${this.id}': setValue expects a number, got ${typeof value}`);
      return;
    }

    // Clamp value to valid range
    const clampedValue = Math.max(this.min, Math.min(this.max, value));

    if (clampedValue !== this._sliderValue) {
      this._sliderValue = clampedValue;

      // Update slider element if rendered
      if (this.sliderElement) {
        this.sliderElement.value = this._sliderValue;
      }

      this._updateValueDisplay();

      // Emit change event with transformed value
      const transformedValue = this.transform(this._sliderValue);
      this.emit('change', transformedValue);
    }
  }

  /**
   * Get raw slider value (pre-transform)
   * @returns {number} Current slider value
   */
  getSliderValue() {
    return this._sliderValue;
  }

  /**
   * Set raw slider value (pre-transform) without emitting change event
   * Useful for initialization or programmatic updates
   * @param {number} value - New slider value
   */
  setSliderValueSilent(value) {
    if (typeof value !== 'number') {
      console.warn(`SliderControl '${this.id}': setSliderValueSilent expects a number`);
      return;
    }

    const clampedValue = Math.max(this.min, Math.min(this.max, value));
    this._sliderValue = clampedValue;

    if (this.sliderElement) {
      this.sliderElement.value = this._sliderValue;
    }

    this._updateValueDisplay();
  }

  /**
   * Enable the control
   * Overrides base implementation to enable slider input
   */
  enable() {
    super.enable();
    if (this.sliderElement) {
      this.sliderElement.disabled = false;
    }
  }

  /**
   * Disable the control
   * Overrides base implementation to disable slider input
   */
  disable() {
    super.disable();
    if (this.sliderElement) {
      this.sliderElement.disabled = true;
    }
  }

  /**
   * Update the control display
   * Refreshes the value display
   */
  update() {
    this._updateValueDisplay();
  }

  /**
   * Destroy the control and cleanup resources
   * Removes event listeners and DOM elements
   */
  destroy() {
    // Remove event listener
    if (this.sliderElement) {
      this.sliderElement.removeEventListener('input', this._handleInput.bind(this));
    }

    // Clear references
    this.sliderElement = null;
    this.valueDisplay = null;
    this.minLabel = null;
    this.maxLabel = null;

    // Call parent destroy
    super.destroy();
  }
}
