/**
 * TabManager - Manages multiple control panels as tabs
 *
 * Handles tab switching, panel visibility, keyboard navigation,
 * and provides animated transitions between tabs.
 *
 * Features:
 * - Tab bar with icon + title buttons
 * - Panel visibility management (only active panel visible)
 * - Keyboard navigation (arrow keys, Enter/Space)
 * - Optional animations (fade, slide)
 * - Optional persistent state (remembers last active tab)
 * - Flexible tab positioning (top, bottom, left, right)
 * - Custom events for tab changes
 *
 * @example
 * const tabManager = new TabManager({
 *   panels: [panel1, panel2, panel3],
 *   defaultPanel: 'simulation',
 *   tabPosition: 'top',
 *   animated: true,
 *   persistent: true
 * });
 * tabManager.render(document.getElementById('controls-container'));
 */

export class TabManager {
  /**
   * Constructor for TabManager
   * @param {Object} config - Configuration object
   * @param {Array} config.panels - Array of panel objects with {id, title, icon, element}
   * @param {string} [config.defaultPanel] - ID of initially active panel
   * @param {string} [config.tabPosition='top'] - Position of tab bar ('top', 'bottom', 'left', 'right')
   * @param {boolean} [config.animated=true] - Enable animated transitions
   * @param {boolean} [config.persistent=false] - Remember last active tab in localStorage
   * @param {string} [config.animationType='slide'] - Animation type ('slide', 'fade', 'scale')
   * @param {string} [config.storageKey='tabManager.activePanel'] - localStorage key for persistence
   */
  constructor(config) {
    // Validate required config
    if (!config || !config.panels || !Array.isArray(config.panels)) {
      throw new Error('TabManager: config.panels array is required');
    }

    // Store configuration
    this.config = {
      defaultPanel: config.defaultPanel || null,
      tabPosition: config.tabPosition || 'top',
      animated: config.animated !== undefined ? config.animated : true,
      persistent: config.persistent || false,
      animationType: config.animationType || 'slide',
      storageKey: config.storageKey || 'tabManager.activePanel'
    };

    // State
    this.panels = new Map(); // Map of panel ID -> panel object
    this.activePanel = null; // Currently active panel ID
    this.container = null; // Main container element
    this.tabBar = null; // Tab bar element
    this.contentContainer = null; // Content container element
    this.tabButtons = new Map(); // Map of panel ID -> button element
    this.eventListeners = []; // Track event listeners for cleanup

    // Add initial panels
    if (config.panels && config.panels.length > 0) {
      config.panels.forEach(panel => this.addPanel(panel));
    }

    // Determine initial active panel
    this._determineInitialActivePanel();

    // Track if manager is destroyed
    this._destroyed = false;
  }

  /**
   * Determine which panel should be active initially
   * Priority: 1) Persistent storage, 2) defaultPanel config, 3) First panel
   * @private
   */
  _determineInitialActivePanel() {
    let initialPanel = null;

    // Check persistent storage first
    if (this.config.persistent) {
      const storedPanel = localStorage.getItem(this.config.storageKey);
      if (storedPanel && this.panels.has(storedPanel)) {
        initialPanel = storedPanel;
      }
    }

    // Fall back to defaultPanel config
    if (!initialPanel && this.config.defaultPanel && this.panels.has(this.config.defaultPanel)) {
      initialPanel = this.config.defaultPanel;
    }

    // Fall back to first panel
    if (!initialPanel && this.panels.size > 0) {
      initialPanel = this.panels.keys().next().value;
    }

    // Don't switch yet if not rendered, just store the ID
    if (initialPanel) {
      this.activePanel = initialPanel;
    }
  }

  /**
   * Add a panel to the tab manager
   * @param {Object} panel - Panel object
   * @param {string} panel.id - Unique panel identifier
   * @param {string} panel.title - Display title for tab
   * @param {string} [panel.icon] - Optional icon (emoji or HTML)
   * @param {HTMLElement} [panel.element] - Panel DOM element (can be added later)
   * @param {boolean} [panel.disabled=false] - Whether tab is disabled
   */
  addPanel(panel) {
    if (this._destroyed) {
      throw new Error('Cannot add panel to destroyed TabManager');
    }

    if (!panel || !panel.id) {
      throw new Error('TabManager.addPanel: panel.id is required');
    }
    if (!panel.title) {
      throw new Error('TabManager.addPanel: panel.title is required');
    }

    // Store panel
    this.panels.set(panel.id, {
      id: panel.id,
      title: panel.title,
      icon: panel.icon || '',
      element: panel.element || null,
      disabled: panel.disabled || false
    });

    // If already rendered, update the DOM
    if (this.container) {
      this._renderTabButton(panel.id);
      if (panel.element) {
        this._attachPanelElement(panel.id);
      }
    }
  }

  /**
   * Remove a panel from the tab manager
   * @param {string} panelId - ID of panel to remove
   */
  removePanel(panelId) {
    if (!this.panels.has(panelId)) {
      console.warn(`TabManager.removePanel: Panel '${panelId}' not found`);
      return;
    }

    const panel = this.panels.get(panelId);

    // If this is the active panel, switch to another
    if (this.activePanel === panelId) {
      const panelIds = Array.from(this.panels.keys());
      const nextPanelId = panelIds.find(id => id !== panelId);
      if (nextPanelId) {
        this.switchToPanel(nextPanelId);
      } else {
        this.activePanel = null;
      }
    }

    // Remove from DOM if rendered
    if (this.tabButtons.has(panelId)) {
      const button = this.tabButtons.get(panelId);
      button.remove();
      this.tabButtons.delete(panelId);
    }

    if (panel.element && panel.element.parentElement) {
      panel.element.remove();
    }

    // Remove from panels map
    this.panels.delete(panelId);
  }

  /**
   * Switch to a specific panel
   * @param {string} panelId - ID of panel to activate
   * @param {boolean} [force=false] - Force switch even if already active
   */
  switchToPanel(panelId, force = false) {
    if (this._destroyed) {
      console.warn('Cannot switch panel on destroyed TabManager');
      return;
    }

    if (!this.panels.has(panelId)) {
      console.warn(`TabManager.switchToPanel: Panel '${panelId}' not found`);
      return;
    }

    const panel = this.panels.get(panelId);
    if (panel.disabled) {
      console.warn(`TabManager.switchToPanel: Panel '${panelId}' is disabled`);
      return;
    }

    // Don't switch if already active (unless forced)
    if (this.activePanel === panelId && !force) {
      return;
    }

    const oldPanelId = this.activePanel;
    this.activePanel = panelId;

    // Update DOM if rendered
    if (this.container) {
      this._updateActivePanel(oldPanelId, panelId);
    }

    // Save to persistent storage if enabled
    if (this.config.persistent) {
      localStorage.setItem(this.config.storageKey, panelId);
    }

    // Emit tabchange event
    this._emitEvent('tabchange', {
      from: oldPanelId,
      to: panelId
    });
  }

  /**
   * Get a panel by ID
   * @param {string} panelId - ID of panel to retrieve
   * @returns {Object|null} Panel object or null if not found
   */
  getPanel(panelId) {
    return this.panels.get(panelId) || null;
  }

  /**
   * Render the tab manager into a parent element
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered container element
   */
  render(parentElement) {
    if (this._destroyed) {
      throw new Error('Cannot render destroyed TabManager');
    }

    if (!parentElement) {
      throw new Error('TabManager.render: parentElement is required');
    }

    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'tab-manager';

    // Add vertical class if tab position is left or right
    if (this.config.tabPosition === 'left' || this.config.tabPosition === 'right') {
      this.container.classList.add('tab-container', 'vertical');
    } else {
      this.container.classList.add('tab-container');
    }

    // Create tab bar
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'tab-bar';
    this.tabBar.setAttribute('role', 'tablist');

    // Create content container
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'tab-content-container';

    // Add animation class if enabled
    if (this.config.animated) {
      this.contentContainer.classList.add(`anim-${this.config.animationType}`);
    }

    // Render tab buttons
    for (const panelId of this.panels.keys()) {
      this._renderTabButton(panelId);
    }

    // Attach panel elements
    for (const panelId of this.panels.keys()) {
      this._attachPanelElement(panelId);
    }

    // Arrange elements based on tab position
    if (this.config.tabPosition === 'bottom' || this.config.tabPosition === 'right') {
      this.container.appendChild(this.contentContainer);
      this.container.appendChild(this.tabBar);
    } else {
      this.container.appendChild(this.tabBar);
      this.container.appendChild(this.contentContainer);
    }

    // Append to parent
    parentElement.appendChild(this.container);

    // Set initial active panel
    if (this.activePanel) {
      this._updateActivePanel(null, this.activePanel);
    }

    // Setup keyboard navigation
    this._setupKeyboardNavigation();

    return this.container;
  }

  /**
   * Render a single tab button
   * @private
   */
  _renderTabButton(panelId) {
    const panel = this.panels.get(panelId);
    if (!panel) return;

    // Create button
    const button = document.createElement('button');
    button.className = 'tab-button';
    button.dataset.panelId = panelId;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-label', panel.title);
    button.setAttribute('aria-selected', 'false');
    button.setAttribute('tabindex', '-1');

    if (panel.disabled) {
      button.disabled = true;
    }

    // Add icon if present
    if (panel.icon) {
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.textContent = panel.icon;
      button.appendChild(icon);
    }

    // Add label
    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = panel.title;
    button.appendChild(label);

    // Click handler
    const clickHandler = () => {
      this.switchToPanel(panelId);
    };
    button.addEventListener('click', clickHandler);
    this.eventListeners.push({ element: button, type: 'click', handler: clickHandler });

    // Store button reference
    this.tabButtons.set(panelId, button);

    // Append to tab bar
    if (this.tabBar) {
      this.tabBar.appendChild(button);
    }
  }

  /**
   * Attach a panel element to the content container
   * @private
   */
  _attachPanelElement(panelId) {
    const panel = this.panels.get(panelId);
    if (!panel || !panel.element) return;

    // Create wrapper for panel content
    const wrapper = document.createElement('div');
    wrapper.className = 'tab-content';
    wrapper.dataset.panelId = panelId;
    wrapper.setAttribute('role', 'tabpanel');
    wrapper.setAttribute('aria-labelledby', `tab-${panelId}`);

    // Move panel element into wrapper
    wrapper.appendChild(panel.element);

    // Append to content container
    if (this.contentContainer) {
      this.contentContainer.appendChild(wrapper);
    }
  }

  /**
   * Update active panel in the DOM
   * @private
   */
  _updateActivePanel(oldPanelId, newPanelId) {
    // Update tab buttons
    for (const [panelId, button] of this.tabButtons.entries()) {
      const isActive = panelId === newPanelId;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
      button.setAttribute('tabindex', isActive ? '0' : '-1');
    }

    // Update panel visibility
    const allPanelWrappers = this.contentContainer.querySelectorAll('.tab-content');
    allPanelWrappers.forEach(wrapper => {
      const panelId = wrapper.dataset.panelId;
      const isActive = panelId === newPanelId;
      wrapper.classList.toggle('active', isActive);
    });
  }

  /**
   * Setup keyboard navigation for tabs
   * @private
   */
  _setupKeyboardNavigation() {
    const keyHandler = (e) => {
      if (this._destroyed) return;

      const activeButton = this.tabButtons.get(this.activePanel);
      if (!activeButton || document.activeElement !== activeButton) {
        return;
      }

      const panelIds = Array.from(this.panels.keys()).filter(
        id => !this.panels.get(id).disabled
      );
      const currentIndex = panelIds.indexOf(this.activePanel);

      let handled = false;
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          // Previous tab
          newIndex = currentIndex - 1;
          if (newIndex < 0) newIndex = panelIds.length - 1;
          handled = true;
          break;

        case 'ArrowRight':
        case 'ArrowDown':
          // Next tab
          newIndex = (currentIndex + 1) % panelIds.length;
          handled = true;
          break;

        case 'Home':
          // First tab
          newIndex = 0;
          handled = true;
          break;

        case 'End':
          // Last tab
          newIndex = panelIds.length - 1;
          handled = true;
          break;

        case 'Enter':
        case ' ':
          // Activate current tab (already active, but good for accessibility)
          this.switchToPanel(this.activePanel, true);
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        if (newIndex !== currentIndex) {
          const newPanelId = panelIds[newIndex];
          this.switchToPanel(newPanelId);
          this.tabButtons.get(newPanelId)?.focus();
        }
      }
    };

    this.tabBar.addEventListener('keydown', keyHandler);
    this.eventListeners.push({ element: this.tabBar, type: 'keydown', handler: keyHandler });
  }

  /**
   * Emit a custom event
   * @private
   */
  _emitEvent(eventName, data) {
    if (!this.container) return;

    const event = new CustomEvent(eventName, {
      detail: data,
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }

  /**
   * Destroy the tab manager and clean up resources
   */
  destroy() {
    if (this._destroyed) return;

    // Remove all event listeners
    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    // Clear maps
    this.panels.clear();
    this.tabButtons.clear();

    // Remove DOM
    if (this.container && this.container.parentElement) {
      this.container.remove();
    }

    // Clear references
    this.container = null;
    this.tabBar = null;
    this.contentContainer = null;
    this.activePanel = null;

    this._destroyed = true;
  }

  /**
   * Check if manager is destroyed
   * @returns {boolean} True if destroyed
   */
  isDestroyed() {
    return this._destroyed;
  }

  /**
   * Get the currently active panel ID
   * @returns {string|null} Active panel ID or null
   */
  getActivePanel() {
    return this.activePanel;
  }

  /**
   * Get all panel IDs
   * @returns {Array<string>} Array of panel IDs
   */
  getAllPanelIds() {
    return Array.from(this.panels.keys());
  }

  /**
   * Check if a panel exists
   * @param {string} panelId - Panel ID to check
   * @returns {boolean} True if panel exists
   */
  hasPanel(panelId) {
    return this.panels.has(panelId);
  }

  /**
   * Enable or disable a panel
   * @param {string} panelId - Panel ID
   * @param {boolean} disabled - Whether panel should be disabled
   */
  setPanelDisabled(panelId, disabled) {
    const panel = this.panels.get(panelId);
    if (!panel) {
      console.warn(`TabManager.setPanelDisabled: Panel '${panelId}' not found`);
      return;
    }

    panel.disabled = disabled;

    const button = this.tabButtons.get(panelId);
    if (button) {
      button.disabled = disabled;
    }

    // If disabling the active panel, switch to another
    if (disabled && this.activePanel === panelId) {
      const nextPanelId = this.getAllPanelIds().find(id => !this.panels.get(id).disabled);
      if (nextPanelId) {
        this.switchToPanel(nextPanelId);
      }
    }
  }
}
