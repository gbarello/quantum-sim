/**
 * ControlRegistry - Central registry for control types and factory
 *
 * Provides a centralized system for registering control types and creating
 * control instances from configuration objects.
 *
 * Usage:
 *   // Register a control type
 *   ControlRegistry.register('slider', SliderControl);
 *
 *   // Create a control from config
 *   const control = ControlRegistry.create({
 *     type: 'slider',
 *     id: 'speed-slider',
 *     label: 'Speed',
 *     min: 0,
 *     max: 100
 *   });
 */

export class ControlRegistry {
  // Private static registry map
  static _registry = new Map();

  /**
   * Register a control type
   * @param {string} type - Type identifier (e.g., 'slider', 'button')
   * @param {Function} controlClass - Control class constructor
   * @throws {Error} If type is invalid or class is not a function
   */
  static register(type, controlClass) {
    // Validate type
    if (!type || typeof type !== 'string') {
      throw new Error('ControlRegistry.register: type must be a non-empty string');
    }

    // Validate class
    if (typeof controlClass !== 'function') {
      throw new Error(`ControlRegistry.register: controlClass must be a constructor function for type '${type}'`);
    }

    // Check if already registered
    if (this._registry.has(type)) {
      console.warn(`ControlRegistry: Overwriting existing registration for type '${type}'`);
    }

    // Register the control type
    this._registry.set(type, controlClass);
  }

  /**
   * Create a control instance from configuration
   * @param {Object} config - Control configuration object
   * @param {string} config.type - Type of control to create
   * @param {string} config.id - Unique identifier for the control
   * @param {string} config.label - Display label (optional for some control types)
   * @param {...*} config.* - Additional type-specific configuration
   * @returns {BaseControl} New control instance
   * @throws {Error} If configuration is invalid or type not registered
   */
  static create(config) {
    // Validate config
    if (!config || typeof config !== 'object') {
      throw new Error('ControlRegistry.create: config must be an object');
    }

    if (!config.type) {
      throw new Error('ControlRegistry.create: config.type is required');
    }

    if (!config.id) {
      throw new Error('ControlRegistry.create: config.id is required');
    }

    // Label is optional for some control types (e.g., button uses 'text')
    // The control class constructor will validate if label is required for its type

    // Check if type is registered
    if (!this._registry.has(config.type)) {
      throw new Error(
        `ControlRegistry.create: Unknown control type '${config.type}'. ` +
        `Available types: ${this.getTypes().join(', ')}`
      );
    }

    // Get the control class
    const ControlClass = this._registry.get(config.type);

    // Create and return the control instance
    try {
      return new ControlClass(config);
    } catch (error) {
      throw new Error(
        `ControlRegistry.create: Failed to create control of type '${config.type}' with id '${config.id}': ${error.message}`
      );
    }
  }

  /**
   * Check if a control type is registered
   * @param {string} type - Type identifier to check
   * @returns {boolean} True if type is registered
   */
  static has(type) {
    if (!type || typeof type !== 'string') {
      return false;
    }
    return this._registry.has(type);
  }

  /**
   * Get all registered control types
   * @returns {string[]} Array of registered type identifiers
   */
  static getTypes() {
    return Array.from(this._registry.keys());
  }

  /**
   * Unregister a control type
   * @param {string} type - Type identifier to unregister
   * @returns {boolean} True if type was unregistered, false if it wasn't registered
   */
  static unregister(type) {
    if (!type || typeof type !== 'string') {
      return false;
    }
    return this._registry.delete(type);
  }

  /**
   * Clear all registered control types
   * Warning: This will remove all registrations. Use with caution.
   */
  static clear() {
    this._registry.clear();
  }

  /**
   * Get the class for a registered control type
   * @param {string} type - Type identifier
   * @returns {Function|undefined} Control class constructor or undefined if not found
   */
  static getClass(type) {
    if (!type || typeof type !== 'string') {
      return undefined;
    }
    return this._registry.get(type);
  }

  /**
   * Validate a control configuration object
   * Checks if the configuration has all required fields and the type is registered
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validation result: { valid: boolean, errors: string[] }
   */
  static validate(config) {
    const errors = [];

    // Check if config is an object
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { valid: false, errors };
    }

    // Check required fields
    if (!config.type) {
      errors.push('Missing required field: type');
    } else if (typeof config.type !== 'string') {
      errors.push('Field "type" must be a string');
    } else if (!this._registry.has(config.type)) {
      errors.push(
        `Unknown control type: "${config.type}". Available types: ${this.getTypes().join(', ')}`
      );
    }

    if (!config.id) {
      errors.push('Missing required field: id');
    } else if (typeof config.id !== 'string') {
      errors.push('Field "id" must be a string');
    }

    // Label is optional for some control types (e.g., button uses 'text')
    // Only validate type if present
    if (config.label && typeof config.label !== 'string') {
      errors.push('Field "label" must be a string');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create multiple controls from an array of configurations
   * @param {Object[]} configs - Array of control configuration objects
   * @param {boolean} [ignoreErrors=false] - If true, skip invalid configs instead of throwing
   * @returns {BaseControl[]} Array of created control instances
   * @throws {Error} If any configuration is invalid (unless ignoreErrors is true)
   */
  static createMany(configs, ignoreErrors = false) {
    if (!Array.isArray(configs)) {
      throw new Error('ControlRegistry.createMany: configs must be an array');
    }

    const controls = [];
    const errors = [];

    configs.forEach((config, index) => {
      try {
        const control = this.create(config);
        controls.push(control);
      } catch (error) {
        const errorMsg = `Failed to create control at index ${index}: ${error.message}`;

        if (ignoreErrors) {
          console.error(`ControlRegistry.createMany: ${errorMsg}`);
        } else {
          errors.push(errorMsg);
        }
      }
    });

    // If there were errors and we're not ignoring them, throw
    if (!ignoreErrors && errors.length > 0) {
      throw new Error(
        `ControlRegistry.createMany: Failed to create ${errors.length} control(s):\n` +
        errors.join('\n')
      );
    }

    return controls;
  }
}
