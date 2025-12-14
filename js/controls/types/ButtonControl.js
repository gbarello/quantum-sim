/**
 * ButtonControl - Clickable action button control
 *
 * Extends BaseControl to provide a fully-featured button control with:
 * - Text and icon support (icon on left)
 * - Multiple style variants (primary, secondary, outline, ghost, success)
 * - Full width option
 * - Click event handling
 * - Dynamic update support for text and icon (e.g., play/pause toggle)
 *
 * Configuration:
 * - text: Button text content
 * - icon: Icon (emoji or text) displayed on left of text
 * - variant: Style variant (primary, secondary, outline, ghost, success)
 * - fullWidth: Whether button should take full width
 * - onClick: Click handler function
 */

import { BaseControl } from '../BaseControl.js';

export class ButtonControl extends BaseControl {
  /**
   * Constructor for ButtonControl
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier
   * @param {string} [config.label] - Aria-label for accessibility (defaults to text if not provided)
   * @param {string} config.text - Button text to display
   * @param {string} [config.icon] - Icon to display (emoji or text)
   * @param {string} [config.variant='primary'] - Style variant
   * @param {boolean} [config.fullWidth=false] - Full width button
   * @param {Function} [config.onClick] - Click handler
   */
  constructor(config) {
    // Validate required fields before calling super
    if (!config.text) {
      throw new Error(`ButtonControl '${config.id}': config.text is required`);
    }

    // If label is not provided, use text for accessibility
    if (!config.label) {
      config.label = config.text;
    }

    super(config);

    // Button-specific properties
    this.text = config.text;
    this.icon = config.icon || '';
    this.variant = config.variant || 'primary';
    this.fullWidth = config.fullWidth || false;
    this._onClick = config.onClick || null;

    // DOM element reference
    this.buttonElement = null;
  }

  /**
   * Render the button control
   * Creates the button HTML structure with icon and text
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered button container
   */
  render(parentElement) {
    if (this._destroyed) {
      throw new Error(`Cannot render destroyed control '${this.id}'`);
    }

    // Create container
    this.container = this._createContainer();
    this.container.className = 'button-control';
    this._applyAttributes(this.container);

    // Create button element
    this.buttonElement = document.createElement('button');
    this.buttonElement.id = this.id;
    this.buttonElement.className = this._getButtonClasses();
    this.buttonElement.setAttribute('type', 'button');
    this.buttonElement.setAttribute('aria-label', this.label);

    // Set initial content (icon + text)
    this._updateButtonContent();

    // Handle click events
    this.buttonElement.addEventListener('click', (e) => {
      if (!this._enabled) return;

      // Emit 'click' event with button reference
      this.emit('click', { button: this });

      // Call onClick handler if provided
      if (this._onClick) {
        try {
          this._onClick.call(this, this);
        } catch (error) {
          console.error(`Error in onClick handler for button '${this.id}':`, error);
        }
      }
    });

    // Apply disabled state if needed
    if (!this._enabled) {
      this.buttonElement.disabled = true;
    }

    // Add button to container
    this.container.appendChild(this.buttonElement);

    // Add to parent if provided
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  /**
   * Get current button state (text and icon)
   * @returns {Object} Current state with text and icon
   */
  getValue() {
    return {
      text: this.text,
      icon: this.icon
    };
  }

  /**
   * Set button state (text and/or icon)
   * @param {Object} value - New state
   * @param {string} [value.text] - New text
   * @param {string} [value.icon] - New icon
   */
  setValue(value) {
    if (typeof value === 'object') {
      if (value.text !== undefined) {
        this.text = value.text;
      }
      if (value.icon !== undefined) {
        this.icon = value.icon;
      }
      this._updateButtonContent();
    }
  }

  /**
   * Set button text
   * @param {string} text - New text
   */
  setText(text) {
    this.text = text;
    this._updateButtonContent();
  }

  /**
   * Set button icon
   * @param {string} icon - New icon
   */
  setIcon(icon) {
    this.icon = icon;
    this._updateButtonContent();
  }

  /**
   * Set button variant
   * @param {string} variant - New variant (primary, secondary, outline, ghost, success)
   */
  setVariant(variant) {
    this.variant = variant;
    if (this.buttonElement) {
      this.buttonElement.className = this._getButtonClasses();
    }
  }

  /**
   * Update button display
   * Refreshes the button content
   */
  update() {
    this._updateButtonContent();
  }

  /**
   * Get CSS classes for button based on configuration
   * @returns {string} Space-separated CSS classes
   * @private
   */
  _getButtonClasses() {
    const classes = ['btn'];

    // Add variant class
    const variant = this.variant || 'primary';
    classes.push(`btn-${variant}`);

    // Add full width class if specified
    if (this.fullWidth) {
      classes.push('btn-full');
    }

    // Add custom classes
    if (this.className) {
      classes.push(this.className);
    }

    return classes.join(' ');
  }

  /**
   * Update button content (icon + text)
   * @private
   */
  _updateButtonContent() {
    if (!this.buttonElement) return;

    // Clear current content
    this.buttonElement.innerHTML = '';

    // Add icon if present (on left)
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'btn-icon';
      iconSpan.textContent = this.icon;
      this.buttonElement.appendChild(iconSpan);
    }

    // Add text
    if (this.text) {
      const textNode = document.createTextNode(this.text);
      this.buttonElement.appendChild(textNode);
    }
  }

  /**
   * Override destroy to clean up button-specific resources
   */
  destroy() {
    this.buttonElement = null;
    this._onClick = null;
    super.destroy();
  }
}

// Note: Registration happens in ControlsManager._registerControlTypes()
// No auto-registration needed here to avoid double registration warning

