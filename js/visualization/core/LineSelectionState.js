/**
 * @file LineSelectionState.js
 * @description Manages state for interactive line selection in the quantum visualization.
 *
 * This class encapsulates all state related to selecting a line through the wavefunction
 * grid for 1D plotting. It provides a clean API for:
 * - Activating/deactivating selection mode
 * - Recording first and second points
 * - Computing line parameters
 * - Querying selection status
 *
 * The state object is shared between LineSelectionPanel (for UI/interaction) and
 * Wavefunction1DPlotPanel (for data sampling), providing loose coupling between
 * the selection mechanism and the plotting display.
 *
 * Architecture Pattern:
 * - Pure state management (no rendering or DOM interaction)
 * - Immutable point storage (defensive copying)
 * - Automatic line parameter computation
 * - Clean separation of concerns
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

/**
 * State manager for two-point line selection.
 *
 * Tracks the selection mode (active/inactive) and the two points that define
 * a line through the wavefunction grid. When both points are set, automatically
 * computes line parameters (endpoints in grid coordinates and length).
 *
 * Usage Flow:
 * 1. activate() - Enter selection mode
 * 2. setFirstPoint(point) - User clicks first point
 * 3. setSecondPoint(point) - User clicks second point, line is computed
 * 4. getLine() - Retrieve computed line parameters
 * 5. deactivate() - Exit selection mode
 *
 * @example
 * const state = new LineSelectionState();
 * state.activate();
 * state.setFirstPoint({ canvasX: 100, canvasY: 150, gridX: 32, gridY: 48 });
 * state.setSecondPoint({ canvasX: 200, canvasY: 250, gridX: 64, gridY: 80 });
 * const line = state.getLine(); // { x1: 32, y1: 48, x2: 64, y2: 80, length: ... }
 */
export class LineSelectionState {
  /**
   * Creates a new LineSelectionState.
   * Initializes to inactive state with no points selected.
   */
  constructor() {
    this.reset();
  }

  /**
   * Resets all state to initial values.
   * Clears selection mode, points, and computed line parameters.
   */
  reset() {
    /**
     * Whether selection mode is currently active.
     * @type {boolean}
     */
    this.isActive = false;

    /**
     * First point selected by user (or null if not yet selected).
     * @type {{canvasX: number, canvasY: number, gridX: number, gridY: number}|null}
     */
    this.firstPoint = null;

    /**
     * Second point selected by user (or null if not yet selected).
     * @type {{canvasX: number, canvasY: number, gridX: number, gridY: number}|null}
     */
    this.secondPoint = null;

    /**
     * Whether both points have been selected.
     * @type {boolean}
     */
    this.isComplete = false;

    /**
     * Computed line parameters (or null if line not yet defined).
     * @type {{x1: number, y1: number, x2: number, y2: number, length: number}|null}
     */
    this.line = null;
  }

  /**
   * Activates selection mode.
   * Clears any existing points and prepares for new selection.
   */
  activate() {
    this.isActive = true;
    this.firstPoint = null;
    this.secondPoint = null;
    this.isComplete = false;
    this.line = null;
  }

  /**
   * Deactivates selection mode.
   * Does not clear existing points - they remain for display/plotting.
   */
  deactivate() {
    this.isActive = false;
  }

  /**
   * Cancels the current selection.
   * Clears points and line without deactivating selection mode.
   * Useful when user clicks outside the grid to restart selection.
   */
  cancel() {
    this.firstPoint = null;
    this.secondPoint = null;
    this.isComplete = false;
    this.line = null;
  }

  /**
   * Sets the first point of the line selection.
   *
   * Clears any existing second point and computed line parameters.
   * The point object should contain both canvas coordinates (for rendering)
   * and grid coordinates (for computation).
   *
   * @param {Object} point - The first point
   * @param {number} point.canvasX - X coordinate in canvas space
   * @param {number} point.canvasY - Y coordinate in canvas space
   * @param {number} point.gridX - X index in grid (0 to gridSize-1)
   * @param {number} point.gridY - Y index in grid (0 to gridSize-1)
   *
   * @example
   * state.setFirstPoint({ canvasX: 100, canvasY: 150, gridX: 32, gridY: 48 });
   */
  setFirstPoint(point) {
    // Defensive copy to prevent external mutation
    this.firstPoint = { ...point };
    this.secondPoint = null;
    this.isComplete = false;
    this.line = null;
  }

  /**
   * Sets the second point of the line selection.
   *
   * Marks the selection as complete and automatically computes line parameters
   * (endpoints in grid coordinates and Euclidean length).
   *
   * @param {Object} point - The second point
   * @param {number} point.canvasX - X coordinate in canvas space
   * @param {number} point.canvasY - Y coordinate in canvas space
   * @param {number} point.gridX - X index in grid (0 to gridSize-1)
   * @param {number} point.gridY - Y index in grid (0 to gridSize-1)
   * @throws {Error} If first point has not been set
   *
   * @example
   * state.setSecondPoint({ canvasX: 200, canvasY: 250, gridX: 64, gridY: 80 });
   */
  setSecondPoint(point) {
    if (!this.firstPoint) {
      throw new Error('LineSelectionState: Must set first point before second point');
    }

    // Defensive copy to prevent external mutation
    this.secondPoint = { ...point };
    this.isComplete = true;

    // Compute line parameters in grid coordinates
    const dx = this.secondPoint.gridX - this.firstPoint.gridX;
    const dy = this.secondPoint.gridY - this.firstPoint.gridY;
    const length = Math.sqrt(dx * dx + dy * dy);

    this.line = {
      x1: this.firstPoint.gridX,
      y1: this.firstPoint.gridY,
      x2: this.secondPoint.gridX,
      y2: this.secondPoint.gridY,
      length: length
    };
  }

  /**
   * Gets the computed line parameters.
   *
   * Returns null if both points have not been selected yet.
   *
   * @returns {{x1: number, y1: number, x2: number, y2: number, length: number}|null}
   *          Line parameters or null if not yet defined
   *
   * @example
   * const line = state.getLine();
   * if (line) {
   *   console.log(`Line from (${line.x1}, ${line.y1}) to (${line.x2}, ${line.y2})`);
   *   console.log(`Length: ${line.length.toFixed(2)} grid cells`);
   * }
   */
  getLine() {
    return this.line;
  }

  /**
   * Checks if a complete line has been defined.
   *
   * Returns true only if both points have been selected and line parameters
   * have been computed.
   *
   * @returns {boolean} True if line is complete and ready for use
   *
   * @example
   * if (state.hasCompleteLine()) {
   *   // Safe to sample wavefunction along line
   *   const samples = sampleAlongLine(state.getLine());
   * }
   */
  hasCompleteLine() {
    return this.isComplete && this.line !== null;
  }
}
