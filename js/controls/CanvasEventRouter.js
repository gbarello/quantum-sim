/**
 * CanvasEventRouter.js
 *
 * Routes canvas events to appropriate handlers based on current interaction mode.
 * Provides clean separation between event capture and mode-specific logic.
 */

import { InteractionMode } from './InteractionModeManager.js';

/**
 * Routes canvas events to mode-specific handlers.
 * Coordinates with InteractionModeManager to ensure correct routing.
 */
export class CanvasEventRouter {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {InteractionModeManager} modeManager
   * @param {Object} handlers - Mode-specific handler objects
   * @param {Object} handlers.measurement - Measurement mode handlers
   * @param {Object} handlers.freehandDraw - Freehand draw mode handlers
   * @param {Object} handlers.lineSelection - Line selection mode handlers
   */
  constructor(canvas, modeManager, handlers) {
    this.canvas = canvas;
    this.modeManager = modeManager;
    this.handlers = handlers;

    // Track mouse button state
    this._isMouseDown = false;

    // Bind event handlers
    this._boundHandlers = {
      mousedown: this._onMouseDown.bind(this),
      mouseup: this._onMouseUp.bind(this),
      mousemove: this._onMouseMove.bind(this),
      mouseleave: this._onMouseLeave.bind(this),
      click: this._onClick.bind(this),
      // Touch events
      touchstart: this._onTouchStart.bind(this),
      touchmove: this._onTouchMove.bind(this),
      touchend: this._onTouchEnd.bind(this)
    };

    // Attach listeners
    this._attachListeners();

    // Update cursor when mode changes
    this.modeManager.onModeChange(() => this._updateCursor());
  }

  /**
   * Attach all event listeners
   * @private
   */
  _attachListeners() {
    this.canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    this.canvas.addEventListener('mouseup', this._boundHandlers.mouseup);
    this.canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
    this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
    this.canvas.addEventListener('click', this._boundHandlers.click);

    // Touch support
    this.canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
    this.canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    this.canvas.addEventListener('touchend', this._boundHandlers.touchend);
  }

  /**
   * Get canvas coordinates from event
   * @private
   */
  _getCanvasCoords(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  /**
   * Handle mousedown event
   * @private
   */
  _onMouseDown(event) {
    this._isMouseDown = true;
    const coords = this._getCanvasCoords(event);
    const mode = this.modeManager.getCurrentMode();

    // Route to mode-specific handler
    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        this.handlers.freehandDraw.onMouseDown?.(coords.x, coords.y);
        break;

      case InteractionMode.LINE_SELECTION:
        // Line selection uses click, not mousedown
        break;

      case InteractionMode.MEASUREMENT:
        // Measurement uses click, not mousedown
        break;
    }
  }

  /**
   * Handle mouseup event
   * @private
   */
  _onMouseUp(event) {
    const coords = this._getCanvasCoords(event);
    const mode = this.modeManager.getCurrentMode();

    // Route to mode-specific handler
    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        this.handlers.freehandDraw.onMouseUp?.(coords.x, coords.y);
        break;

      case InteractionMode.LINE_SELECTION:
        // Handled by click
        break;

      case InteractionMode.MEASUREMENT:
        // Handled by click
        break;
    }

    this._isMouseDown = false;
  }

  /**
   * Handle mousemove event
   * @private
   */
  _onMouseMove(event) {
    const coords = this._getCanvasCoords(event);
    const mode = this.modeManager.getCurrentMode();

    // Route to mode-specific handler
    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        if (this._isMouseDown) {
          // Dragging - draw potential
          this.handlers.freehandDraw.onMouseDrag?.(coords.x, coords.y);
        } else {
          // Just hovering
          this.handlers.freehandDraw.onMouseMove?.(coords.x, coords.y);
        }
        break;

      case InteractionMode.LINE_SELECTION:
        this.handlers.lineSelection.onMouseMove?.(coords.x, coords.y);
        break;

      case InteractionMode.MEASUREMENT:
        // Show measurement preview
        this.handlers.measurement.onMouseMove?.(coords.x, coords.y);
        break;
    }
  }

  /**
   * Handle mouseleave event
   * @private
   */
  _onMouseLeave(event) {
    const mode = this.modeManager.getCurrentMode();

    // End any active drag operation
    if (this._isMouseDown) {
      switch (mode) {
        case InteractionMode.FREEHAND_DRAW:
          this.handlers.freehandDraw.onMouseUp?.();
          break;
      }
      this._isMouseDown = false;
    }

    // Clear hover states
    this.handlers.measurement.onMouseLeave?.();
  }

  /**
   * Handle click event
   * @private
   */
  _onClick(event) {
    const coords = this._getCanvasCoords(event);
    const mode = this.modeManager.getCurrentMode();

    // Route to mode-specific handler
    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        // Drawing uses drag, not click
        break;

      case InteractionMode.LINE_SELECTION:
        this.handlers.lineSelection.onClick?.(coords.x, coords.y);
        break;

      case InteractionMode.MEASUREMENT:
        this.handlers.measurement.onClick?.(coords.x, coords.y);
        break;
    }
  }

  /**
   * Handle touch start (mobile)
   * @private
   */
  _onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
      this._onMouseDown(fakeEvent);
    }
  }

  /**
   * Handle touch move (mobile)
   * @private
   */
  _onTouchMove(event) {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
      this._onMouseMove(fakeEvent);
    }
  }

  /**
   * Handle touch end (mobile)
   * @private
   */
  _onTouchEnd(event) {
    event.preventDefault();
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
      this._onMouseUp(fakeEvent);
      // Trigger click for tap
      this._onClick(fakeEvent);
    }
  }

  /**
   * Update cursor based on current mode
   * @private
   */
  _updateCursor() {
    const mode = this.modeManager.getCurrentMode();

    switch (mode) {
      case InteractionMode.FREEHAND_DRAW:
        this.canvas.style.cursor = 'crosshair';
        break;
      case InteractionMode.LINE_SELECTION:
        this.canvas.style.cursor = 'crosshair';
        break;
      case InteractionMode.MEASUREMENT:
        this.canvas.style.cursor = 'default';
        break;
    }
  }

  /**
   * Remove all event listeners and clean up
   */
  cleanup() {
    this.canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
    this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseup);
    this.canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
    this.canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
    this.canvas.removeEventListener('click', this._boundHandlers.click);
    this.canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
    this.canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
    this.canvas.removeEventListener('touchend', this._boundHandlers.touchend);
  }
}
