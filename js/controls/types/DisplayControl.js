/**
 * DisplayControl - Read-only display control for showing values
 *
 * Extends BaseControl to provide a read-only display element that shows
 * formatted values. Supports optional auto-update intervals for displaying
 * live data (e.g., statistics, time elapsed, measurements).
 *
 * Usage:
 *   const display = new DisplayControl({
 *     id: 'total-probability',
 *     label: 'Total Probability',
 *     value: 0.9999,
 *     format: (val) => `${(val * 100).toFixed(2)}%`,
 *     updateInterval: 100,  // Optional: auto-update every 100ms
 *     getValue: (manager) => manager.simulation.psi.sumAbs2()
 *   });
 */

import { BaseControl } from '../BaseControl.js';

export class DisplayControl extends BaseControl {
  /**
   * Constructor for DisplayControl
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier
   * @param {string} config.label - Display label
   * @param {*} [config.value] - Initial value to display
   * @param {Function} [config.format] - Formatting function (val => string)
   * @param {number} [config.updateInterval] - Auto-update interval in ms
   * @param {Function} [config.getValue] - Getter function for auto-update
   * @param {string} [config.className] - Additional CSS classes
   * @param {string} [config.unit] - Optional unit suffix (e.g., 'ms', '%')
   */
  constructor(config) {
    super(config);

    // Store configuration
    this.value = config.value !== undefined ? config.value : null;
    this.format = config.format || ((val) => String(val));
    this.updateInterval = config.updateInterval || null;
    this.getValueFunc = config.getValue || null;
    this.unit = config.unit || '';

    // Internal state
    this._intervalId = null;
    this._valueElement = null;
    this._manager = null;
  }

  /**
   * Render the display control
   * Creates a read-only display element with label and formatted value
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered control element
   */
  render(parentElement) {
    // Create container
    this.container = this._createContainer();
    this.container.classList.add('control-group');

    // Create display wrapper
    const displayWrapper = document.createElement('div');
    displayWrapper.className = 'display-control';

    // Add custom class if provided
    if (this.className) {
      displayWrapper.className += ' ' + this.className;
    }

    // Create label
    const label = document.createElement('div');
    label.className = 'display-label';
    label.textContent = this.label;

    if (this.tooltip) {
      label.setAttribute('title', this.tooltip);
    }

    // Create value display
    this._valueElement = document.createElement('div');
    this._valueElement.className = 'display-value';
    this._updateDisplay();

    // Add unit if provided
    if (this.unit) {
      const unitSpan = document.createElement('span');
      unitSpan.className = 'display-unit';
      unitSpan.textContent = this.unit;
      this._valueElement.appendChild(unitSpan);
    }

    // Build structure
    displayWrapper.appendChild(label);
    displayWrapper.appendChild(this._valueElement);
    this.container.appendChild(displayWrapper);

    // Attach to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    // Start auto-update if configured
    if (this.updateInterval && this.getValueFunc) {
      this._startAutoUpdate();
    }

    return this.container;
  }

  /**
   * Get the current displayed value
   * @returns {*} Current value
   */
  getValue() {
    return this.value;
  }

  /**
   * Set and display a new value
   * Updates the display with the formatted value
   * @param {*} value - New value to display
   */
  setValue(value) {
    if (this.value === value) {
      return; // No change
    }

    this.value = value;
    this._updateDisplay();
    this.emit('change', value);
  }

  /**
   * Update the display with the current value
   * Applies the format function and updates the DOM
   * @private
   */
  _updateDisplay() {
    if (!this._valueElement) {
      return;
    }

    // Format the value
    let displayText;
    try {
      displayText = this.format(this.value);
    } catch (error) {
      console.error(`DisplayControl ${this.id}: Error formatting value:`, error);
      displayText = '—'; // Em dash for error state
    }

    // Update the display (preserve unit if it exists)
    if (this.unit) {
      // Clear and add text node, then unit
      this._valueElement.textContent = '';
      this._valueElement.appendChild(document.createTextNode(displayText + ' '));

      const unitSpan = document.createElement('span');
      unitSpan.className = 'display-unit';
      unitSpan.textContent = this.unit;
      this._valueElement.appendChild(unitSpan);
    } else {
      this._valueElement.textContent = displayText;
    }
  }

  /**
   * Start auto-update interval
   * Periodically fetches and updates the display value
   * @private
   */
  _startAutoUpdate() {
    // Clear any existing interval
    this._stopAutoUpdate();

    // Set up new interval
    this._intervalId = setInterval(() => {
      if (this._destroyed || !this.getValueFunc) {
        this._stopAutoUpdate();
        return;
      }

      // Fetch new value using the getter function
      try {
        const newValue = this.getValueFunc(this._manager);
        this.setValue(newValue);
      } catch (error) {
        console.error(`DisplayControl ${this.id}: Error in getValue function:`, error);
      }
    }, this.updateInterval);
  }

  /**
   * Stop auto-update interval
   * @private
   */
  _stopAutoUpdate() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Set the manager reference for getValue calls
   * This allows the getValue function to access the manager context
   * @param {Object} manager - Manager instance (e.g., ControlManager)
   */
  setManager(manager) {
    this._manager = manager;
  }

  /**
   * Update the control display
   * Manually trigger a value refresh if getValue function is configured
   */
  update() {
    if (this.getValueFunc && this._manager) {
      try {
        const newValue = this.getValueFunc(this._manager);
        this.setValue(newValue);
      } catch (error) {
        console.error(`DisplayControl ${this.id}: Error in getValue function:`, error);
      }
    }
  }

  /**
   * Destroy the control and cleanup resources
   * Stops auto-update interval and clears references
   */
  destroy() {
    // Stop auto-update
    this._stopAutoUpdate();

    // Clear references
    this._valueElement = null;
    this._manager = null;
    this.getValueFunc = null;

    // Call parent destroy
    super.destroy();
  }
}
