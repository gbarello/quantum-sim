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
import { PotentialOverlayPanel } from './panels/PotentialOverlayPanel.js';
import { GridOverlayPanel } from './panels/GridOverlayPanel.js';
import { PhaseWheelPanel } from './panels/PhaseWheelPanel.js';
import { MeasurementFeedbackPanel } from './panels/MeasurementFeedbackPanel.js';
import { MeasurementCirclePanel } from './panels/MeasurementCirclePanel.js';
import { BrushPreviewPanel } from './panels/BrushPreviewPanel.js';
import { LineSelectionPanel } from './panels/LineSelectionPanel.js';
import { Wavefunction1DPlotPanel } from './panels/Wavefunction1DPlotPanel.js';
import { LineSelectionState } from './core/LineSelectionState.js';
import { InteractionMode } from '../controls/InteractionModeManager.js';

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
      showPotentialOverlay: config.showPotentialOverlay === true, // Off by default
      potentialOverlayOpacity: config.potentialOverlayOpacity || 0.5,
      gridLineColor: config.gridLineColor || 'rgba(255, 255, 255, 0.2)',
      gridLineWidth: config.gridLineWidth || 1,
      showBottomPlot: config.showBottomPlot || false,
      bottomPlotHeight: config.bottomPlotHeight || 150
    };

    // Panel storage
    this.panels = {};
    this.layout = null;

    // Line selection state (shared between LineSelectionPanel and Wavefunction1DPlotPanel)
    this.lineSelectionState = new LineSelectionState();

    // Store reference to mode manager (will be set by ControlsManager)
    this.modeManager = null;

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
    // Always show plot panel (it will render white background when potential is 'none')
    const showPlot = this.config.showPotentialPlot;

    this.layout = new CanvasLayout(
      this.width,
      this.height,
      {
        showPlot: showPlot,
        showPhaseWheel: this.config.showPhaseWheel,
        showBottomPlot: this.config.showBottomPlot,
        bottomPlotHeight: this.config.bottomPlotHeight
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

    // 3. Overlay 0: Potential overlay on main grid (if enabled)
    if (this.config.showPotentialOverlay) {
      this.panels.potentialOverlay = new PotentialOverlayPanel(
        bounds.wavefunction,
        {
          opacity: this.config.potentialOverlayOpacity
        }
      );
    }

    // 4. Overlay 1: Grid overlay (if enabled)
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

    // 6b. Foreground: Brush preview circle (for freehand drawing)
    this.panels.brushPreview = new BrushPreviewPanel(
      bounds.wavefunction,
      this.simulation.gridSize
    );

    // 7. Bottom panel: 1D wavefunction plot (if enabled)
    if (bounds.bottomPlot) {
      this.panels.wavefunction1DPlot = new Wavefunction1DPlotPanel(
        bounds.bottomPlot,
        this.lineSelectionState
      );
    }

    // 8. Overlay 4: Line selection overlay (if bottom plot enabled)
    if (this.config.showBottomPlot) {
      this.panels.lineSelection = new LineSelectionPanel(
        bounds.wavefunction,
        this.simulation.gridSize,
        this.lineSelectionState
      );
    }
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
      'wavefunction',        // Background: main visualization
      'potentialPlot',       // Side panel: potential profile
      'wavefunction1DPlot',  // Bottom panel: 1D plot
      'potentialOverlay',    // Overlay: 2D potential on grid
      'gridOverlay',         // Overlay: grid lines
      'phaseWheel',          // Overlay: phase reference wheel
      'lineSelection',       // Overlay: line selection UI
      'measurementFeedback', // Overlay: measurement flash
      'measurementCircle',   // Foreground: measurement hover circle
      'brushPreview'         // Foreground: brush preview circle (draw mode)
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
   * Toggle potential overlay visibility (2D overlay on main grid)
   * @param {boolean} visible - Whether to show potential overlay
   */
  setPotentialOverlayVisible(visible) {
    this.config.showPotentialOverlay = visible;
    this.createPanels(); // Recreate to add/remove overlay
  }

  /**
   * Set potential overlay opacity
   * @param {number} opacity - Opacity value (0-1)
   */
  setPotentialOverlayOpacity(opacity) {
    this.config.potentialOverlayOpacity = Math.max(0, Math.min(1, opacity));
    if (this.panels.potentialOverlay) {
      this.panels.potentialOverlay.config.opacity = this.config.potentialOverlayOpacity;
    }
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
   * Note: The measurement circle panel reads the radius directly from
   * simulation.measurementRadius (in physical units), so no explicit setting is needed.
   * This method exists for API compatibility.
   * @param {number} radius - Radius in physical units
   */
  setMeasurementRadius(radius) {
    // The MeasurementCirclePanel reads radius from simulation.measurementRadius
    // directly during render, so no action needed here
  }

  /**
   * Set brush preview state for freehand drawing mode
   * @param {boolean} active - Whether brush preview should be shown
   * @param {number} gridX - Grid x coordinate
   * @param {number} gridY - Grid y coordinate
   * @param {number} brushSize - Brush size in physical units
   * @param {boolean} eraseMode - Whether erase mode is active
   */
  setBrushPreviewState(active, gridX = 0, gridY = 0, brushSize = 0.15, eraseMode = false) {
    if (this.panels.brushPreview) {
      this.panels.brushPreview.setBrushState(active, gridX, gridY, brushSize, eraseMode);
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
   * Toggle bottom plot (1D wavefunction) visibility
   * @param {boolean} visible - Whether to show bottom plot
   */
  setBottomPlotVisible(visible) {
    this.config.showBottomPlot = visible;
    this.createPanels(); // Recreate to add/remove bottom plot
  }

  /**
   * Activate line selection mode
   * Enables the user to click two points to define a line for 1D plotting
   */
  activateLineSelection() {
    this.lineSelectionState.activate();

    // Switch to line selection mode
    if (this.modeManager) {
      this.modeManager.setMode(InteractionMode.LINE_SELECTION);
    }
  }

  /**
   * Deactivate line selection mode
   * Keeps the current line but disables further selection
   */
  deactivateLineSelection() {
    this.lineSelectionState.deactivate();

    // Return to measurement mode
    if (this.modeManager) {
      this.modeManager.setMode(InteractionMode.MEASUREMENT);
    }
  }

  /**
   * Cancel the current line selection
   * Clears selected points and line without deactivating selection mode
   */
  cancelLineSelection() {
    this.lineSelectionState.cancel();
  }

  /**
   * Check if line selection mode is currently active
   * @returns {boolean} True if selection mode is active
   */
  isLineSelectionActive() {
    return this.lineSelectionState.isActive;
  }

  /**
   * Check if a complete line has been defined
   * @returns {boolean} True if both points selected and line computed
   */
  hasCompleteLine() {
    return this.lineSelectionState.hasCompleteLine();
  }

  /**
   * Set the interaction mode manager reference
   * Called by ControlsManager during initialization
   * @param {InteractionModeManager} modeManager - The mode manager instance
   */
  setModeManager(modeManager) {
    this.modeManager = modeManager;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.disposePanels();
  }
}

export default VisualizerV2;
