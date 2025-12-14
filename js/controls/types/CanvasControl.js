/**
 * CanvasControl - Interactive canvas selector control
 *
 * Provides an interactive canvas where users can click to select positions.
 * Used for position and momentum selection in the quantum playground.
 *
 * Features:
 * - Custom draw function for canvas visualization
 * - Click/touch interaction for position selection
 * - Normalized coordinates (0-1 range)
 * - Hover hints and visual feedback
 * - Responsive canvas sizing
 *
 * Example Usage:
 * ```javascript
 * const positionSelector = new CanvasControl({
 *   id: 'position-selector',
 *   label: 'Initial Position',
 *   width: 100,
 *   height: 100,
 *   drawFunction: (ctx, state) => {
 *     // Draw grid background
 *     ctx.fillStyle = '#f0f0f0';
 *     ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
 *
 *     // Draw selection indicator if position is set
 *     if (state.x !== null && state.y !== null) {
 *       const px = state.x * ctx.canvas.width;
 *       const py = state.y * ctx.canvas.height;
 *       ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
 *       ctx.beginPath();
 *       ctx.arc(px, py, 10, 0, 2 * Math.PI);
 *       ctx.fill();
 *     }
 *   },
 *   onSelect: (x, y) => {
 *     console.log(`Selected position: (${x}, ${y})`);
 *   }
 * });
 * ```
 */

import { BaseControl } from '../BaseControl.js';

export class CanvasControl extends BaseControl {
  /**
   * Constructor for CanvasControl
   * @param {Object} config - Configuration object
   * @param {string} config.id - Unique identifier
   * @param {string} config.label - Display label
   * @param {number} [config.width=100] - Canvas width in pixels
   * @param {number} [config.height=100] - Canvas height in pixels
   * @param {Function} [config.drawFunction] - Custom draw function (ctx, state) => void
   * @param {Function} [config.onSelect] - Selection handler (x, y) => void
   * @param {string} [config.hint='Click to select'] - Hover hint text
   */
  constructor(config) {
    super(config);

    // Canvas configuration
    this.width = config.width || 100;
    this.height = config.height || 100;
    this.hint = config.hint || 'Click to select';

    // Draw function for custom canvas rendering
    this.drawFunction = config.drawFunction || this._defaultDrawFunction.bind(this);

    // Selection handler
    this.onSelect = config.onSelect || null;

    // Internal state: stores selected position in normalized coordinates (0-1)
    this._state = {
      x: config.defaultValue?.x !== undefined ? config.defaultValue.x : null,
      y: config.defaultValue?.y !== undefined ? config.defaultValue.y : null
    };

    // Canvas elements
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Render the canvas control
   * @param {HTMLElement} parentElement - Parent element to render into
   * @returns {HTMLElement} The rendered control element
   */
  render(parentElement) {
    // Create container with canvas-specific styling
    this.container = this._createContainer();
    this.container.classList.add('canvas-selector');

    // Create label (don't use 'for' attribute since canvas is not a form element)
    const label = document.createElement('label');
    label.className = 'control-label';
    label.textContent = this.label;
    if (this.tooltip) {
      label.setAttribute('title', this.tooltip);
    }
    this.container.appendChild(label);

    // Create canvas container wrapper
    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-selector-container';

    // Create canvas element
    this.canvas = document.createElement('canvas');
    this.canvas.id = `${this.id}-canvas`;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.cursor = 'crosshair';

    // Get 2D context
    this.ctx = this.canvas.getContext('2d');

    // Create hover hint element
    const hintElement = document.createElement('div');
    hintElement.className = 'canvas-selector-hint';
    hintElement.textContent = this.hint;

    // Assemble canvas container
    canvasContainer.appendChild(this.canvas);
    canvasContainer.appendChild(hintElement);
    this.container.appendChild(canvasContainer);

    // Setup event listeners
    this._setupEventListeners();

    // Initial draw
    this.update();

    // Attach to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  /**
   * Get current selection state
   * @returns {Object} Current state with normalized coordinates { x, y }
   */
  getValue() {
    return { ...this._state };
  }

  /**
   * Set selection state
   * @param {Object} state - New state with normalized coordinates { x, y }
   */
  setValue(state) {
    if (!state || typeof state !== 'object') {
      console.warn(`CanvasControl.setValue: Invalid state for control '${this.id}'`);
      return;
    }

    // Update internal state
    this._state.x = state.x !== undefined ? state.x : this._state.x;
    this._state.y = state.y !== undefined ? state.y : this._state.y;

    // Clamp to valid range [0, 1]
    if (this._state.x !== null) {
      this._state.x = Math.max(0, Math.min(1, this._state.x));
    }
    if (this._state.y !== null) {
      this._state.y = Math.max(0, Math.min(1, this._state.y));
    }

    // Redraw canvas with new state
    this.update();

    // Emit change event
    this.emit('change', this.getValue());
  }

  /**
   * Update the canvas display
   * Redraws the canvas using the current state
   */
  update() {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Call custom draw function with context and current state
    try {
      this.drawFunction(this.ctx, this.getValue());
    } catch (error) {
      console.error(`CanvasControl: Error in drawFunction for control '${this.id}':`, error);
      // Draw error indicator
      this._drawError();
    }
  }

  /**
   * Setup event listeners for canvas interaction
   * @private
   */
  _setupEventListeners() {
    if (!this.canvas) return;

    // Mouse click handler
    const handleClick = (event) => {
      if (!this.isEnabled()) return;

      const coords = this._getCanvasCoordinates(event);
      this._handleSelection(coords.x, coords.y);
    };

    // Touch handler (for mobile)
    const handleTouch = (event) => {
      if (!this.isEnabled()) return;

      event.preventDefault();
      const touch = event.touches[0] || event.changedTouches[0];
      const coords = this._getCanvasCoordinates(touch);
      this._handleSelection(coords.x, coords.y);
    };

    // Attach event listeners
    this.canvas.addEventListener('click', handleClick);
    this.canvas.addEventListener('touchend', handleTouch);

    // Store references for cleanup
    this._eventHandlers = {
      click: handleClick,
      touchend: handleTouch
    };
  }

  /**
   * Handle selection at canvas coordinates
   * @param {number} x - Normalized x coordinate (0-1)
   * @param {number} y - Normalized y coordinate (0-1)
   * @private
   */
  _handleSelection(x, y) {
    // Update state
    this._state.x = x;
    this._state.y = y;

    // Redraw canvas
    this.update();

    // Call onSelect callback if provided
    if (this.onSelect && typeof this.onSelect === 'function') {
      try {
        this.onSelect(x, y);
      } catch (error) {
        console.error(`CanvasControl: Error in onSelect handler for control '${this.id}':`, error);
      }
    }

    // Emit select event with coordinates
    this.emit('select', { x, y });

    // Also emit change event for consistency
    this.emit('change', this.getValue());
  }

  /**
   * Get normalized canvas coordinates from event
   * @param {MouseEvent|Touch} event - Mouse or touch event
   * @returns {Object} Normalized coordinates { x, y } in range [0, 1]
   * @private
   */
  _getCanvasCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();

    // Get pixel coordinates relative to canvas
    const pixelX = event.clientX - rect.left;
    const pixelY = event.clientY - rect.top;

    // Normalize to [0, 1] range
    const normalizedX = pixelX / rect.width;
    const normalizedY = pixelY / rect.height;

    // Clamp to valid range
    return {
      x: Math.max(0, Math.min(1, normalizedX)),
      y: Math.max(0, Math.min(1, normalizedY))
    };
  }

  /**
   * Default draw function if none provided
   * Draws a simple grid with selection indicator
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} state - Current state { x, y }
   * @private
   */
  _defaultDrawFunction(ctx, state) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Draw background
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw selection indicator if position is set
    if (state.x !== null && state.y !== null) {
      const px = state.x * width;
      const py = state.y * height;

      // Draw outer circle
      ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, 2 * Math.PI);
      ctx.fill();

      // Draw inner circle
      ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw crosshair
      ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
      ctx.lineWidth = 2;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(px, py - 20);
      ctx.lineTo(px, py + 20);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(px - 20, py);
      ctx.lineTo(px + 20, py);
      ctx.stroke();
    }
  }

  /**
   * Draw error indicator when draw function fails
   * @private
   */
  _drawError() {
    if (!this.ctx) return;

    const width = this.canvas.width;
    const height = this.canvas.height;

    // Red background
    this.ctx.fillStyle = '#e74c3c';
    this.ctx.fillRect(0, 0, width, height);

    // Error text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Draw Error', width / 2, height / 2);
  }

  /**
   * Destroy the control and cleanup resources
   */
  destroy() {
    // Remove event listeners
    if (this.canvas && this._eventHandlers) {
      Object.entries(this._eventHandlers).forEach(([event, handler]) => {
        this.canvas.removeEventListener(event, handler);
      });
    }

    // Clear canvas references
    this.canvas = null;
    this.ctx = null;
    this._eventHandlers = null;
    this.drawFunction = null;
    this.onSelect = null;

    // Call parent destroy
    super.destroy();
  }
}
