/**
 * BaseControl - Abstract base class for all control types
 *
 * Provides common functionality for lifecycle management, event handling,
 * state management, and DOM manipulation.
 *
 * All concrete control types should extend this class and implement
 * the abstract methods: render(), getValue(), setValue()
 */

export class BaseControl {
  /**
   * Constructor for BaseControl
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier for the control
   * @param {string} [config.label] - Display label for the control (optional for some types)
   * @param {*} [config.defaultValue] - Initial value
   * @param {boolean} [config.enabled=true] - Initial enabled state
   * @param {boolean} [config.visible=true] - Initial visibility state
   * @param {Function} [config.onChange] - Change event handler
   * @param {Function} [config.showIf] - Conditional visibility function (manager) => boolean
   * @param {string} [config.className] - Additional CSS classes
   * @param {string} [config.tooltip] - Tooltip text
   * @param {Object} [config.attributes] - Additional HTML attributes
   */
  constructor(config) {
    // Validate required fields
    if (!config.id) {
      throw new Error('BaseControl: config.id is required');
    }
    // Label is optional - some control types (e.g., button) may use alternative properties
    // Subclasses should validate if label is required for their specific type

    // Core properties
    this.id = config.id;
    this.label = config.label || '';  // Default to empty string if not provided
    this.defaultValue = config.defaultValue;

    // State management
    this._enabled = config.enabled !== undefined ? config.enabled : true;
    this._visible = config.visible !== undefined ? config.visible : true;

    // Conditional visibility
    this._showIf = config.showIf || null;

    // DOM reference
    this.container = null;

    // Event management
    this.eventListeners = new Map();
    this._onChange = config.onChange || null;

    // Styling
    this.className = config.className || '';
    this.tooltip = config.tooltip || '';
    this.attributes = config.attributes || {};

    // Internal state
    this._destroyed = false;
  }

  /**
   * Abstract method: Render the control
   * Must be implemented by subclasses to create and return DOM element
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered control element
   * @abstract
   */
  render(parentElement) {
    throw new Error('BaseControl.render() must be implemented by subclass');
  }

  /**
   * Abstract method: Get current value
   * Must be implemented by subclasses to return the current control value
   * @returns {*} Current value
   * @abstract
   */
  getValue() {
    throw new Error('BaseControl.getValue() must be implemented by subclass');
  }

  /**
   * Abstract method: Set value
   * Must be implemented by subclasses to update the control value
   * @param {*} value - New value to set
   * @abstract
   */
  setValue(value) {
    throw new Error('BaseControl.setValue() must be implemented by subclass');
  }

  /**
   * Emit a custom event
   * @param {string} eventName - Name of the event to emit
   * @param {*} data - Data to pass with the event
   */
  emit(eventName, data) {
    if (this._destroyed) {
      console.warn(`Cannot emit event '${eventName}' on destroyed control '${this.id}'`);
      return;
    }

    // Call registered event listeners
    const listeners = this.eventListeners.get(eventName) || [];
    listeners.forEach(listener => {
      try {
        listener.call(this, data);
      } catch (error) {
        console.error(`Error in event listener for '${eventName}' on control '${this.id}':`, error);
      }
    });

    // Call onChange handler if it's a change event
    if (eventName === 'change' && this._onChange) {
      try {
        this._onChange.call(this, data);
      } catch (error) {
        console.error(`Error in onChange handler for control '${this.id}':`, error);
      }
    }

    // Dispatch native DOM event if container exists
    if (this.container) {
      const customEvent = new CustomEvent(`control:${eventName}`, {
        detail: { controlId: this.id, data },
        bubbles: true,
        cancelable: true
      });
      this.container.dispatchEvent(customEvent);
    }
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }

    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }

    this.eventListeners.get(eventName).push(handler);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {Function} handler - Event handler to remove (if not provided, removes all)
   */
  off(eventName, handler) {
    if (!this.eventListeners.has(eventName)) {
      return;
    }

    if (!handler) {
      // Remove all listeners for this event
      this.eventListeners.delete(eventName);
    } else {
      // Remove specific handler
      const listeners = this.eventListeners.get(eventName);
      const index = listeners.indexOf(handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }

      // Clean up empty arrays
      if (listeners.length === 0) {
        this.eventListeners.delete(eventName);
      }
    }
  }

  /**
   * Enable the control
   */
  enable() {
    if (this._enabled) return;

    this._enabled = true;
    if (this.container) {
      this.container.classList.remove('disabled');

      // Enable all input elements
      const inputs = this.container.querySelectorAll('input, button, select, textarea');
      inputs.forEach(input => input.disabled = false);
    }

    this.emit('enabled');
  }

  /**
   * Disable the control
   */
  disable() {
    if (!this._enabled) return;

    this._enabled = false;
    if (this.container) {
      this.container.classList.add('disabled');

      // Disable all input elements
      const inputs = this.container.querySelectorAll('input, button, select, textarea');
      inputs.forEach(input => input.disabled = true);
    }

    this.emit('disabled');
  }

  /**
   * Show the control
   */
  show() {
    if (this._visible) return;

    this._visible = true;
    if (this.container) {
      this.container.style.display = '';
      this.container.classList.remove('hidden');
    }

    this.emit('shown');
  }

  /**
   * Hide the control
   */
  hide() {
    if (!this._visible) return;

    this._visible = false;
    if (this.container) {
      this.container.style.display = 'none';
      this.container.classList.add('hidden');
    }

    this.emit('hidden');
  }

  /**
   * Check if control is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Check if control is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._visible;
  }

  /**
   * Update the control display
   * Subclasses can override to implement custom update logic
   */
  update() {
    // Default implementation does nothing
    // Subclasses should override if they need to refresh their display
  }

  /**
   * Evaluate conditional visibility and update display state
   * @param {Object} manager - The controls manager instance for context
   */
  updateVisibility(manager) {
    if (!this._showIf) {
      // No conditional visibility, keep current state
      return;
    }

    try {
      const shouldShow = this._showIf(manager);
      if (shouldShow && !this._visible) {
        this.show();
      } else if (!shouldShow && this._visible) {
        this.hide();
      }
    } catch (error) {
      console.error(`Error evaluating showIf for control '${this.id}':`, error);
    }
  }

  /**
   * Destroy the control and cleanup resources
   * Removes DOM elements, event listeners, and clears references
   */
  destroy() {
    if (this._destroyed) return;

    // Clear all event listeners
    this.eventListeners.clear();

    // Remove DOM element
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Clear references
    this.container = null;
    this._onChange = null;

    // Mark as destroyed
    this._destroyed = true;

    // Note: We don't emit a 'destroyed' event since listeners are already cleared
  }

  /**
   * Check if control has been destroyed
   * @returns {boolean}
   */
  isDestroyed() {
    return this._destroyed;
  }

  /**
   * Create a label element for the control
   * Helper method for subclasses to create consistent labels
   * @param {string} forId - ID of the input element this label is for
   * @returns {HTMLLabelElement}
   * @protected
   */
  _createLabel(forId) {
    const label = document.createElement('label');
    label.setAttribute('for', forId);
    label.className = 'control-label';
    label.textContent = this.label;

    if (this.tooltip) {
      label.setAttribute('title', this.tooltip);
    }

    return label;
  }

  /**
   * Apply common attributes and classes to an element
   * Helper method for subclasses
   * @param {HTMLElement} element - Element to apply attributes to
   * @protected
   */
  _applyAttributes(element) {
    // Apply custom classes
    if (this.className) {
      element.className += ' ' + this.className;
    }

    // Apply tooltip
    if (this.tooltip) {
      element.setAttribute('title', this.tooltip);
    }

    // Apply custom attributes
    Object.entries(this.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    // Apply initial state
    if (!this._enabled) {
      element.classList.add('disabled');
    }
    if (!this._visible) {
      element.style.display = 'none';
      element.classList.add('hidden');
    }
  }

  /**
   * Create a wrapper container for the control
   * Helper method for subclasses to create consistent control structure
   * @returns {HTMLDivElement}
   * @protected
   */
  _createContainer() {
    const container = document.createElement('div');
    container.className = 'control-wrapper';
    container.setAttribute('data-control-id', this.id);
    container.setAttribute('data-control-type', this.constructor.name);

    this._applyAttributes(container);

    return container;
  }
}
