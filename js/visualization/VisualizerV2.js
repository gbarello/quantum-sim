/**
 * VisualizerV2.js
 *
 * Modern panel-based visualizer coordinator for quantum wavefunction rendering.
 * This is a complete rewrite of the original Visualizer class using a clean
 * panel-based architecture for better separation of concerns and maintainability.
 *
 * Architecture:
 * - VisualizerV2 is a lightweight coordinator (~150 lines vs 726 in original)
 * - Delegates all rendering to specialized Panel components
 * - Uses CanvasLayout for automatic size calculations
 * - Simple, composable, and easy to extend
 *
 * Key differences from original Visualizer:
 * - No direct rendering logic (delegated to panels)
 * - No complex color conversion (handled by WavefunctionPanel)
 * - No measurement state management (handled by MeasurementCirclePanel)
 * - Proper separation: layout → panels → rendering
 */

import { CanvasLayout } from './core/CanvasLayout.js';
import { WavefunctionPanel } from './panels/WavefunctionPanel.js';
import { PotentialPlotPanel } from './panels/PotentialPlotPanel.js';
import { GridOverlayPanel } from './panels/GridOverlayPanel.js';
import { PhaseWheelPanel } from './panels/PhaseWheelPanel.js';
import { MeasurementFeedbackPanel } from './panels/MeasurementFeedbackPanel.js';
import { MeasurementCirclePanel } from './panels/MeasurementCirclePanel.js';

/**
 * VisualizerV2 - Modern panel-based quantum wavefunction visualizer
 *
 * This class coordinates multiple rendering panels to display the quantum state.
 * It is responsible for:
 * - Canvas initialization and sizing
 * - Panel lifecycle management (creation, updates, disposal)
 * - Configuration management
 * - Render coordination (calling panels in correct Z-order)
 */
export class VisualizerV2 {
  /**
   * Create a new VisualizerV2
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {QuantumSimulation} simulation - The quantum simulation instance
   * @param {Object} config - Configuration options
   */
  constructor(canvas, simulation, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.simulation = simulation;

    // Configuration (with defaults matching original Visualizer)
    this.config = {
      visualizationMode: config.visualizationMode || 'full', // 'full', 'probability', 'phase'
      saturationScale: config.saturationScale || 5.0,
      showGrid: config.showGrid || false,
      showPhaseWheel: config.showPhaseWheel || false,
      showPotentialPlot: config.showPotentialPlot !== false, // Show by default
      gridLineColor: config.gridLineColor || 'rgba(255, 255, 255, 0.2)',
      gridLineWidth: config.gridLineWidth || 1
    };

    // Panel storage
    this.panels = {};
    this.layout = null;

    // Initialize canvas and create panels
    this.resize();
  }

  /**
   * Create all panels based on current configuration
   * Panels are created in render order (back to front)
   */
  createPanels() {
    // Clean up old panels
    this.disposePanels();

    // Calculate layout based on current configuration
    const potentialType = this.simulation.potentialType || 'none';
    const showPlot = this.config.showPotentialPlot && potentialType !== 'none';

    this.layout = new CanvasLayout(
      this.width,
      this.height,
      {
        showPlot: showPlot,
        showPhaseWheel: this.config.showPhaseWheel
      }
    );

    const bounds = this.layout.calculateLayout();

    // Create panels in render order (back to front)
    this.panels = {};

    // 1. Background: Main wavefunction visualization
    this.panels.wavefunction = new WavefunctionPanel(
      bounds.wavefunction,
      {
        visualizationMode: this.config.visualizationMode,
        saturationScale: this.config.saturationScale
      }
    );

    // 2. Side panel: Potential plot (if enabled and potential exists)
    if (bounds.potentialPlot) {
      this.panels.potentialPlot = new PotentialPlotPanel(bounds.potentialPlot);
    }

    // 3. Overlay 1: Grid overlay (if enabled)
    if (this.config.showGrid) {
      this.panels.gridOverlay = new GridOverlayPanel(
        bounds.wavefunction,
        this.simulation.gridSize,
        {
          lineColor: this.config.gridLineColor,
          lineWidth: this.config.gridLineWidth
        }
      );
    }

    // 4. Overlay 2: Phase wheel reference (if enabled)
    if (bounds.phaseWheel) {
      this.panels.phaseWheel = new PhaseWheelPanel(bounds.phaseWheel);
    }

    // 5. Overlay 3: Measurement feedback (flash animation)
    this.panels.measurementFeedback = new MeasurementFeedbackPanel(
      bounds.wavefunction,
      this.simulation.gridSize
    );

    // 6. Foreground: Measurement circle (hover preview)
    this.panels.measurementCircle = new MeasurementCirclePanel(
      bounds.wavefunction,
      this.simulation.gridSize
    );
  }

  /**
   * Dispose of all panels to free resources
   */
  disposePanels() {
    for (const panel of Object.values(this.panels)) {
      if (panel && panel.dispose) {
        panel.dispose();
      }
    }
    this.panels = {};
  }

  /**
   * Render the current quantum state to the canvas
   * Coordinates rendering across all panels in correct Z-order
   */
  render() {
    const time = performance.now();

    // Check if potential type changed - if so, recreate panels to add/remove plot
    const currentPotentialType = this.simulation.potentialType || 'none';
    if (!this._lastPotentialType || this._lastPotentialType !== currentPotentialType) {
      this._lastPotentialType = currentPotentialType;
      this.createPanels();
    }

    // Clear canvas (black background)
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render panels in order (back to front)
    // Each panel is responsible for its own rendering logic
    const renderOrder = [
      'wavefunction',      // Background: main visualization
      'potentialPlot',     // Side panel: potential profile
      'gridOverlay',       // Overlay: grid lines
      'phaseWheel',        // Overlay: phase reference wheel
      'measurementFeedback', // Overlay: measurement flash
      'measurementCircle'  // Foreground: hover circle
    ];

    for (const panelName of renderOrder) {
      const panel = this.panels[panelName];
      if (panel) {
        panel.render(this.ctx, this.simulation, time);
      }
    }
  }

  /**
   * Resize canvas to match its display size
   * Recreates all panels with new dimensions
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Update canvas dimensions
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Reset transform and scale for device pixel ratio
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Store logical dimensions
    this.width = rect.width;
    this.height = rect.height;

    // Debug logging
    console.log('VisualizerV2.resize() called');
    console.log('  Canvas rect:', rect);
    console.log('  Device pixel ratio:', dpr);
    console.log('  Physical dimensions:', this.canvas.width, 'x', this.canvas.height);
    console.log('  Logical dimensions:', this.width, 'x', this.height);

    // Recreate panels with new layout
    this.createPanels();
  }

  /**
   * Set visualization mode (affects wavefunction panel)
   * @param {string} mode - 'full', 'probability', or 'phase'
   */
  setVisualizationMode(mode) {
    if (['full', 'probability', 'phase'].includes(mode)) {
      this.config.visualizationMode = mode;
      if (this.panels.wavefunction) {
        this.panels.wavefunction.config.visualizationMode = mode;
      }
    }
  }

  /**
   * Set saturation scale for color mapping
   * @param {number} scale - Saturation multiplier (default 5.0)
   */
  setSaturationScale(scale) {
    this.config.saturationScale = Math.max(0, scale);
    if (this.panels.wavefunction) {
      this.panels.wavefunction.config.saturationScale = scale;
    }
  }

  /**
   * Toggle grid overlay visibility
   * @param {boolean} visible - Whether to show grid
   */
  setGridVisible(visible) {
    this.config.showGrid = visible;
    this.createPanels(); // Recreate to add/remove grid panel
  }

  /**
   * Toggle phase wheel visibility
   * @param {boolean} visible - Whether to show phase wheel
   */
  setPhaseWheelVisible(visible) {
    this.config.showPhaseWheel = visible;
    this.createPanels(); // Recreate to add/remove phase wheel
  }

  /**
   * Toggle potential plot visibility
   * @param {boolean} visible - Whether to show potential plot
   */
  setPotentialVisible(visible) {
    this.config.showPotentialPlot = visible;
    this.createPanels(); // Recreate to add/remove plot
  }

  /**
   * Show measurement feedback animation
   * @param {number} gridX - Grid x coordinate
   * @param {number} gridY - Grid y coordinate
   * @param {string} type - 'positive' or 'negative'
   * @param {number} duration - Animation duration in ms (default 500)
   */
  showMeasurementFeedback(gridX, gridY, type, duration = 500) {
    if (this.panels.measurementFeedback) {
      this.panels.measurementFeedback.showFeedback(gridX, gridY, type, duration);
    }
  }

  /**
   * Set hover state for measurement circle preview
   * @param {boolean} active - Whether mouse is hovering
   * @param {number} gridX - Grid x coordinate
   * @param {number} gridY - Grid y coordinate
   */
  setHoverState(active, gridX = 0, gridY = 0) {
    if (this.panels.measurementCircle) {
      this.panels.measurementCircle.setHoverState(active, gridX, gridY);
    }
  }

  /**
   * Set measurement radius for hover circle
   * @param {number} radius - Radius in grid units
   */
  setMeasurementRadius(radius) {
    if (this.panels.measurementCircle) {
      this.panels.measurementCircle.setRadius(radius);
    }
  }

  /**
   * Convert canvas coordinates to grid coordinates
   * @param {number} canvasX - X coordinate on canvas
   * @param {number} canvasY - Y coordinate on canvas
   * @returns {Object} {x, y} grid coordinates or null if outside grid
   */
  canvasToGrid(canvasX, canvasY) {
    if (!this.layout) return null;

    const bounds = this.layout.calculateLayout().wavefunction;
    const gridSize = this.simulation.gridSize;

    // Check if point is within wavefunction bounds
    if (canvasX < bounds.x || canvasX >= bounds.x + bounds.width ||
        canvasY < bounds.y || canvasY >= bounds.y + bounds.height) {
      return null;
    }

    // Convert to grid coordinates
    const cellSize = bounds.width / gridSize;
    const relX = canvasX - bounds.x;
    const relY = canvasY - bounds.y;

    return {
      x: Math.floor(relX / cellSize),
      y: Math.floor(relY / cellSize)
    };
  }

  /**
   * Get probability at canvas coordinates
   * @param {number} canvasX - X coordinate on canvas
   * @param {number} canvasY - Y coordinate on canvas
   * @returns {number} Probability |ψ|² at that location
   */
  getProbabilityAt(canvasX, canvasY) {
    const gridCoords = this.canvasToGrid(canvasX, canvasY);
    if (!gridCoords) return 0;

    const { x, y } = gridCoords;
    if (x < 0 || x >= this.simulation.gridSize ||
        y < 0 || y >= this.simulation.gridSize) {
      return 0;
    }

    return this.simulation.getProbabilityAt(x, y);
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.disposePanels();
  }
}

export default VisualizerV2;
