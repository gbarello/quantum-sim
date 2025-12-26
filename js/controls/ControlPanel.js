/**
 * ControlPanel - Container and layout manager for related controls
 *
 * Purpose: Groups controls logically, manages their lifecycle, and provides
 * a consistent container structure with optional collapsibility.
 *
 * Features:
 * - Group controls logically within a panel
 * - Manage control lifecycle (add, remove, destroy)
 * - Handle layout and styling
 * - Optional collapsible panels with smooth animation
 * - Provide context to child controls
 *
 * Usage:
 *   const panel = new ControlPanel({
 *     id: 'initial-conditions',
 *     title: 'Initial Conditions',
 *     icon: '🎯',
 *     collapsible: true,
 *     collapsed: false,
 *     controls: [
 *       { type: 'slider', id: 'speed', label: 'Speed', min: 0, max: 100 },
 *       { type: 'button', id: 'reset', label: 'Reset', onClick: () => {...} }
 *     ]
 *   });
 *
 *   panel.render(document.getElementById('container'));
 */

import { ControlRegistry } from './ControlRegistry.js';

export class ControlPanel {
  /**
   * Constructor for ControlPanel
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier for the panel
   * @param {string} config.title - Panel title
   * @param {string} [config.icon] - Optional icon/emoji for the panel header
   * @param {boolean} [config.collapsible=false] - Whether panel can be collapsed
   * @param {boolean} [config.collapsed=false] - Initially collapsed state
   * @param {Array<Object>} [config.controls=[]] - Array of control configurations
   * @param {string} [config.className] - Additional CSS classes
   */
  constructor(config) {
    // Validate required fields
    if (!config.id) {
      throw new Error('ControlPanel: config.id is required');
    }
    if (!config.title) {
      throw new Error('ControlPanel: config.title is required');
    }

    // Core properties
    this.id = config.id;
    this.title = config.title;
    this.icon = config.icon || '';

    // Collapsible state
    this.collapsible = config.collapsible !== undefined ? config.collapsible : false;
    this.collapsed = config.collapsed !== undefined ? config.collapsed : false;

    // Controls management
    this.controls = [];
    this.controlsMap = new Map(); // Fast lookup by control ID

    // DOM references
    this.container = null;
    this.headerElement = null;
    this.contentElement = null;
    this.toggleButton = null;

    // Styling
    this.className = config.className || '';

    // Internal state
    this._destroyed = false;
    this._rendered = false;

    // Create controls from config if provided
    if (config.controls && Array.isArray(config.controls)) {
      config.controls.forEach(controlConfig => {
        try {
          const control = ControlRegistry.create(controlConfig);
          this.addControl(control);
        } catch (error) {
          console.error(`ControlPanel '${this.id}': Failed to create control from config:`, error);
        }
      });
    }
  }

  /**
   * Add a control to the panel
   * @param {BaseControl} control - Control instance to add
   * @throws {Error} If control is invalid or ID already exists
   */
  addControl(control) {
    if (this._destroyed) {
      throw new Error(`ControlPanel '${this.id}': Cannot add control to destroyed panel`);
    }

    // Validate control
    if (!control || typeof control !== 'object') {
      throw new Error(`ControlPanel '${this.id}': Invalid control object`);
    }

    if (!control.id) {
      throw new Error(`ControlPanel '${this.id}': Control must have an id property`);
    }

    // Check for duplicate ID
    if (this.controlsMap.has(control.id)) {
      throw new Error(
        `ControlPanel '${this.id}': Control with id '${control.id}' already exists`
      );
    }

    // Add to collections
    this.controls.push(control);
    this.controlsMap.set(control.id, control);

    // If panel is already rendered, render the new control
    if (this._rendered && this.contentElement) {
      control.render(this.contentElement);
    }
  }

  /**
   * Remove a control from the panel
   * @param {string} controlId - ID of control to remove
   * @returns {boolean} True if control was removed, false if not found
   */
  removeControl(controlId) {
    if (this._destroyed) {
      console.warn(`ControlPanel '${this.id}': Cannot remove control from destroyed panel`);
      return false;
    }

    // Find control
    const control = this.controlsMap.get(controlId);
    if (!control) {
      return false;
    }

    // Remove from map
    this.controlsMap.delete(controlId);

    // Remove from array
    const index = this.controls.indexOf(control);
    if (index !== -1) {
      this.controls.splice(index, 1);
    }

    // Destroy the control (removes from DOM and cleans up)
    control.destroy();

    return true;
  }

  /**
   * Get a control by ID
   * @param {string} controlId - ID of control to retrieve
   * @returns {BaseControl|undefined} The control instance or undefined if not found
   */
  getControl(controlId) {
    return this.controlsMap.get(controlId);
  }

  /**
   * Get all controls
   * @returns {BaseControl[]} Array of all control instances
   */
  getAllControls() {
    return [...this.controls];
  }

  /**
   * Render the panel and all its controls
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered panel element
   */
  render(parentElement) {
    if (this._destroyed) {
      throw new Error(`ControlPanel '${this.id}': Cannot render destroyed panel`);
    }

    if (!parentElement) {
      throw new Error(`ControlPanel '${this.id}': parentElement is required for render()`);
    }

    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'control-panel';
    if (this.collapsible) {
      this.container.classList.add('collapsible-panel');
      if (!this.collapsed) {
        this.container.classList.add('expanded');
      }
    }
    if (this.className) {
      this.container.className += ' ' + this.className;
    }
    this.container.id = `panel-${this.id}`;
    this.container.setAttribute('data-panel-id', this.id);

    // Create panel header
    this.headerElement = this._createHeader();
    this.container.appendChild(this.headerElement);

    // Create panel content
    this.contentElement = this._createContent();
    this.container.appendChild(this.contentElement);

    // Add to parent
    parentElement.appendChild(this.container);

    // Render all controls
    this.controls.forEach(control => {
      try {
        control.render(this.contentElement);
      } catch (error) {
        console.error(
          `ControlPanel '${this.id}': Failed to render control '${control.id}':`,
          error
        );
      }
    });

    // Apply initial collapsed state
    if (this.collapsible && this.collapsed) {
      this._applyCollapsedState();
    }

    this._rendered = true;
    return this.container;
  }

  /**
   * Create the panel header element
   * @returns {HTMLElement}
   * @private
   */
  _createHeader() {
    const header = document.createElement('div');
    header.className = this.collapsible ? 'collapsible-header' : 'panel-header';

    // Icon (if provided)
    if (this.icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'panel-icon';
      iconSpan.textContent = this.icon;
      header.appendChild(iconSpan);
    }

    // Title
    const title = document.createElement('h3');
    title.className = this.collapsible ? 'collapsible-title' : 'panel-title';
    title.textContent = this.title;
    header.appendChild(title);

    // Toggle button (if collapsible)
    if (this.collapsible) {
      this.toggleButton = document.createElement('button');
      this.toggleButton.className = 'panel-toggle collapsible-icon';
      this.toggleButton.textContent = '▶'; // Right arrow, rotates when expanded
      this.toggleButton.setAttribute('type', 'button');
      this.toggleButton.setAttribute('aria-label', 'Toggle panel');
      this.toggleButton.setAttribute('aria-expanded', !this.collapsed);

      // Click handler for toggle
      this.toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      header.appendChild(this.toggleButton);

      // Make header clickable if collapsible
      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        this.toggle();
      });
    }

    return header;
  }

  /**
   * Create the panel content element
   * @returns {HTMLElement}
   * @private
   */
  _createContent() {
    const content = document.createElement('div');
    content.className = this.collapsible ? 'collapsible-content' : 'panel-content';

    // Inner body for padding
    const body = document.createElement('div');
    body.className = this.collapsible ? 'collapsible-body' : 'panel-body';
    content.appendChild(body);

    return content;
  }

  /**
   * Apply collapsed state (hide content)
   * @private
   */
  _applyCollapsedState() {
    if (!this.container || !this.collapsible) return;

    if (this.collapsed) {
      this.container.classList.remove('expanded');
      if (this.toggleButton) {
        this.toggleButton.setAttribute('aria-expanded', 'false');
      }
    } else {
      this.container.classList.add('expanded');
      if (this.toggleButton) {
        this.toggleButton.setAttribute('aria-expanded', 'true');
      }
    }
  }

  /**
   * Collapse the panel
   */
  collapse() {
    if (!this.collapsible || this.collapsed) return;

    this.collapsed = true;
    this._applyCollapsedState();
  }

  /**
   * Expand the panel
   */
  expand() {
    if (!this.collapsible || !this.collapsed) return;

    this.collapsed = false;
    this._applyCollapsedState();
  }

  /**
   * Toggle panel collapsed/expanded state
   */
  toggle() {
    if (!this.collapsible) return;

    if (this.collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  /**
   * Check if panel is collapsed
   * @returns {boolean}
   */
  isCollapsed() {
    return this.collapsed;
  }

  /**
   * Check if panel is collapsible
   * @returns {boolean}
   */
  isCollapsible() {
    return this.collapsible;
  }

  /**
   * Update all controls in the panel
   * Calls update() on each control
   * @param {Object} [manager] - Optional manager for conditional visibility evaluation
   */
  update(manager = null) {
    if (this._destroyed) return;

    this.controls.forEach(control => {
      try {
        // Update conditional visibility if manager is provided
        if (manager && typeof control.updateVisibility === 'function') {
          control.updateVisibility(manager);
        }

        // Update control display
        if (typeof control.update === 'function') {
          control.update();
        }
      } catch (error) {
        console.error(
          `ControlPanel '${this.id}': Error updating control '${control.id}':`,
          error
        );
      }
    });
  }

  /**
   * Destroy the panel and all its controls
   * Cleanup all resources, event listeners, and DOM elements
   */
  destroy() {
    if (this._destroyed) return;

    // Destroy all controls
    this.controls.forEach(control => {
      try {
        control.destroy();
      } catch (error) {
        console.error(
          `ControlPanel '${this.id}': Error destroying control '${control.id}':`,
          error
        );
      }
    });

    // Clear collections
    this.controls = [];
    this.controlsMap.clear();

    // Remove DOM element
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    // Clear references
    this.container = null;
    this.headerElement = null;
    this.contentElement = null;
    this.toggleButton = null;

    // Mark as destroyed
    this._destroyed = true;
    this._rendered = false;
  }

  /**
   * Check if panel has been destroyed
   * @returns {boolean}
   */
  isDestroyed() {
    return this._destroyed;
  }

  /**
   * Check if panel has been rendered
   * @returns {boolean}
   */
  isRendered() {
    return this._rendered;
  }

  /**
   * Get the number of controls in this panel
   * @returns {number}
   */
  getControlCount() {
    return this.controls.length;
  }

  /**
   * Check if panel has a control with the given ID
   * @param {string} controlId - Control ID to check
   * @returns {boolean}
   */
  hasControl(controlId) {
    return this.controlsMap.has(controlId);
  }

  /**
   * Enable all controls in the panel
   */
  enableAll() {
    this.controls.forEach(control => {
      if (typeof control.enable === 'function') {
        control.enable();
      }
    });
  }

  /**
   * Disable all controls in the panel
   */
  disableAll() {
    this.controls.forEach(control => {
      if (typeof control.disable === 'function') {
        control.disable();
      }
    });
  }

  /**
   * Show all controls in the panel
   */
  showAll() {
    this.controls.forEach(control => {
      if (typeof control.show === 'function') {
        control.show();
      }
    });
  }

  /**
   * Hide all controls in the panel
   */
  hideAll() {
    this.controls.forEach(control => {
      if (typeof control.hide === 'function') {
        control.hide();
      }
    });
  }

  /**
   * Get values of all controls in the panel
   * @returns {Object} Object mapping control IDs to their values
   */
  getValues() {
    const values = {};
    this.controls.forEach(control => {
      if (typeof control.getValue === 'function') {
        try {
          values[control.id] = control.getValue();
        } catch (error) {
          console.error(
            `ControlPanel '${this.id}': Error getting value from control '${control.id}':`,
            error
          );
        }
      }
    });
    return values;
  }

  /**
   * Set values of controls in the panel
   * @param {Object} values - Object mapping control IDs to values
   */
  setValues(values) {
    if (!values || typeof values !== 'object') return;

    Object.entries(values).forEach(([controlId, value]) => {
      const control = this.getControl(controlId);
      if (control && typeof control.setValue === 'function') {
        try {
          control.setValue(value);
        } catch (error) {
          console.error(
            `ControlPanel '${this.id}': Error setting value for control '${controlId}':`,
            error
          );
        }
      }
    });
  }
}
