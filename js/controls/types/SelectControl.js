/**
 * SelectControl - Dropdown selection control
 *
 * Provides a dropdown select element with configurable options.
 * Supports option labels, values, disabled options, and placeholders.
 *
 * Configuration:
 * - options: Array of {value, label, disabled} objects
 * - value: Currently selected value
 * - placeholder: Placeholder text (optional)
 *
 * Events:
 * - change: Emitted when selection changes (data = selected value)
 * - focus: Emitted when select gains focus
 * - blur: Emitted when select loses focus
 */

import { BaseControl } from '../BaseControl.js';

export class SelectControl extends BaseControl {
  /**
   * Constructor for SelectControl
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier
   * @param {string} config.label - Display label
   * @param {Array<Object>} config.options - Array of option objects
   * @param {*} config.options[].value - Value for the option
   * @param {string} config.options[].label - Display label for the option
   * @param {boolean} [config.options[].disabled] - Whether option is disabled
   * @param {*} [config.value] - Initially selected value
   * @param {string} [config.placeholder] - Placeholder text
   */
  constructor(config) {
    super(config);

    // Validate options
    if (!config.options || !Array.isArray(config.options)) {
      throw new Error(`SelectControl '${this.id}': options must be an array`);
    }

    if (config.options.length === 0) {
      throw new Error(`SelectControl '${this.id}': options array cannot be empty`);
    }

    // Store configuration
    this.options = config.options;
    this.placeholder = config.placeholder || '';
    this._value = config.value !== undefined ? config.value : null;

    // Reference to select element
    this.selectElement = null;
  }

  /**
   * Render the select control
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered control container
   */
  render(parentElement) {
    // Create container
    this.container = this._createContainer();
    this.container.classList.add('select-control');

    // Create label
    const label = this._createLabel(`${this.id}-select`);

    // Create select wrapper (for custom styling with arrow)
    const selectWrapper = document.createElement('div');
    selectWrapper.className = 'select-wrapper';

    // Create select element
    this.selectElement = document.createElement('select');
    this.selectElement.id = `${this.id}-select`;
    this.selectElement.className = 'control-select';

    // Add placeholder option if provided
    if (this.placeholder) {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = this.placeholder;
      placeholderOption.disabled = true;
      placeholderOption.selected = this._value === null || this._value === '';
      this.selectElement.appendChild(placeholderOption);
    }

    // Add options
    this.options.forEach(option => {
      const optionElement = this._createOption(option);
      this.selectElement.appendChild(optionElement);
    });

    // Set initial value if specified
    if (this._value !== null && this._value !== '') {
      this.selectElement.value = this._value;
    }

    // Add event listeners
    this.selectElement.addEventListener('change', (e) => {
      const newValue = this._parseValue(e.target.value);
      this._value = newValue;
      this.emit('change', newValue);
    });

    this.selectElement.addEventListener('focus', () => {
      this.emit('focus');
    });

    this.selectElement.addEventListener('blur', () => {
      this.emit('blur');
    });

    // Apply disabled state if needed
    if (!this._enabled) {
      this.selectElement.disabled = true;
    }

    // Build structure
    selectWrapper.appendChild(this.selectElement);
    this.container.appendChild(label);
    this.container.appendChild(selectWrapper);

    // Attach to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  /**
   * Get the current selected value
   * @returns {*} Current selected value (or null if nothing selected)
   */
  getValue() {
    if (!this.selectElement) {
      return this._value;
    }

    const selectedValue = this.selectElement.value;

    // If empty or placeholder, return null
    if (selectedValue === '' || selectedValue === null) {
      return null;
    }

    return this._parseValue(selectedValue);
  }

  /**
   * Set the selected value
   * @param {*} value - Value to select
   */
  setValue(value) {
    this._value = value;

    if (this.selectElement) {
      // Find matching option
      const stringValue = String(value);
      const option = Array.from(this.selectElement.options).find(
        opt => opt.value === stringValue
      );

      if (option) {
        this.selectElement.value = stringValue;
        this.emit('change', value);
      } else {
        console.warn(
          `SelectControl '${this.id}': Value '${value}' not found in options`
        );
      }
    }
  }

  /**
   * Update the options list
   * @param {Array<Object>} newOptions - New options array
   */
  setOptions(newOptions) {
    if (!Array.isArray(newOptions) || newOptions.length === 0) {
      throw new Error(`SelectControl '${this.id}': Invalid options array`);
    }

    this.options = newOptions;

    if (this.selectElement) {
      // Clear existing options
      this.selectElement.innerHTML = '';

      // Re-add placeholder if it exists
      if (this.placeholder) {
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = this.placeholder;
        placeholderOption.disabled = true;
        this.selectElement.appendChild(placeholderOption);
      }

      // Add new options
      newOptions.forEach(option => {
        const optionElement = this._createOption(option);
        this.selectElement.appendChild(optionElement);
      });

      // Restore previous value if it still exists
      if (this._value !== null) {
        const stringValue = String(this._value);
        const option = Array.from(this.selectElement.options).find(
          opt => opt.value === stringValue
        );
        if (option) {
          this.selectElement.value = stringValue;
        } else {
          // Value no longer exists, reset
          this._value = null;
          this.selectElement.selectedIndex = 0;
        }
      }
    }
  }

  /**
   * Create an option element
   * @param {Object} option - Option configuration
   * @returns {HTMLOptionElement} Created option element
   * @private
   */
  _createOption(option) {
    const optionElement = document.createElement('option');

    // Set value (convert to string for DOM)
    const value = option.value !== undefined ? option.value : '';
    optionElement.value = String(value);

    // Set label
    const label = option.label !== undefined ? option.label : String(value);
    optionElement.textContent = label;

    // Set disabled state
    if (option.disabled) {
      optionElement.disabled = true;
    }

    // Set selected state
    if (this._value !== null && this._value === value) {
      optionElement.selected = true;
    }

    return optionElement;
  }

  /**
   * Parse a value from string to its original type
   * Attempts to infer the original type from the options array
   * @param {string} stringValue - String value from select element
   * @returns {*} Parsed value
   * @private
   */
  _parseValue(stringValue) {
    // Find the option with matching string value
    const matchingOption = this.options.find(
      opt => String(opt.value) === stringValue
    );

    // Return the original value type if found
    if (matchingOption) {
      return matchingOption.value;
    }

    // Fallback: return as string
    return stringValue;
  }
}
