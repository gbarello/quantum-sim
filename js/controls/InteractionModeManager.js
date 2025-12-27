/**
 * InteractionModeManager.js
 *
 * Centralized manager for canvas interaction modes.
 * Ensures mutual exclusion and provides clean mode transitions.
 */

/**
 * Enumeration of available interaction modes.
 * @readonly
 * @enum {string}
 */
export const InteractionMode = {
  MEASUREMENT: 'measurement',      // Click to measure (default)
  FREEHAND_DRAW: 'freehand_draw',  // Drag to draw potential
  LINE_SELECTION: 'line_selection'  // Click to select line points
};

/**
 * Manages the current interaction mode and coordinates mode transitions.
 * Ensures only one mode is active at a time.
 */
export class InteractionModeManager {
  constructor() {
    /**
     * Current active mode
     * @type {InteractionMode}
     */
    this._currentMode = InteractionMode.MEASUREMENT;

    /**
     * Mode-specific state objects
     * @type {Object}
     */
    this._modeStates = {
      [InteractionMode.MEASUREMENT]: {},
      [InteractionMode.FREEHAND_DRAW]: {
        isDrawing: false,
        lastX: null,
        lastY: null,
        brushSize: 0.15,
        brushStrength: 2.0,
        eraseMode: false
      },
      [InteractionMode.LINE_SELECTION]: {
        firstPoint: null,
        secondPoint: null,
        isComplete: false
      }
    };

    /**
     * Mode change callbacks
     * @type {Array<Function>}
     */
    this._onModeChangeCallbacks = [];
  }

  /**
   * Get the current interaction mode
   * @returns {InteractionMode}
   */
  getCurrentMode() {
    return this._currentMode;
  }

  /**
   * Check if a specific mode is currently active
   * @param {InteractionMode} mode
   * @returns {boolean}
   */
  isMode(mode) {
    return this._currentMode === mode;
  }

  /**
   * Switch to a new interaction mode
   * Handles cleanup of previous mode and initialization of new mode
   * @param {InteractionMode} newMode
   */
  setMode(newMode) {
    if (this._currentMode === newMode) {
      return; // Already in this mode
    }

    const oldMode = this._currentMode;

    // Exit current mode (cleanup)
    this._exitMode(oldMode);

    // Switch mode
    this._currentMode = newMode;

    // Enter new mode (setup)
    this._enterMode(newMode);

    // Notify listeners
    this._notifyModeChange(oldMode, newMode);

    console.log(`Interaction mode changed: ${oldMode} → ${newMode}`);
  }

  /**
   * Get state for the current mode
   * @returns {Object}
   */
  getModeState() {
    return this._modeStates[this._currentMode];
  }

  /**
   * Register a callback for mode changes
   * @param {Function} callback - Called with (oldMode, newMode)
   */
  onModeChange(callback) {
    this._onModeChangeCallbacks.push(callback);
  }

  /**
   * Exit the current mode (cleanup operations)
   * @private
   */
  _exitMode(mode) {
    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        // Stop any active drawing
        this._modeStates[mode].isDrawing = false;
        this._modeStates[mode].lastX = null;
        this._modeStates[mode].lastY = null;
        break;

      case InteractionMode.LINE_SELECTION:
        // Clear selection (but keep state for display)
        // Actual clearing should be delegated to the handler
        break;

      case InteractionMode.MEASUREMENT:
        // No cleanup needed
        break;
    }
  }

  /**
   * Enter a new mode (setup operations)
   * @private
   */
  _enterMode(mode) {
    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        // Drawing mode is ready
        break;

      case InteractionMode.LINE_SELECTION:
        // Selection mode is ready
        break;

      case InteractionMode.MEASUREMENT:
        // Default mode, always ready
        break;
    }
  }

  /**
   * Notify all registered callbacks of mode change
   * @private
   */
  _notifyModeChange(oldMode, newMode) {
    this._onModeChangeCallbacks.forEach(callback => {
      try {
        callback(oldMode, newMode);
      } catch (error) {
        console.error('Error in mode change callback:', error);
      }
    });
  }

  /**
   * Reset all mode state
   */
  reset() {
    this.setMode(InteractionMode.MEASUREMENT);

    // Reset all mode states
    this._modeStates[InteractionMode.FREEHAND_DRAW] = {
      isDrawing: false,
      lastX: null,
      lastY: null,
      brushSize: 0.15,
      brushStrength: 2.0,
      eraseMode: false
    };

    this._modeStates[InteractionMode.LINE_SELECTION] = {
      firstPoint: null,
      secondPoint: null,
      isComplete: false
    };
  }
}
