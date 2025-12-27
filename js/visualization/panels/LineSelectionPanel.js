/**
 * @file LineSelectionPanel.js
 * @description Overlay panel for interactive line selection through the wavefunction grid.
 *
 * This panel provides visual feedback and handles user interaction for selecting
 * a two-point line through the quantum simulation grid. The line is used for
 * 1D wavefunction plotting along an arbitrary path.
 *
 * Features:
 * - Visual markers for first and second points (green and cyan circles)
 * - Dashed line connecting the two points
 * - Instruction text guiding the user
 * - Click handling to capture points
 * - Coordinate conversion from canvas to grid space
 * - Cancellation when clicking outside the grid
 *
 * The panel is an overlay on the wavefunction grid, rendering above the main
 * visualization but below measurement feedback. It communicates with other
 * components through a shared LineSelectionState object.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for interactive line selection overlay.
 *
 * Renders visual feedback for the selection process and handles click events
 * to capture the two points that define a line. The panel only renders when
 * selection mode is active in the shared state.
 *
 * Rendering:
 * - First point: green circle (#00ff00) with "1" label
 * - Second point: cyan circle (#00ffff) with "2" label
 * - Line: dashed white line connecting points
 * - Instructions: white text showing next action
 *
 * Interaction:
 * - Clicks within grid bounds set first/second point
 * - Clicks outside grid bounds cancel selection
 * - Returns true to indicate click was handled
 *
 * @extends Panel
 */
export class LineSelectionPanel extends Panel {
  /**
   * Creates a new LineSelectionPanel.
   *
   * @param {Object} bounds - The rectangular bounds of this panel (matches wavefunction panel)
   * @param {number} bounds.x - Left edge in canvas coordinates
   * @param {number} bounds.y - Top edge in canvas coordinates
   * @param {number} bounds.width - Width in pixels
   * @param {number} bounds.height - Height in pixels
   * @param {number} gridSize - Number of grid cells in each dimension (power of 2)
   * @param {LineSelectionState} selectionState - Shared state object for selection
   *
   * @example
   * const panel = new LineSelectionPanel(
   *   { x: 0, y: 0, width: 512, height: 512 },
   *   128,
   *   lineSelectionState
   * );
   */
  constructor(bounds, gridSize, selectionState) {
    super('lineSelection', bounds);

    /**
     * Number of grid cells in each dimension.
     * @type {number}
     */
    this.gridSize = gridSize;

    /**
     * Shared state object for line selection.
     * @type {LineSelectionState}
     */
    this.selectionState = selectionState;

    // Visual styling constants
    /**
     * Radius of point markers in pixels.
     * @type {number}
     * @private
     */
    this.pointRadius = 6;

    /**
     * Width of drawn lines in pixels.
     * @type {number}
     * @private
     */
    this.lineWidth = 2;

    /**
     * Color for first point marker (green).
     * @type {string}
     * @private
     */
    this.colorFirst = '#00ff00';

    /**
     * Color for second point marker (cyan).
     * @type {string}
     * @private
     */
    this.colorSecond = '#00ffff';

    /**
     * Color for connecting line (white).
     * @type {string}
     * @private
     */
    this.colorLine = '#ffffff';
  }

  /**
   * Renders the line selection overlay.
   *
   * Only renders if selection mode is active. Shows:
   * - First point marker (if selected)
   * - Second point marker (if selected)
   * - Dashed line connecting points (if both selected)
   * - Instruction text for next step
   *
   * The panel uses canvas coordinates for rendering but references grid
   * coordinates stored in the selection state.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {QuantumSimulation} simulation - The quantum simulation (unused, for interface)
   * @param {number} time - Current simulation time (unused, for interface)
   */
  render(ctx, simulation, time) {
    // Early return only if there's nothing to display
    // (no active selection AND no completed line to show)
    if (!this.selectionState.isActive && !this.selectionState.hasCompleteLine()) {
      return;
    }

    ctx.save();

    // Calculate cell size for converting grid coordinates to canvas pixels
    const cellSize = this.bounds.width / this.gridSize;

    // Draw first point marker if selected
    if (this.selectionState.firstPoint) {
      const fp = this.selectionState.firstPoint;
      // Center point marker in cell (add 0.5 to grid coordinates)
      const canvasX = this.bounds.x + (fp.gridX + 0.5) * cellSize;
      const canvasY = this.bounds.y + (fp.gridY + 0.5) * cellSize;

      this._drawPoint(ctx, canvasX, canvasY, this.colorFirst);

      // Draw "1" label above point
      ctx.fillStyle = this.colorFirst;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('1', canvasX, canvasY - this.pointRadius - 5);
    }

    // Draw second point marker and connecting line if selected
    if (this.selectionState.secondPoint) {
      const sp = this.selectionState.secondPoint;
      const canvasX = this.bounds.x + (sp.gridX + 0.5) * cellSize;
      const canvasY = this.bounds.y + (sp.gridY + 0.5) * cellSize;

      this._drawPoint(ctx, canvasX, canvasY, this.colorSecond);

      // Draw "2" label above point
      ctx.fillStyle = this.colorSecond;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('2', canvasX, canvasY - this.pointRadius - 5);

      // Draw connecting line if we have both points
      if (this.selectionState.firstPoint) {
        const fp = this.selectionState.firstPoint;
        const x1 = this.bounds.x + (fp.gridX + 0.5) * cellSize;
        const y1 = this.bounds.y + (fp.gridY + 0.5) * cellSize;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(canvasX, canvasY);
        ctx.strokeStyle = this.colorLine;
        ctx.lineWidth = this.lineWidth;
        ctx.setLineDash([5, 5]); // Dashed line pattern
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid lines
      }
    }

    // Draw instruction text ONLY when selection mode is active
    if (this.selectionState.isActive) {
      if (!this.selectionState.firstPoint) {
        // No points selected yet
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          'Click to select first point',
          this.bounds.x + this.bounds.width / 2,
          this.bounds.y + 20
        );
      } else if (!this.selectionState.secondPoint) {
        // First point selected, waiting for second
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          'Click to select second point',
          this.bounds.x + this.bounds.width / 2,
          this.bounds.y + 20
        );
      }
    }

    ctx.restore();
  }

  /**
   * Handles click events for line selection.
   *
   * Converts canvas coordinates to grid coordinates and updates the selection
   * state. If the click is outside the grid bounds, cancels the selection.
   *
   * Behavior:
   * - First click: sets first point
   * - Second click: sets second point and completes line
   * - Click outside grid: cancels selection
   *
   * @param {number} canvasX - X coordinate in canvas space
   * @param {number} canvasY - Y coordinate in canvas space
   * @param {QuantumSimulation} simulation - The quantum simulation (unused)
   * @returns {boolean} True if click was handled (always true when active)
   */
  handleClick(canvasX, canvasY, simulation) {
    // Only handle clicks when selection mode is active
    if (!this.selectionState.isActive) {
      return false;
    }

    // Convert canvas coordinates to grid coordinates
    const gridCoords = this._canvasToGrid(canvasX, canvasY);

    if (!gridCoords) {
      // Click was outside grid bounds - cancel selection
      this.selectionState.cancel();
      return true;
    }

    // Build point object with both canvas and grid coordinates
    const point = {
      canvasX,
      canvasY,
      gridX: gridCoords.x,
      gridY: gridCoords.y
    };

    // Set first or second point depending on current state
    if (!this.selectionState.firstPoint) {
      this.selectionState.setFirstPoint(point);
    } else {
      this.selectionState.setSecondPoint(point);
    }

    return true;
  }

  /**
   * Draws a point marker with glow effect.
   *
   * Renders a colored circle with a white border and subtle glow effect
   * to make the marker stand out against the wavefunction visualization.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {number} x - X coordinate in canvas space
   * @param {number} y - Y coordinate in canvas space
   * @param {string} color - Fill color for the marker
   * @private
   */
  _drawPoint(ctx, x, y, color) {
    // Draw outer glow
    ctx.beginPath();
    ctx.arc(x, y, this.pointRadius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Draw main point
    ctx.beginPath();
    ctx.arc(x, y, this.pointRadius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();

    // Draw white border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Converts canvas coordinates to grid coordinates.
   *
   * Returns null if the click is outside the panel bounds, which is used
   * to cancel the selection.
   *
   * @param {number} canvasX - X coordinate in canvas space
   * @param {number} canvasY - Y coordinate in canvas space
   * @returns {{x: number, y: number}|null} Grid coordinates or null if outside bounds
   * @private
   */
  _canvasToGrid(canvasX, canvasY) {
    // Check if click is within panel bounds
    if (canvasX < this.bounds.x || canvasX >= this.bounds.x + this.bounds.width ||
        canvasY < this.bounds.y || canvasY >= this.bounds.y + this.bounds.height) {
      return null;
    }

    // Convert to local coordinates relative to panel top-left
    const cellSize = this.bounds.width / this.gridSize;
    const relX = canvasX - this.bounds.x;
    const relY = canvasY - this.bounds.y;

    // Convert to grid indices
    const gridX = Math.floor(relX / cellSize);
    const gridY = Math.floor(relY / cellSize);

    // Validate grid coordinates
    if (gridX < 0 || gridX >= this.gridSize ||
        gridY < 0 || gridY >= this.gridSize) {
      return null;
    }

    return { x: gridX, y: gridY };
  }
}
