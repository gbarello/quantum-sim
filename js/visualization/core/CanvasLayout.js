/**
 * CanvasLayout.js
 *
 * Centralized layout management for the quantum visualization canvas.
 *
 * This class manages the spatial arrangement of different visualization panels
 * on the canvas, including:
 * - Main wavefunction visualization (always present, square grid)
 * - Potential plot (optional, to the right of wavefunction)
 * - Phase wheel reference (optional, overlaid in corner)
 *
 * The layout system ensures that:
 * 1. The wavefunction grid remains square (using canvas height as the basis)
 * 2. The potential plot occupies remaining horizontal space when enabled
 * 3. Panel bounds are calculated consistently across the application
 * 4. Hit testing can determine which panel contains a given point
 *
 * Architecture Pattern:
 * This is part of Phase 1 of the visualization refactor, providing
 * foundational layout logic that will be used by specialized panel
 * renderers in later phases.
 */

export class CanvasLayout {
  /**
   * Create a new canvas layout manager
   *
   * @param {number} canvasWidth - The logical width of the canvas (after DPR scaling)
   * @param {number} canvasHeight - The logical height of the canvas (after DPR scaling)
   * @param {Object} config - Layout configuration options
   * @param {boolean} [config.showPlot=false] - Whether to reserve space for potential plot
   * @param {boolean} [config.showPhaseWheel=false] - Whether to show phase wheel overlay
   * @param {number} [config.phaseWheelRadius=40] - Radius of phase wheel in pixels
   * @param {number} [config.phaseWheelMargin=20] - Margin from canvas edge for phase wheel
   */
  constructor(canvasWidth, canvasHeight, config = {}) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.config = {
      showPlot: config.showPlot || false,
      showPhaseWheel: config.showPhaseWheel || false,
      phaseWheelRadius: config.phaseWheelRadius || 40,
      phaseWheelMargin: config.phaseWheelMargin || 20
    };
  }

  /**
   * Calculate the layout of all panels on the canvas
   *
   * This method determines the position and size of each visualization panel
   * based on the current canvas dimensions and configuration.
   *
   * Layout Rules:
   * - Wavefunction grid is always square, sized to canvas height
   * - Potential plot (if shown) occupies remaining horizontal space
   * - Phase wheel (if shown) is overlaid in top-right corner
   *
   * @returns {Object} Layout object with panel bounds
   * @returns {Object} return.wavefunction - Wavefunction panel bounds {x, y, width, height}
   * @returns {Object|null} return.potentialPlot - Potential plot bounds or null if not shown
   * @returns {Object|null} return.phaseWheel - Phase wheel bounds or null if not shown
   *
   * @example
   * const layout = canvasLayout.calculateLayout();
   * // layout.wavefunction = { x: 0, y: 0, width: 600, height: 600 }
   * // layout.potentialPlot = { x: 600, y: 0, width: 200, height: 600 }
   * // layout.phaseWheel = { x: 740, y: 20, width: 80, height: 80 }
   */
  calculateLayout() {
    // Determine if plot should be shown
    const hasPlot = this.config.showPlot;

    // Grid size in pixels - always square, based on canvas height
    // This ensures the wavefunction visualization maintains proper aspect ratio
    const gridSize = this.canvasHeight;

    // Calculate plot width (remaining horizontal space if plot is enabled)
    const plotWidth = hasPlot ? (this.canvasWidth - gridSize) : 0;

    // Calculate phase wheel position (top-right corner with margin)
    const phaseWheelSize = this.config.phaseWheelRadius * 2;
    const phaseWheelX = this.canvasWidth - phaseWheelSize - this.config.phaseWheelMargin;
    const phaseWheelY = this.config.phaseWheelMargin;

    return {
      // Main wavefunction grid - always present, always square
      wavefunction: {
        x: 0,
        y: 0,
        width: gridSize,
        height: gridSize
      },

      // Potential plot - only included if enabled, occupies remaining horizontal space
      potentialPlot: hasPlot ? {
        x: gridSize,
        y: 0,
        width: plotWidth,
        height: this.canvasHeight
      } : null,

      // Phase wheel - only included if enabled, overlaid in top-right corner
      phaseWheel: this.config.showPhaseWheel ? {
        x: phaseWheelX,
        y: phaseWheelY,
        width: phaseWheelSize,
        height: phaseWheelSize
      } : null
    };
  }

  /**
   * Determine which panel contains a given point
   *
   * This method performs hit testing to identify which visualization panel
   * (if any) contains the specified coordinates. Panels are tested in order
   * of precedence: phase wheel (overlay), potential plot, wavefunction.
   *
   * Note: Phase wheel is tested first because it overlays other panels.
   *
   * @param {number} x - X coordinate in canvas space
   * @param {number} y - Y coordinate in canvas space
   * @returns {Object|null} Hit test result or null if no panel hit
   * @returns {string} return.panel - Name of the panel hit ('wavefunction', 'potentialPlot', 'phaseWheel')
   * @returns {Object} return.bounds - Bounds of the hit panel {x, y, width, height}
   *
   * @example
   * const hit = canvasLayout.hitTest(mouseX, mouseY);
   * if (hit && hit.panel === 'wavefunction') {
   *   // User clicked on wavefunction grid
   * }
   */
  hitTest(x, y) {
    const layout = this.calculateLayout();

    // Test panels in order of visual precedence (overlays first)
    // This ensures that overlaid panels (like phase wheel) are detected
    // before underlying panels
    const testOrder = ['phaseWheel', 'potentialPlot', 'wavefunction'];

    for (const panelName of testOrder) {
      const bounds = layout[panelName];
      if (bounds && this.isInBounds(x, y, bounds)) {
        return {
          panel: panelName,
          bounds: bounds
        };
      }
    }

    return null;
  }

  /**
   * Test if a point is within given bounds
   *
   * Helper method for rectangular bounds checking. Uses standard
   * mathematical bounds test: point is inside if it's within the
   * rectangle defined by [x, x+width) × [y, y+height).
   *
   * @param {number} x - X coordinate to test
   * @param {number} y - Y coordinate to test
   * @param {Object} bounds - Rectangular bounds to test against
   * @param {number} bounds.x - Left edge of rectangle
   * @param {number} bounds.y - Top edge of rectangle
   * @param {number} bounds.width - Width of rectangle
   * @param {number} bounds.height - Height of rectangle
   * @returns {boolean} True if point is within bounds
   *
   * @example
   * const bounds = { x: 10, y: 10, width: 100, height: 100 };
   * canvasLayout.isInBounds(50, 50, bounds);  // true
   * canvasLayout.isInBounds(150, 50, bounds); // false
   */
  isInBounds(x, y, bounds) {
    return x >= bounds.x &&
           x < bounds.x + bounds.width &&
           y >= bounds.y &&
           y < bounds.y + bounds.height;
  }

  /**
   * Update canvas dimensions
   *
   * Call this method when the canvas is resized to update the layout
   * calculations. This allows the layout manager to adapt to responsive
   * canvas sizing without creating a new instance.
   *
   * @param {number} canvasWidth - New logical canvas width
   * @param {number} canvasHeight - New logical canvas height
   *
   * @example
   * // On window resize
   * canvasLayout.updateDimensions(canvas.width, canvas.height);
   */
  updateDimensions(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Update layout configuration
   *
   * Call this method to change which panels are shown without recreating
   * the layout manager. Useful for toggling visualization features.
   *
   * @param {Object} config - New configuration options (merged with existing)
   * @param {boolean} [config.showPlot] - Whether to show potential plot
   * @param {boolean} [config.showPhaseWheel] - Whether to show phase wheel
   * @param {number} [config.phaseWheelRadius] - Radius of phase wheel
   * @param {number} [config.phaseWheelMargin] - Margin from edge for phase wheel
   *
   * @example
   * // Toggle phase wheel visibility
   * canvasLayout.updateConfig({ showPhaseWheel: true });
   */
  updateConfig(config) {
    Object.assign(this.config, config);
  }

  /**
   * Get the wavefunction grid dimensions
   *
   * Convenience method to get just the wavefunction panel bounds.
   * This is the most frequently accessed layout information.
   *
   * @returns {Object} Wavefunction panel bounds {x, y, width, height}
   *
   * @example
   * const gridBounds = canvasLayout.getWavefunctionBounds();
   * const cellSize = gridBounds.width / gridSize;
   */
  getWavefunctionBounds() {
    return this.calculateLayout().wavefunction;
  }

  /**
   * Get the potential plot dimensions
   *
   * Convenience method to get just the potential plot bounds.
   * Returns null if plot is not currently shown.
   *
   * @returns {Object|null} Potential plot bounds or null if not shown
   *
   * @example
   * const plotBounds = canvasLayout.getPotentialPlotBounds();
   * if (plotBounds) {
   *   // Render plot in these bounds
   * }
   */
  getPotentialPlotBounds() {
    return this.calculateLayout().potentialPlot;
  }

  /**
   * Get the phase wheel dimensions
   *
   * Convenience method to get just the phase wheel bounds.
   * Returns null if phase wheel is not currently shown.
   *
   * @returns {Object|null} Phase wheel bounds or null if not shown
   *
   * @example
   * const wheelBounds = canvasLayout.getPhaseWheelBounds();
   * if (wheelBounds) {
   *   // Render phase wheel at these coordinates
   * }
   */
  getPhaseWheelBounds() {
    return this.calculateLayout().phaseWheel;
  }
}

export default CanvasLayout;
