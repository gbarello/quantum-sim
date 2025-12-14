/**
 * RadioControl - Radio button group control
 *
 * Provides a group of mutually exclusive radio button options.
 * Extends BaseControl and implements the required interface methods.
 *
 * Features:
 * - Multiple option support with values and labels
 * - Horizontal or vertical layout
 * - Custom styling with visual feedback
 * - Accessibility support (keyboard navigation, ARIA)
 * - Tooltip support for individual options
 *
 * Configuration:
 * {
 *   id: string,              // Unique identifier (required)
 *   label: string,           // Group label (required)
 *   options: Array<{         // Array of radio options (required)
 *     value: any,            // Option value
 *     label: string,         // Display label
 *     tooltip: string        // Optional tooltip
 *   }>,
 *   value: any,              // Currently selected value
 *   layout: string,          // 'horizontal' or 'vertical' (default: 'vertical')
 *   onChange: Function,      // Change event handler
 *   enabled: boolean,        // Initial enabled state
 *   visible: boolean,        // Initial visibility state
 *   tooltip: string,         // Group tooltip
 *   className: string        // Additional CSS classes
 * }
 */

import { BaseControl } from '../BaseControl.js';

export class RadioControl extends BaseControl {
  /**
   * Constructor for RadioControl
   * @param {Object} config - Configuration object (see class documentation)
   */
  constructor(config) {
    super(config);

    // Validate options
    if (!config.options || !Array.isArray(config.options) || config.options.length === 0) {
      throw new Error('RadioControl: config.options must be a non-empty array');
    }

    // Validate each option
    config.options.forEach((option, index) => {
      if (!option.hasOwnProperty('value')) {
        throw new Error(`RadioControl: option ${index} must have a 'value' property`);
      }
      if (!option.label || typeof option.label !== 'string') {
        throw new Error(`RadioControl: option ${index} must have a 'label' string`);
      }
    });

    // Store options
    this.options = config.options;

    // Layout configuration
    this.layout = config.layout || 'vertical';
    if (this.layout !== 'horizontal' && this.layout !== 'vertical') {
      console.warn(`RadioControl: Invalid layout '${this.layout}', defaulting to 'vertical'`);
      this.layout = 'vertical';
    }

    // Initial value (default to first option if not specified)
    this._value = config.value !== undefined ? config.value : this.options[0].value;

    // Validate that initial value exists in options
    const hasValue = this.options.some(opt => opt.value === this._value);
    if (!hasValue) {
      console.warn(`RadioControl: Initial value '${this._value}' not found in options, using first option`);
      this._value = this.options[0].value;
    }

    // DOM references (will be populated in render)
    this.radioInputs = [];
    this.groupElement = null;
  }

  /**
   * Render the radio control
   * Creates the complete radio group HTML structure
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered control element
   */
  render(parentElement) {
    if (this._destroyed) {
      throw new Error('Cannot render a destroyed control');
    }

    // Create container
    this.container = this._createContainer();
    this.container.classList.add('control-radio');

    // Create label for the group
    const groupLabel = document.createElement('div');
    groupLabel.className = 'control-label';
    groupLabel.textContent = this.label;
    if (this.tooltip) {
      groupLabel.setAttribute('title', this.tooltip);
    }
    this.container.appendChild(groupLabel);

    // Create radio group container
    this.groupElement = document.createElement('div');
    this.groupElement.className = 'radio-group';
    if (this.layout === 'horizontal') {
      this.groupElement.classList.add('radio-group-horizontal');
    }
    this.groupElement.setAttribute('role', 'radiogroup');
    this.groupElement.setAttribute('aria-labelledby', `${this.id}-label`);

    // Generate unique name for this radio group using control ID
    const groupName = `radio-group-${this.id}`;

    // Clear any existing radio inputs
    this.radioInputs = [];

    // Create radio options
    this.options.forEach((option, index) => {
      const optionElement = this._createRadioOption(option, index, groupName);
      this.groupElement.appendChild(optionElement);
    });

    this.container.appendChild(this.groupElement);

    // Apply initial state
    if (!this._enabled) {
      this.disable();
    }
    if (!this._visible) {
      this.hide();
    }

    // Append to parent if provided
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  /**
   * Create a single radio option element
   * @param {Object} option - Option configuration
   * @param {number} index - Option index
   * @param {string} groupName - Name attribute for the radio group
   * @returns {HTMLElement} Radio option element
   * @private
   */
  _createRadioOption(option, index, groupName) {
    // Create option container (label element for better click target)
    const optionLabel = document.createElement('label');
    optionLabel.className = 'radio-option';
    if (option.tooltip) {
      optionLabel.setAttribute('title', option.tooltip);
    }

    // Create hidden radio input
    const radioInput = document.createElement('input');
    radioInput.type = 'radio';
    radioInput.name = groupName;
    radioInput.id = `${this.id}-option-${index}`;
    radioInput.value = option.value;
    radioInput.checked = option.value === this._value;

    // Add event listener for changes
    radioInput.addEventListener('change', (event) => {
      if (event.target.checked) {
        this._handleChange(option.value);
      }
    });

    // Store reference to input
    this.radioInputs.push(radioInput);

    optionLabel.appendChild(radioInput);

    // Create visual radio indicator
    const indicator = document.createElement('span');
    indicator.className = 'radio-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    optionLabel.appendChild(indicator);

    // Create label text
    const labelText = document.createElement('span');
    labelText.className = 'radio-label';
    labelText.textContent = option.label;
    optionLabel.appendChild(labelText);

    return optionLabel;
  }

  /**
   * Handle radio button change
   * @param {*} newValue - New selected value
   * @private
   */
  _handleChange(newValue) {
    if (this._destroyed || !this._enabled) {
      return;
    }

    // Only emit change if value actually changed
    if (newValue !== this._value) {
      this._value = newValue;
      this.emit('change', newValue);
    }
  }

  /**
   * Get current selected value
   * @returns {*} Currently selected option value
   */
  getValue() {
    return this._value;
  }

  /**
   * Set selected value
   * Updates the radio group to select the option with the given value
   * @param {*} value - Value to select
   */
  setValue(value) {
    // Validate that value exists in options
    const option = this.options.find(opt => opt.value === value);
    if (!option) {
      console.warn(`RadioControl: Value '${value}' not found in options`);
      return;
    }

    // Update internal value
    const oldValue = this._value;
    this._value = value;

    // Update DOM if rendered
    if (this.radioInputs.length > 0) {
      this.radioInputs.forEach(input => {
        input.checked = input.value === value;
      });
    }

    // Emit change event if value changed
    if (oldValue !== value) {
      this.emit('change', value);
    }
  }

  /**
   * Get the currently selected option object
   * @returns {Object|null} Selected option or null if not found
   */
  getSelectedOption() {
    return this.options.find(opt => opt.value === this._value) || null;
  }

  /**
   * Update the control display
   * Refreshes the selected state of all radio buttons
   */
  update() {
    if (this._destroyed || !this.container) {
      return;
    }

    // Update checked state of all inputs
    this.radioInputs.forEach(input => {
      input.checked = input.value === this._value;
    });
  }

  /**
   * Override disable to properly disable radio inputs
   */
  disable() {
    super.disable();

    // Disable all radio inputs
    if (this.radioInputs.length > 0) {
      this.radioInputs.forEach(input => {
        input.disabled = true;
      });
    }
  }

  /**
   * Override enable to properly enable radio inputs
   */
  enable() {
    super.enable();

    // Enable all radio inputs
    if (this.radioInputs.length > 0) {
      this.radioInputs.forEach(input => {
        input.disabled = false;
      });
    }
  }

  /**
   * Destroy the control and cleanup resources
   * Clears radio input references and calls parent destroy
   */
  destroy() {
    // Clear radio input references
    this.radioInputs = [];
    this.groupElement = null;

    // Call parent destroy
    super.destroy();
  }
}
