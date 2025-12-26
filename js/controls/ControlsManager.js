/**
 * ControlsManager.js - Top-level coordinator for the quantum playground controls system
 *
 * This is the central manager that replaces the monolithic Controller class with a
 * clean, modular architecture. It coordinates between the simulation, visualizer,
 * and all control elements through the ControlPanel and TabManager systems.
 *
 * Key Responsibilities:
 * - Initialize control system from declarative config (defaultConfig.js)
 * - Bridge between controls and simulation/visualizer
 * - Manage global application state (playing, time, measurements, etc.)
 * - Handle canvas interactions (click for measurement, hover for preview)
 * - Coordinate display updates each frame
 * - Provide clean API for state management
 *
 * Architecture:
 * - Uses TabManager to organize control panels into tabs
 * - Uses ControlPanel to group related controls
 * - Controls are created from config via ControlRegistry
 * - All state changes flow through this manager
 * - Minimal DOM manipulation (delegated to controls)
 *
 * Integration:
 * - Called by main.js during app initialization
 * - update() called each animation frame
 * - handleCanvasClick() called on canvas click events
 * - handleCanvasHover() called on canvas mousemove events
 */

import { TabManager } from './TabManager.js';
import { ControlPanel } from './ControlPanel.js';
import { defaultControlsConfig } from './defaultConfig.js';
import { ControlRegistry } from './ControlRegistry.js';
import { QuantumSimulation } from '../quantum.js';

// Import control types to register them
import { SliderControl } from './types/SliderControl.js';
import { ButtonControl } from './types/ButtonControl.js';
import { RadioControl } from './types/RadioControl.js';
import { SelectControl } from './types/SelectControl.js';
import { CanvasControl } from './types/CanvasControl.js';
import { DisplayControl } from './types/DisplayControl.js';
import TextInputControl from './types/TextInputControl.js';
import { CheckboxControl } from './types/CheckboxControl.js';

export class ControlsManager {
  /**
   * Create a new ControlsManager
   * @param {QuantumSimulation} simulation - The quantum simulation instance
   * @param {Visualizer} visualizer - The visualization instance
   * @param {Object} config - Configuration object (defaults to defaultControlsConfig)
   * @param {Object} app - Optional reference to the main app (for updating simulation reference on reset)
   */
  constructor(simulation, visualizer, config = null, app = null) {
    // Validate required dependencies
    if (!simulation) {
      throw new Error('ControlsManager: simulation is required');
    }
    if (!visualizer) {
      throw new Error('ControlsManager: visualizer is required');
    }

    // Store references
    this.simulation = simulation;
    this.visualizer = visualizer;
    this.config = config || defaultControlsConfig;
    this.app = app; // Store app reference for updating simulation on recreation

    // State management
    // Note: Initial condition defaults will be loaded from control config after initialization
    this.state = {
      isPlaying: false,
      elapsedTime: 0,
      measurementInProgress: false,
      measurementCount: 0,

      // Initial conditions (normalized 0-1 for UI, converted to grid coords for sim)
      // These will be overwritten by control defaults during initialization
      initialPosition: { x: 0.5, y: 0.5 },
      initialMomentum: { x: 0.5, y: 0.5 },
      packetSize: 2.56,

      // Grid configuration
      gridSize: 128,
      domainSize: 10.0
    };

    // TabManager and panels
    this.tabManager = null;
    this.panels = new Map(); // Map of panel ID -> ControlPanel instance
    this.persistentControls = new Map(); // Map of control ID -> control instance

    // Canvas selector states (for initial condition selectors)
    this.selectorCanvases = new Map(); // Map of canvas ID -> canvas element

    // Track if manager is destroyed
    this._destroyed = false;

    // Register control types with the registry
    this._registerControlTypes();
  }

  /**
   * Register all control types with the ControlRegistry
   * This makes them available for creation from config
   * @private
   */
  _registerControlTypes() {
    ControlRegistry.register('slider', SliderControl);
    ControlRegistry.register('button', ButtonControl);
    ControlRegistry.register('radio', RadioControl);
    ControlRegistry.register('select', SelectControl);
    ControlRegistry.register('canvas', CanvasControl);
    ControlRegistry.register('display', DisplayControl);
    ControlRegistry.register('textinput', TextInputControl);
    ControlRegistry.register('checkbox', CheckboxControl);
  }

  /**
   * Initialize the control system
   * Creates all control panels and the tab manager from config
   * @param {HTMLElement} containerElement - Parent element to render controls into
   * @returns {HTMLElement} The rendered controls container
   */
  initialize(containerElement) {
    if (this._destroyed) {
      throw new Error('ControlsManager: Cannot initialize destroyed manager');
    }

    if (!containerElement) {
      throw new Error('ControlsManager: containerElement is required for initialize()');
    }

    // Create main wrapper for all controls
    const wrapper = document.createElement('div');
    wrapper.className = 'controls-wrapper';

    // Create and render persistent controls first (if any)
    if (this.config.persistentControls && this.config.persistentControls.length > 0) {
      const persistentContainer = this._createPersistentControls(this.config.persistentControls);
      wrapper.appendChild(persistentContainer);
    }

    // Create control panels from config
    this.createFromConfig(this.config);

    // Set manager reference on all DisplayControls (they need it for getValue)
    this._setManagerOnDisplayControls();

    // Create TabManager with panels
    const panelArray = Array.from(this.panels.values()).map(panel => ({
      id: panel.id,
      title: panel.title,
      icon: panel.icon,
      element: panel.container
    }));

    this.tabManager = new TabManager({
      panels: panelArray,
      defaultPanel: this.config.defaultTab || 'simulation',
      tabPosition: 'top',
      animated: true,
      persistent: true,
      storageKey: 'quantumPlayground.activeTab'
    });

    // Create a container for the tab manager
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab-manager-container';

    // Render the tab manager
    this.tabManager.render(tabContainer);
    wrapper.appendChild(tabContainer);

    // Append wrapper to container
    containerElement.appendChild(wrapper);

    // Setup initial conditions for selector canvases
    this._initializeSelectorCanvases();

    // Load initial state from control default values
    // This ensures state matches the control panel defaults
    this._loadInitialStateFromControls();

    return wrapper;
  }

  /**
   * Create persistent controls that are always visible
   * @param {Array} controlConfigs - Array of control configurations
   * @returns {HTMLElement} Container with persistent controls
   * @private
   */
  _createPersistentControls(controlConfigs) {
    const container = document.createElement('div');
    container.className = 'persistent-controls';

    // Process and create each control
    const processedConfigs = this._processControlConfigs(controlConfigs);

    processedConfigs.forEach(config => {
      try {
        const control = ControlRegistry.create(config);
        if (control) {
          // Store reference
          this.persistentControls.set(config.id, control);

          // Render control
          const controlElement = control.render();
          if (controlElement) {
            container.appendChild(controlElement);
          }
        }
      } catch (error) {
        console.error(`Failed to create persistent control '${config.id}':`, error);
      }
    });

    return container;
  }

  /**
   * Load initial state from control default values
   * This ensures that state values match the control panel defaults from config
   * @private
   */
  _loadInitialStateFromControls() {
    // Load position from position-selector control
    const positionControl = this.getControl('position-selector');
    if (positionControl && positionControl.getValue) {
      const pos = positionControl.getValue();
      if (pos && pos.x !== null && pos.y !== null) {
        this.state.initialPosition = { x: pos.x, y: pos.y };
      }
    }

    // Load momentum from momentum-selector control
    const momentumControl = this.getControl('momentum-selector');
    if (momentumControl && momentumControl.getValue) {
      const mom = momentumControl.getValue();
      if (mom && mom.x !== null && mom.y !== null) {
        this.state.initialMomentum = { x: mom.x, y: mom.y };
      }
    }

    // Load packet size from packet-size control
    const packetSizeControl = this.getControl('packet-size');
    if (packetSizeControl && packetSizeControl.getValue) {
      this.state.packetSize = packetSizeControl.getValue();
    }

    // Load grid points from grid-points control
    const gridPointsControl = this.getControl('grid-points');
    if (gridPointsControl && gridPointsControl.getValue) {
      this.state.gridSize = parseInt(gridPointsControl.getValue());
    }

    // Load domain size from domain-size control
    const domainSizeControl = this.getControl('domain-size');
    if (domainSizeControl && domainSizeControl.getValue) {
      this.state.domainSize = parseFloat(domainSizeControl.getValue());
    }

    // Initialize text input fields to match canvas selectors
    this.updatePositionDisplay();
    this.updateMomentumDisplay();

    // Validate stability with initial values
    this.validateStability();

    const dx = this.state.domainSize / this.state.gridSize;
    console.log('Loaded initial state from controls:', {
      position: this.state.initialPosition,
      momentum: this.state.initialMomentum,
      packetSize: this.state.packetSize,
      gridSize: this.state.gridSize,
      domainSize: this.state.domainSize,
      dx: dx.toFixed(6)
    });
  }

  /**
   * Create control panels from configuration
   * @param {Object} config - Configuration object with tabs array
   */
  createFromConfig(config) {
    if (!config.tabs || !Array.isArray(config.tabs)) {
      throw new Error('ControlsManager: config.tabs array is required');
    }

    // Create a ControlPanel for each tab in config
    config.tabs.forEach(tabConfig => {
      try {
        // Process control configs and inject manager reference where needed
        const processedControls = this._processControlConfigs(tabConfig.controls);

        // Create the panel
        const panel = new ControlPanel({
          id: tabConfig.id,
          title: tabConfig.title,
          icon: tabConfig.icon,
          collapsible: false, // Tabs handle visibility, no need for collapsing
          controls: processedControls
        });

        // Store panel
        this.panels.set(tabConfig.id, panel);

        // Render panel (will be added to TabManager later)
        const tempContainer = document.createElement('div');
        panel.render(tempContainer);

      } catch (error) {
        console.error(`ControlsManager: Failed to create panel '${tabConfig.id}':`, error);
      }
    });
  }

  /**
   * Process control configs to inject manager references and bind handlers
   * @param {Array} controlConfigs - Array of control configuration objects
   * @returns {Array} Processed control configurations
   * @private
   */
  _processControlConfigs(controlConfigs) {
    return controlConfigs.map(controlConfig => {
      // Create a copy to avoid mutating the original config
      const processed = { ...controlConfig };

      // Note: We do NOT wrap getValue for DisplayControls here.
      // DisplayControls receive the manager via setManager() and call getValue with it directly.
      // The getValue function in the config already expects (manager) as its parameter.

      // Bind onChange handlers with manager reference
      if (processed.onChange && typeof processed.onChange === 'function') {
        const originalOnChange = processed.onChange;
        processed.onChange = (value, control) => originalOnChange(value, this, control);
      }

      // Bind onClick handlers with manager reference
      if (processed.onClick && typeof processed.onClick === 'function') {
        const originalOnClick = processed.onClick;
        processed.onClick = (control) => originalOnClick(this, control);
      }

      // Bind onSelect handlers with manager reference (for CanvasControl)
      if (processed.onSelect && typeof processed.onSelect === 'function') {
        const originalOnSelect = processed.onSelect;
        processed.onSelect = (x, y, control) => originalOnSelect(x, y, this, control);
      }

      // Handle drawFunction for CanvasControl
      // If drawFunction is a string, convert it to a function reference from manager
      if (processed.type === 'canvas' && processed.drawFunction) {
        if (typeof processed.drawFunction === 'string') {
          const methodName = processed.drawFunction;
          if (typeof this[methodName] === 'function') {
            // Bind the manager's method to the canvas control
            processed.drawFunction = this[methodName].bind(this);
          } else {
            console.error(`ControlsManager: Method '${methodName}' not found on manager for control '${processed.id}'`);
            // Fall back to undefined so CanvasControl uses its default
            processed.drawFunction = undefined;
          }
        }
      }

      return processed;
    });
  }

  /**
   * Set manager reference on all DisplayControl instances
   * DisplayControls need the manager reference to call their getValue functions
   * @private
   */
  _setManagerOnDisplayControls() {
    this.panels.forEach(panel => {
      // Get all controls from the panel
      if (panel.controls && panel.controls.size > 0) {
        panel.controls.forEach(control => {
          // Check if this is a DisplayControl (has setManager method)
          if (control && typeof control.setManager === 'function') {
            control.setManager(this);
          }
        });
      }
    });
  }

  /**
   * Initialize selector canvases for initial conditions
   * @private
   */
  _initializeSelectorCanvases() {
    // Find position and momentum selector canvases
    const positionPanel = this.panels.get('initial-conditions');
    if (!positionPanel) return;

    const positionCanvas = positionPanel.getControl('position-selector');
    const momentumCanvas = positionPanel.getControl('momentum-selector');

    if (positionCanvas) {
      this.selectorCanvases.set('position-selector', positionCanvas);
      this.drawPositionSelector();
    }

    if (momentumCanvas) {
      this.selectorCanvases.set('momentum-selector', momentumCanvas);
      this.drawMomentumSelector();
    }
  }

  /**
   * Draw the position selector canvas
   * Shows a grid with a crosshair at the selected position
   * Center (0.5, 0.5) represents physical coordinate (0, 0)
   */
  drawPositionSelector() {
    const control = this.selectorCanvases.get('position-selector');
    if (!control || !control.canvas) return;

    const canvas = control.canvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 10;
    for (let i = 0; i <= gridSize; i++) {
      const x = (i / gridSize) * width;
      const y = (i / gridSize) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Highlight center lines (representing x=0 and y=0 in physical coordinates)
    const cx = width / 2;
    const cy = height / 2;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;

    // Center vertical line (x=0)
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.stroke();

    // Center horizontal line (y=0)
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();

    // Draw center point
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw crosshair at selected position
    const x = this.state.initialPosition.x * width;
    const y = this.state.initialPosition.y * height;

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();

    // Draw circle around selection
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * Draw the momentum selector canvas
   * Shows a grid with an arrow indicating momentum direction
   */
  drawMomentumSelector() {
    const control = this.selectorCanvases.get('momentum-selector');
    if (!control || !control.canvas) return;

    const canvas = control.canvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const gridSize = 10;
    for (let i = 0; i <= gridSize; i++) {
      const x = (i / gridSize) * width;
      const y = (i / gridSize) * height;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw center point
    const cx = width / 2;
    const cy = height / 2;
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw momentum vector as arrow
    // Map normalized momentum (0-1) to arrow coordinates (-0.5 to 0.5 of canvas size)
    const mx = (this.state.initialMomentum.x - 0.5) * width * 0.8;
    const my = (this.state.initialMomentum.y - 0.5) * height * 0.8;
    const endX = cx + mx;
    const endY = cy + my;

    if (Math.abs(mx) > 1 || Math.abs(my) > 1) {
      // Draw arrow
      ctx.strokeStyle = '#ff6600';
      ctx.fillStyle = '#ff6600';
      ctx.lineWidth = 2;

      // Arrow line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(my, mx);
      const headLength = 10;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle - Math.PI / 6),
        endY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(angle + Math.PI / 6),
        endY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Update position display (called after position changes)
   */
  updatePositionDisplay() {
    // Update text input fields to match canvas selector
    // Transform from internal 0-1 to display (physical coordinates)
    // Formula: display = (internal - 0.5) * domainSize
    const posXControl = this.getControl('position-x');
    const posYControl = this.getControl('position-y');
    const domainSize = this.state.domainSize;

    if (posXControl && this.state.initialPosition.x !== null) {
      const displayValue = (this.state.initialPosition.x - 0.5) * domainSize;
      posXControl.setValue(displayValue);
    }
    if (posYControl && this.state.initialPosition.y !== null) {
      const displayValue = (this.state.initialPosition.y - 0.5) * domainSize;
      posYControl.setValue(displayValue);
    }
  }

  /**
   * Update momentum display (called after momentum changes)
   */
  updateMomentumDisplay() {
    // Update text input fields to match canvas selector
    // Transform from internal 0-1 to display -1 to 1
    // Formula: display = (internal - 0.5) * 2
    const momXControl = this.getControl('momentum-x');
    const momYControl = this.getControl('momentum-y');

    if (momXControl && this.state.initialMomentum.x !== null) {
      const displayValue = (this.state.initialMomentum.x - 0.5) * 2;
      momXControl.setValue(displayValue);
    }
    if (momYControl && this.state.initialMomentum.y !== null) {
      const displayValue = (this.state.initialMomentum.y - 0.5) * 2;
      momYControl.setValue(displayValue);
    }
  }

  /**
   * Update packet size display (called after packet size changes)
   */
  updatePacketSizeDisplay() {
    // Packet size is shown in the slider label, handled by SliderControl
  }

  /**
   * Validate stability based on grid points and domain size
   * Calculates dx = domainSize / gridPoints
   * Stability condition: dt * timeScale < 2*m*dx²/ℏ
   * Shows warning (not error) on both controls if unstable
   */
  validateStability() {
    const gridPointsControl = this.getControl('grid-points');
    const domainSizeControl = this.getControl('domain-size');

    if (!gridPointsControl || !domainSizeControl || !this.simulation) return;

    const gridPoints = this.state.gridSize;
    const domainSize = this.state.domainSize;
    const dx = domainSize / gridPoints;

    const dt = this.simulation.dt;
    const timeScale = this.simulation.timeScale;
    const hbar = this.simulation.hbar;
    const mass = this.simulation.mass;

    // Calculate minimum safe dx
    const minDx = Math.sqrt((dt * timeScale * hbar) / (2 * mass));
    const stabilityLimit = (2 * mass * dx * dx) / hbar;

    // Check stability condition
    if (dt * timeScale >= stabilityLimit) {
      // Unstable - show warning on both controls
      const warningMessage = `⚠️ Unstable (dx too small)`;

      // Show warning on both controls
      if (gridPointsControl._setWarning) {
        gridPointsControl._setWarning(warningMessage);
      }
      if (domainSizeControl._setWarning) {
        domainSizeControl._setWarning(warningMessage);
      }
    } else {
      // Stable - clear warnings
      if (gridPointsControl._setValid) {
        gridPointsControl._setValid();
      }
      if (domainSizeControl._setValid) {
        domainSizeControl._setValid();
      }
    }
  }

  /**
   * Get current state
   * @returns {Object} Copy of current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state with new values
   * @param {Object} updates - Object with state properties to update
   */
  setState(updates) {
    if (!updates || typeof updates !== 'object') return;

    Object.assign(this.state, updates);
  }

  /**
   * Toggle play/pause state
   * @returns {boolean} New playing state (true = playing, false = paused)
   */
  togglePlayPause() {
    this.state.isPlaying = !this.state.isPlaying;
    console.log(`Play/Pause toggled: isPlaying = ${this.state.isPlaying}`);
    return this.state.isPlaying;
  }

  /**
   * Convert current state to simulation parameters
   * This ensures consistent conversion between initial load and reset
   * @returns {Object} Simulation parameters { centerX, centerY, width, momentumX, momentumY }
   */
  getSimulationParametersFromState() {
    if (!this.simulation) {
      throw new Error('ControlsManager: simulation not available');
    }

    // Get grid parameters from state (not simulation, as state may have newer values)
    const gridSize = this.state.gridSize;
    const domainSize = this.state.domainSize;
    const dx = domainSize / gridSize;

    // Convert normalized position (0-1) to physical coordinates
    const centerX = this.state.initialPosition.x * domainSize;
    const centerY = this.state.initialPosition.y * domainSize;

    // Convert normalized momentum (0-1) to physical momentum
    // Map 0-1 to -5 to +5 for momentum range
    // 0.5 = zero momentum, 0.6 = +1.0, 0.4 = -1.0
    const momentumX = (this.state.initialMomentum.x - 0.5) * 10;
    const momentumY = (this.state.initialMomentum.y - 0.5) * 10;

    // Convert packet size to physical width
    // packetSize is in absolute physical units, independent of domain size
    // This ensures the wavepacket maintains its physical size as domain changes
    const width = this.state.packetSize;

    return {
      centerX,
      centerY,
      width,
      momentumX,
      momentumY
    };
  }

  /**
   * Reset the simulation to initial conditions
   * Uses current state values for position, momentum, packet size, grid size, and domain size
   * Calculates dx = domainSize / gridSize
   * If grid size or dx has changed, recreates the simulation
   */
  handleReset() {
    if (!this.simulation) return;

    const newGridSize = this.state.gridSize;
    const newDomainSize = this.state.domainSize;
    const newDx = newDomainSize / newGridSize;

    // Check if we need to recreate the simulation due to grid size or dx change
    const needsRecreation = (
      newGridSize !== this.simulation.gridSize ||
      Math.abs(newDx - this.simulation.dx) > 1e-10
    );

    if (needsRecreation) {
      console.log(`Recreating simulation: gridSize ${this.simulation.gridSize} → ${newGridSize}, dx ${this.simulation.dx.toFixed(6)} → ${newDx.toFixed(6)}`);

      // Store old simulation parameters we want to preserve
      const dt = this.simulation.dt;
      const hbar = this.simulation.hbar;
      const mass = this.simulation.mass;
      const boundaryCondition = this.simulation.boundaryCondition;
      const timeScale = this.simulation.timeScale;
      const potentialType = this.simulation.potentialType;
      const potentialStrengthScale = this.simulation.potentialStrengthScale;
      const measurementRadius = this.simulation.measurementRadius;

      // Create new simulation with new grid size and dx
      this.simulation = new QuantumSimulation(
        newGridSize,
        newDx,
        dt,
        hbar,
        mass,
        boundaryCondition,
        timeScale
      );

      // Restore other simulation settings
      this.simulation.setPotentialType(potentialType);
      this.simulation.setPotentialStrengthScale(potentialStrengthScale);
      this.simulation.setMeasurementRadius(measurementRadius);

      // Update visualizer to use new simulation
      if (this.visualizer) {
        this.visualizer.simulation = this.simulation;
        this.visualizer.resize(); // Resize in case aspect ratio changed
      }

      // Update main app reference if available
      if (this.app) {
        this.app.simulation = this.simulation;
        console.log('Updated app.simulation reference');
      } else {
        console.warn('No app reference available to update!');
      }

      // Now initialize with the new parameters
      this._initializeSimulationWithCurrentState();

      // Validate stability again with the new simulation
      this.validateStability();

      console.log(`New domain size: ${this.simulation.domainSize.toFixed(4)} (= ${newGridSize} × ${newDx.toFixed(6)})`);
    } else {
      // Grid size and dx unchanged, just reinitialize the wavefunction
      this._initializeSimulationWithCurrentState();
    }
  }

  /**
   * Initialize simulation wavefunction with current state values
   * Helper method used by handleReset()
   * @private
   */
  _initializeSimulationWithCurrentState() {
    // Get simulation parameters from current state (uses consistent conversion)
    const params = this.getSimulationParametersFromState();

    // Initialize simulation with these parameters
    this.simulation.initialize({
      centerX: params.centerX,
      centerY: params.centerY,
      width: params.width,
      momentumX: params.momentumX,
      momentumY: params.momentumY
    });

    // Reset time
    this.simulation.time = 0;
    this.state.elapsedTime = 0;

    // Reset measurement count
    this.state.measurementCount = 0;

    console.log(`Reset simulation: pos=(${params.centerX.toFixed(2)},${params.centerY.toFixed(2)}), momentum=(${params.momentumX.toFixed(2)},${params.momentumY.toFixed(2)}), width=${params.width.toFixed(2)}`);
  }

  /**
   * Handle position text input changes
   * @param {string} axis - 'x' or 'y'
   * @param {number} value - New display value in physical coordinates (-domainSize/2 to +domainSize/2)
   */
  handlePositionTextChange(axis, value) {
    // Transform from display (physical coordinates) to internal (0-1)
    // Formula: internal = display / domainSize + 0.5
    const domainSize = this.state.domainSize;
    const internalValue = value / domainSize + 0.5;

    // Update state with internal value
    if (axis === 'x') {
      this.state.initialPosition.x = internalValue;
    } else if (axis === 'y') {
      this.state.initialPosition.y = internalValue;
    }

    // Update canvas selector to match
    const positionControl = this.getControl('position-selector');
    if (positionControl) {
      positionControl.setValue({
        x: this.state.initialPosition.x,
        y: this.state.initialPosition.y
      });
    }
  }

  /**
   * Handle momentum text input changes
   * @param {string} axis - 'x' or 'y'
   * @param {number} value - New display value (-1 to 1)
   */
  handleMomentumTextChange(axis, value) {
    // Transform from display -1 to 1 to internal 0 to 1
    // Formula: internal = display / 2 + 0.5
    const internalValue = value / 2 + 0.5;

    // Update state with internal value
    if (axis === 'x') {
      this.state.initialMomentum.x = internalValue;
    } else if (axis === 'y') {
      this.state.initialMomentum.y = internalValue;
    }

    // Update canvas selector to match
    const momentumControl = this.getControl('momentum-selector');
    if (momentumControl) {
      momentumControl.setValue({
        x: this.state.initialMomentum.x,
        y: this.state.initialMomentum.y
      });
    }
  }

  /**
   * Handle canvas click for quantum measurement
   * @param {number} canvasX - Canvas X coordinate (pixels)
   * @param {number} canvasY - Canvas Y coordinate (pixels)
   */
  handleCanvasClick(canvasX, canvasY) {
    if (!this.simulation || !this.visualizer) return;
    if (this.state.measurementInProgress) return;

    // Convert canvas coordinates to grid coordinates
    const gridCoords = this._canvasToGridCoords(canvasX, canvasY);
    if (!gridCoords) return;

    const { x: gridX, y: gridY } = gridCoords;

    // Convert grid coordinates to physical coordinates
    const physX = gridX * this.simulation.dx;
    const physY = gridY * this.simulation.dx;

    // Set measurement in progress
    this.state.measurementInProgress = true;

    // Perform measurement (using physical coordinates)
    try {
      const result = this.simulation.measure(physX, physY);

      if (result && result.found) {
        // Increment measurement count
        this.state.measurementCount++;

        // Trigger measurement feedback in visualizer
        if (this.visualizer.showMeasurementFeedback) {
          this.visualizer.showMeasurementFeedback(gridX, gridY, result.probability);
        }

        console.log(`Measurement at grid (${gridX},${gridY}): found with probability ${(result.probability * 100).toFixed(2)}%`);
      } else {
        console.log(`Measurement at grid (${gridX},${gridY}): not found`);
      }
    } catch (error) {
      console.error('Measurement failed:', error);
    } finally {
      // Clear measurement in progress after a short delay
      setTimeout(() => {
        this.state.measurementInProgress = false;
      }, 100);
    }
  }

  /**
   * Handle canvas hover for measurement preview
   * @param {number} canvasX - Canvas X coordinate (pixels)
   * @param {number} canvasY - Canvas Y coordinate (pixels)
   */
  handleCanvasHover(canvasX, canvasY) {
    if (!this.simulation || !this.visualizer) return;

    // Convert canvas coordinates to grid coordinates
    const gridCoords = this._canvasToGridCoords(canvasX, canvasY);

    if (!gridCoords) {
      // If outside the grid, hide the hover circle
      if (this.visualizer.setHoverState) {
        this.visualizer.setHoverState(false);
      }
      return;
    }

    const { x: gridX, y: gridY } = gridCoords;

    // Update hover state in visualizer
    if (this.visualizer.setHoverState) {
      this.visualizer.setHoverState(true, gridX, gridY);
    }
  }

  /**
   * Convert canvas coordinates to grid coordinates
   * @param {number} canvasX - Canvas X coordinate (pixels)
   * @param {number} canvasY - Canvas Y coordinate (pixels)
   * @returns {Object|null} {x, y} in grid coordinates or null if invalid
   * @private
   */
  _canvasToGridCoords(canvasX, canvasY) {
    if (!this.visualizer || !this.visualizer.canvas) return null;

    const canvas = this.visualizer.canvas;
    const rect = canvas.getBoundingClientRect();

    // Get wavefunction region bounds (main visualization area)
    const bounds = this.visualizer.layout ?
      this.visualizer.layout.calculateLayout().wavefunction :
      { x: 0, y: 0, width: canvas.width, height: canvas.height };

    // Convert canvas pixel coords to relative coords within wavefunction region
    const relX = canvasX - bounds.x;
    const relY = canvasY - bounds.y;

    // Check if click is within wavefunction region
    if (relX < 0 || relX >= bounds.width || relY < 0 || relY >= bounds.height) {
      return null;
    }

    // Convert to normalized coordinates (0-1)
    const normX = relX / bounds.width;
    const normY = relY / bounds.height;

    // Convert to grid coordinates
    const gridSize = this.simulation.gridSize;
    const gridX = Math.floor(normX * gridSize);
    const gridY = Math.floor(normY * gridSize);

    // Clamp to valid grid range
    const clampedX = Math.max(0, Math.min(gridSize - 1, gridX));
    const clampedY = Math.max(0, Math.min(gridSize - 1, gridY));

    return { x: clampedX, y: clampedY };
  }

  /**
   * Update controls each frame
   * Called by main animation loop to update display controls
   * @param {number} deltaTime - Time elapsed since last update (seconds)
   */
  update(deltaTime) {
    if (this._destroyed) return;

    // Update elapsed time
    if (this.state.isPlaying && this.simulation) {
      this.state.elapsedTime = this.simulation.time;
    }

    // Update FPS display if it exists
    const fpsDisplay = this.persistentControls.get('fps-display');
    if (fpsDisplay && this.app && typeof this.app.getFPS === 'function') {
      const fps = this.app.getFPS();
      fpsDisplay.setValue(Math.round(fps));
    }

    // Update all display controls in panels (they pull their values via getValue)
    this.panels.forEach(panel => {
      panel.update();
    });
  }

  /**
   * Destroy the control system and clean up resources
   * Removes all controls, panels, and event listeners
   */
  destroy() {
    if (this._destroyed) return;

    // Destroy persistent controls
    this.persistentControls.forEach(control => {
      if (control && typeof control.destroy === 'function') {
        control.destroy();
      }
    });
    this.persistentControls.clear();

    // Destroy TabManager
    if (this.tabManager) {
      this.tabManager.destroy();
      this.tabManager = null;
    }

    // Destroy all panels
    this.panels.forEach(panel => {
      panel.destroy();
    });
    this.panels.clear();

    // Clear selector canvases
    this.selectorCanvases.clear();

    // Clear references
    this.simulation = null;
    this.visualizer = null;
    this.config = null;

    // Mark as destroyed
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
   * Get a control by ID from any panel or persistent controls
   * @param {string} controlId - ID of control to find
   * @returns {BaseControl|null} Control instance or null if not found
   */
  getControl(controlId) {
    // Check persistent controls first
    if (this.persistentControls.has(controlId)) {
      return this.persistentControls.get(controlId);
    }

    // Check panels
    for (const panel of this.panels.values()) {
      const control = panel.getControl(controlId);
      if (control) return control;
    }
    return null;
  }

  /**
   * Get a panel by ID
   * @param {string} panelId - ID of panel to retrieve
   * @returns {ControlPanel|null} Panel instance or null if not found
   */
  getPanel(panelId) {
    return this.panels.get(panelId) || null;
  }

  /**
   * Get all panels
   * @returns {Array<ControlPanel>} Array of all panel instances
   */
  getAllPanels() {
    return Array.from(this.panels.values());
  }

  /**
   * Switch to a specific tab
   * @param {string} tabId - ID of tab to activate
   */
  switchToTab(tabId) {
    if (this.tabManager) {
      this.tabManager.switchToPanel(tabId);
    }
  }

  /**
   * Get the currently active tab ID
   * @returns {string|null} Active tab ID or null
   */
  getActiveTab() {
    return this.tabManager ? this.tabManager.getActivePanel() : null;
  }

  /**
   * Apply initial control values to simulation and visualizer
   * This method reads default values from the configuration and applies them
   * to the simulation and visualizer. Should be called after controls are initialized.
   * @returns {Object} Object containing the applied initial values
   */
  applyInitialControlValues() {
    console.log('Applying initial control values from configuration...');

    const appliedValues = {};

    // Apply visualization mode
    const vizModeControl = this.getControl('viz-mode');
    if (vizModeControl && vizModeControl.getValue) {
      const vizMode = vizModeControl.getValue();
      // Map "complex" to "full" for internal visualizer use
      const internalMode = vizMode === 'complex' ? 'full' : vizMode;
      this.visualizer.setVisualizationMode(internalMode);
      appliedValues.visualizationMode = internalMode;
      console.log(`  Visualization mode: ${internalMode}`);
    }

    // Apply speed (timeScale)
    const speedControl = this.getControl('speed');
    if (speedControl && speedControl.getValue) {
      const speed = speedControl.getValue();
      this.simulation.setTimeScale(speed);
      appliedValues.timeScale = speed;
      console.log(`  Time scale: ${speed.toFixed(3)}`);
    }

    // Apply measurement radius
    const measurementRadiusControl = this.getControl('measurement-radius');
    if (measurementRadiusControl && measurementRadiusControl.getValue) {
      const radius = measurementRadiusControl.getValue();
      this.simulation.setMeasurementRadius(radius);
      appliedValues.measurementRadius = radius;
      console.log(`  Measurement radius: ${radius.toFixed(1)}`);
    }

    // Apply potential type
    const potentialTypeControl = this.getControl('potential-type');
    if (potentialTypeControl && potentialTypeControl.getValue) {
      const potentialType = potentialTypeControl.getValue();
      this.simulation.setPotentialType(potentialType);
      appliedValues.potentialType = potentialType;
      console.log(`  Potential type: ${potentialType}`);
    }

    // Apply potential strength scale
    const potentialStrengthControl = this.getControl('potential-strength');
    if (potentialStrengthControl && potentialStrengthControl.getValue) {
      const strength = potentialStrengthControl.getValue();
      this.simulation.setPotentialStrengthScale(strength);
      appliedValues.potentialStrengthScale = strength;
      console.log(`  Potential strength scale: ${strength.toFixed(1)}`);
    }

    // Apply initial position (already in state, but ensure it's set)
    const positionControl = this.getControl('position-selector');
    if (positionControl) {
      // Position is stored in state and will be used during reset
      appliedValues.initialPosition = { ...this.state.initialPosition };
      console.log(`  Initial position: (${this.state.initialPosition.x.toFixed(2)}, ${this.state.initialPosition.y.toFixed(2)})`);
    }

    // Apply initial momentum (already in state, but ensure it's set)
    const momentumControl = this.getControl('momentum-selector');
    if (momentumControl) {
      // Momentum is stored in state and will be used during reset
      appliedValues.initialMomentum = { ...this.state.initialMomentum };
      console.log(`  Initial momentum: (${this.state.initialMomentum.x.toFixed(2)}, ${this.state.initialMomentum.y.toFixed(2)})`);
    }

    // Apply packet size (already in state, but ensure it's set)
    const packetSizeControl = this.getControl('packet-size');
    if (packetSizeControl && packetSizeControl.getValue) {
      const packetSize = packetSizeControl.getValue();
      this.state.packetSize = packetSize;
      appliedValues.packetSize = packetSize;
      console.log(`  Packet size: ${packetSize.toFixed(2)}`);
    }

    console.log('Initial control values applied successfully');
    return appliedValues;
  }
}
