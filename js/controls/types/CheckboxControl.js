/**
 * CheckboxControl - Checkbox input control
 *
 * Extends BaseControl to provide a checkbox control with:
 * - Label and description support
 * - Checked/unchecked state
 * - Change event handling
 * - getValue/setValue interface
 *
 * Configuration:
 * - label: Label text displayed next to checkbox
 * - checked: Initial checked state (default: false)
 * - onChange: Change handler function
 */

import { BaseControl } from '../BaseControl.js';

export class CheckboxControl extends BaseControl {
  /**
   * Constructor for CheckboxControl
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier
   * @param {string} config.label - Label text
   * @param {boolean} [config.checked=false] - Initial checked state
   * @param {Function} [config.onChange] - Change handler
   */
  constructor(config) {
    // Validate required fields before calling super
    if (!config.label) {
      throw new Error(`CheckboxControl '${config.id}': config.label is required`);
    }

    super(config);

    // Checkbox-specific properties
    this.checked = config.checked !== undefined ? config.checked : false;
    this.onChangeCallback = config.onChange || null;

    // DOM elements (will be created in render())
    this.checkboxElement = null;
    this.labelElement = null;
  }

  /**
   * Render the checkbox control
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered checkbox container
   */
  render(parentElement) {
    if (!parentElement) {
      throw new Error(`CheckboxControl '${this.id}': parentElement is required`);
    }

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'control-group checkbox-control';
    this.container.id = `control-${this.id}`;

    // Create checkbox input
    this.checkboxElement = document.createElement('input');
    this.checkboxElement.type = 'checkbox';
    this.checkboxElement.id = `${this.id}-input`;
    this.checkboxElement.checked = this.checked;
    this.checkboxElement.className = 'checkbox-input';

    // Create label
    this.labelElement = document.createElement('label');
    this.labelElement.htmlFor = `${this.id}-input`;
    this.labelElement.className = 'checkbox-label';
    this.labelElement.textContent = this.label;

    // Create wrapper for checkbox and label
    const wrapper = document.createElement('div');
    wrapper.className = 'checkbox-wrapper';
    wrapper.appendChild(this.checkboxElement);
    wrapper.appendChild(this.labelElement);

    // Add event listener
    this.checkboxElement.addEventListener('change', (e) => {
      this.checked = e.target.checked;

      // Emit change event first
      this.emit('change', this.checked);

      // Call onChange handler if provided (handler receives value and control instance)
      if (this.onChangeCallback) {
        this.onChangeCallback(this.checked, this);
      }
    });

    this.container.appendChild(wrapper);

    // Append to parent
    parentElement.appendChild(this.container);

    return this.container;
  }

  /**
   * Get the current checked state
   * @returns {boolean} Current checked state
   */
  getValue() {
    return this.checked;
  }

  /**
   * Set the checked state
   * @param {boolean} checked - New checked state
   */
  setValue(checked) {
    this.checked = checked;
    if (this.checkboxElement) {
      this.checkboxElement.checked = checked;
    }
  }

  /**
   * Update the control (called each frame if needed)
   * @param {Object} state - Current application state
   */
  update(state) {
    // Checkboxes typically don't need per-frame updates
    // but this method is here for consistency with BaseControl
  }

  /**
   * Clean up the control
   */
  destroy() {
    if (this.checkboxElement) {
      this.checkboxElement.removeEventListener('change', null);
    }
    super.destroy();
  }
}
