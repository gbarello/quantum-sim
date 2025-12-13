/**
 * @file InteractionManager.js
 * @description Centralized manager for all canvas mouse and touch interactions.
 *
 * The InteractionManager handles all user interactions with the canvas, including:
 * - Mouse movement and hover state tracking
 * - Click event delegation to panels
 * - Touch event support (mobile compatibility)
 * - Tooltip generation and management
 * - Coordinate conversions from browser events to canvas space
 *
 * This class eliminates the duplication between Controller and Visualizer by
 * providing a single source of truth for all canvas interaction logic.
 *
 * Architecture:
 * - Attaches event listeners to the canvas element
 * - Determines which panel contains the mouse/touch point
 * - Delegates events to the appropriate panel via the Panel interface
 * - Invokes callbacks to coordinate with external systems (Controller, UI)
 * - Properly handles cleanup to prevent memory leaks
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

/**
 * Manages all mouse and touch interactions with the visualization canvas.
 *
 * This class centralizes interaction logic that was previously split between
 * Controller and Visualizer, providing a clean separation of concerns:
 * - InteractionManager: handles events and delegates to panels
 * - Panels: handle their own coordinate systems and interactions
 * - Controller: handles higher-level application logic (play/pause, reset, etc.)
 *
 * The InteractionManager uses callbacks to communicate with the rest of the
 * application without creating tight coupling.
 *
 * @example
 * const manager = new InteractionManager(canvas, panels, {
 *     getSimulation: () => simulation,
 *     onHoverChange: (panel) => console.log('Hovering over:', panel?.name),
 *     onTooltipChange: (tooltip) => updateTooltipDisplay(tooltip),
 *     onPanelClick: (panel, x, y) => console.log('Clicked panel:', panel.name)
 * });
 *
 * // Later, when cleaning up:
 * manager.cleanup();
 */
export class InteractionManager {
    /**
     * Creates a new InteractionManager.
     *
     * @param {HTMLCanvasElement} canvas - The canvas element to attach listeners to
     * @param {Map<string, Panel>|Object} panels - Map or object of panel name → Panel instance
     * @param {Object} callbacks - Callback functions for external coordination
     * @param {Function} callbacks.getSimulation - Returns the current QuantumSimulation instance
     * @param {Function} [callbacks.onHoverChange] - Called when hover panel changes (receives Panel|null)
     * @param {Function} [callbacks.onTooltipChange] - Called when tooltip changes (receives TooltipInfo|null)
     * @param {Function} [callbacks.onPanelClick] - Called when a panel handles a click (receives Panel, canvasX, canvasY)
     *
     * @throws {Error} If canvas is null or callbacks.getSimulation is not provided
     *
     * @example
     * const manager = new InteractionManager(canvas, {
     *     main: mainPanel,
     *     sidebar: sidebarPanel
     * }, {
     *     getSimulation: () => app.simulation,
     *     onHoverChange: (panel) => {
     *         if (panel) console.log('Now hovering over', panel.name);
     *     },
     *     onTooltipChange: (tooltip) => {
     *         if (tooltip) {
     *             tooltipElement.textContent = tooltip.text;
     *             tooltipElement.style.left = tooltip.x + 'px';
     *             tooltipElement.style.top = tooltip.y + 'px';
     *         }
     *     },
     *     onPanelClick: (panel, x, y) => {
     *         console.log(`Panel ${panel.name} clicked at (${x}, ${y})`);
     *     }
     * });
     */
    constructor(canvas, panels, callbacks) {
        // Validate inputs
        if (!canvas) {
            throw new Error('InteractionManager: canvas element is required');
        }
        if (!callbacks || typeof callbacks.getSimulation !== 'function') {
            throw new Error('InteractionManager: callbacks.getSimulation function is required');
        }

        /**
         * The canvas element that interaction events are attached to.
         * @type {HTMLCanvasElement}
         * @private
         */
        this._canvas = canvas;

        /**
         * Map of panel name → Panel instance.
         * Stored as an array for efficient iteration during hit testing.
         * @type {Panel[]}
         * @private
         */
        this._panels = this._convertPanelsToArray(panels);

        /**
         * Callback functions for external coordination.
         * @type {Object}
         * @private
         */
        this._callbacks = callbacks;

        /**
         * The panel currently under the mouse cursor.
         * Null if mouse is outside all panels or has left the canvas.
         * @type {Panel|null}
         * @private
         */
        this._currentHoverPanel = null;

        /**
         * The current tooltip information from the hovered panel.
         * Null if no tooltip should be displayed.
         * @type {TooltipInfo|null}
         * @private
         */
        this._currentTooltip = null;

        /**
         * Bound event handler references for cleanup.
         * Storing these allows us to remove event listeners properly.
         * @type {Object}
         * @private
         */
        this._boundHandlers = {
            mousemove: this._handleMouseMove.bind(this),
            mouseleave: this._handleMouseLeave.bind(this),
            click: this._handleClick.bind(this),
            touchstart: this._handleTouchStart.bind(this),
            touchmove: this._handleTouchMove.bind(this),
            touchend: this._handleTouchEnd.bind(this)
        };

        // Setup event listeners
        this._setupEventListeners();
    }

    /**
     * Converts panels map/object to an array for efficient iteration.
     *
     * @param {Map<string, Panel>|Object} panels - Panels as Map or object
     * @returns {Panel[]} Array of panel instances
     * @private
     */
    _convertPanelsToArray(panels) {
        if (!panels) {
            return [];
        }

        if (panels instanceof Map) {
            return Array.from(panels.values()).filter(p => p != null);
        }

        if (typeof panels === 'object') {
            return Object.values(panels).filter(p => p != null);
        }

        throw new Error('InteractionManager: panels must be a Map or Object');
    }

    /**
     * Attaches all event listeners to the canvas.
     *
     * Event listeners are bound to specific handler methods and stored
     * for later cleanup. We use passive:false for touch events to allow
     * preventDefault() to work properly.
     *
     * @private
     */
    _setupEventListeners() {
        const canvas = this._canvas;

        // Mouse events
        canvas.addEventListener('mousemove', this._boundHandlers.mousemove);
        canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
        canvas.addEventListener('click', this._boundHandlers.click);

        // Touch events (mobile support)
        // passive: false allows preventDefault() to prevent scrolling during touch
        canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
        canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
        canvas.addEventListener('touchend', this._boundHandlers.touchend);
    }

    /**
     * Converts browser event coordinates to canvas coordinates.
     *
     * Takes into account:
     * - Canvas position in the viewport (getBoundingClientRect)
     * - Canvas display size vs actual size
     * - Device pixel ratio (handled by canvas itself)
     *
     * The returned coordinates are in canvas logical space, suitable for
     * passing to panel methods.
     *
     * @param {MouseEvent|Touch} event - Mouse event or touch object
     * @returns {Object} Canvas coordinates
     * @returns {number} return.x - X coordinate in canvas space
     * @returns {number} return.y - Y coordinate in canvas space
     * @private
     */
    _eventToCanvasCoords(event) {
        const rect = this._canvas.getBoundingClientRect();

        // Convert from browser viewport coordinates to canvas logical coordinates
        // getBoundingClientRect gives the displayed size, which may differ from
        // canvas.width/height due to CSS scaling
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;

        return { x: canvasX, y: canvasY };
    }

    /**
     * Finds the first panel that contains the given canvas point.
     *
     * Panels are checked in array order. For overlapping panels, the first
     * match wins (which typically corresponds to z-order, with earlier panels
     * on top).
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @returns {Panel|null} The panel containing the point, or null if none
     * @private
     */
    _findPanelAt(canvasX, canvasY) {
        // Check panels in order (first match wins, like z-order)
        for (const panel of this._panels) {
            if (panel && panel.containsPoint(canvasX, canvasY)) {
                return panel;
            }
        }
        return null;
    }

    /**
     * Handles mouse move events.
     *
     * This method:
     * 1. Converts event coordinates to canvas space
     * 2. Finds which panel (if any) contains the point
     * 3. Updates hover state if the panel changed
     * 4. Gets tooltip info from the hovered panel
     * 5. Invokes callbacks to notify external systems
     *
     * @param {MouseEvent} event - Mouse move event
     * @private
     */
    _handleMouseMove(event) {
        // Convert to canvas coordinates
        const { x: canvasX, y: canvasY } = this._eventToCanvasCoords(event);

        // Find which panel contains this point
        const hoveredPanel = this._findPanelAt(canvasX, canvasY);

        // Update hover state if panel changed
        if (hoveredPanel !== this._currentHoverPanel) {
            this._currentHoverPanel = hoveredPanel;

            // Notify external systems of hover change
            if (this._callbacks.onHoverChange) {
                this._callbacks.onHoverChange(hoveredPanel);
            }
        }

        // Get tooltip from the hovered panel
        let tooltip = null;
        if (hoveredPanel) {
            const simulation = this._callbacks.getSimulation();
            tooltip = hoveredPanel.handleMouseMove(canvasX, canvasY, simulation);
        }

        // Update tooltip if it changed
        if (tooltip !== this._currentTooltip) {
            this._currentTooltip = tooltip;

            // Notify external systems of tooltip change
            if (this._callbacks.onTooltipChange) {
                this._callbacks.onTooltipChange(tooltip);
            }
        }
    }

    /**
     * Handles mouse leave events (when cursor exits canvas).
     *
     * Clears all hover state and tooltips, and notifies external systems.
     *
     * @private
     */
    _handleMouseLeave() {
        // Clear hover state
        const hadHoverPanel = this._currentHoverPanel !== null;
        const hadTooltip = this._currentTooltip !== null;

        this._currentHoverPanel = null;
        this._currentTooltip = null;

        // Notify external systems of state change
        if (hadHoverPanel && this._callbacks.onHoverChange) {
            this._callbacks.onHoverChange(null);
        }

        if (hadTooltip && this._callbacks.onTooltipChange) {
            this._callbacks.onTooltipChange(null);
        }
    }

    /**
     * Handles click events.
     *
     * Finds the panel at the click location and delegates the click to it.
     * If the panel handles the click (returns true), notifies external systems.
     *
     * This enables panels to implement their own click behavior (e.g.,
     * measurements, adding potentials, selecting initial conditions).
     *
     * @param {MouseEvent} event - Click event
     * @private
     */
    _handleClick(event) {
        // Convert to canvas coordinates
        const { x: canvasX, y: canvasY } = this._eventToCanvasCoords(event);

        // Find which panel contains this point
        const clickedPanel = this._findPanelAt(canvasX, canvasY);

        if (clickedPanel) {
            const simulation = this._callbacks.getSimulation();
            const handled = clickedPanel.handleClick(canvasX, canvasY, simulation);

            // If panel handled the click, notify external systems
            if (handled && this._callbacks.onPanelClick) {
                this._callbacks.onPanelClick(clickedPanel, canvasX, canvasY);
            }
        }
    }

    /**
     * Handles touch start events (mobile).
     *
     * Treats touch start like mouse move to show hover feedback.
     * Prevents default to avoid unwanted scrolling.
     *
     * @param {TouchEvent} event - Touch start event
     * @private
     */
    _handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling

        if (event.touches.length > 0) {
            const touch = event.touches[0];
            // Simulate mouse move with the touch point
            this._handleMouseMove(touch);
        }
    }

    /**
     * Handles touch move events (mobile).
     *
     * Updates hover state as the touch point moves.
     * Prevents default to avoid unwanted scrolling.
     *
     * @param {TouchEvent} event - Touch move event
     * @private
     */
    _handleTouchMove(event) {
        event.preventDefault(); // Prevent scrolling

        if (event.touches.length > 0) {
            const touch = event.touches[0];
            // Simulate mouse move with the touch point
            this._handleMouseMove(touch);
        }
    }

    /**
     * Handles touch end events (mobile).
     *
     * Treats touch end like a click at the last touch position.
     * Clears hover state after the click.
     *
     * @param {TouchEvent} event - Touch end event
     * @private
     */
    _handleTouchEnd(event) {
        event.preventDefault(); // Prevent mouse events from firing

        // If there was a touch (now ended), treat it as a click
        if (event.changedTouches.length > 0 && this._currentHoverPanel) {
            const touch = event.changedTouches[0];
            // Simulate click at the touch point
            this._handleClick(touch);
        }

        // Clear hover state (touch is no longer active)
        this._handleMouseLeave();
    }

    /**
     * Gets the current tooltip information.
     *
     * @returns {TooltipInfo|null} Current tooltip, or null if no tooltip
     *
     * @example
     * const tooltip = manager.getCurrentTooltip();
     * if (tooltip) {
     *     console.log('Tooltip text:', tooltip.text);
     *     console.log('Tooltip position:', tooltip.x, tooltip.y);
     * }
     */
    getCurrentTooltip() {
        return this._currentTooltip;
    }

    /**
     * Gets the currently hovered panel.
     *
     * @returns {Panel|null} The panel under the cursor, or null
     *
     * @example
     * const panel = manager.getCurrentHoverPanel();
     * if (panel) {
     *     console.log('Hovering over:', panel.name);
     * }
     */
    getCurrentHoverPanel() {
        return this._currentHoverPanel;
    }

    /**
     * Updates the panels being managed.
     *
     * This method allows dynamically changing which panels the manager
     * is responsible for, useful when panels are added or removed.
     *
     * @param {Map<string, Panel>|Object} panels - New panels map or object
     *
     * @example
     * // Add a new panel
     * const newPanels = { ...oldPanels, sidebar: sidebarPanel };
     * manager.updatePanels(newPanels);
     */
    updatePanels(panels) {
        this._panels = this._convertPanelsToArray(panels);

        // Clear hover state since panel structure changed
        if (this._currentHoverPanel) {
            this._currentHoverPanel = null;
            if (this._callbacks.onHoverChange) {
                this._callbacks.onHoverChange(null);
            }
        }
    }

    /**
     * Removes all event listeners and cleans up resources.
     *
     * This method MUST be called when the InteractionManager is no longer
     * needed to prevent memory leaks. It removes all event listeners from
     * the canvas.
     *
     * After calling cleanup(), this InteractionManager instance should not
     * be used anymore.
     *
     * @example
     * // When shutting down the application or switching canvases:
     * interactionManager.cleanup();
     * interactionManager = null;
     */
    cleanup() {
        const canvas = this._canvas;

        // Remove all event listeners using the stored bound handlers
        canvas.removeEventListener('mousemove', this._boundHandlers.mousemove);
        canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
        canvas.removeEventListener('click', this._boundHandlers.click);
        canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
        canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
        canvas.removeEventListener('touchend', this._boundHandlers.touchend);

        // Clear state
        this._currentHoverPanel = null;
        this._currentTooltip = null;
        this._panels = [];
    }
}

/**
 * Integration Guide for Controller:
 *
 * To integrate InteractionManager with the existing Controller:
 *
 * 1. Import InteractionManager:
 *    import { InteractionManager } from './visualization/core/InteractionManager.js';
 *
 * 2. Create the InteractionManager in Controller constructor:
 *    this.interactionManager = new InteractionManager(
 *        this.ui.canvas,
 *        this.visualizer.panels, // Assumes visualizer exposes its panels
 *        {
 *            getSimulation: () => this.simulation,
 *            onHoverChange: (panel) => this.handleHoverChange(panel),
 *            onTooltipChange: (tooltip) => this.handleTooltipChange(tooltip),
 *            onPanelClick: (panel, x, y) => this.handlePanelClick(panel, x, y)
 *        }
 *    );
 *
 * 3. Implement callback methods in Controller:
 *    handleHoverChange(panel) {
 *        // Update visualizer hover state if needed
 *        if (this.visualizer) {
 *            this.visualizer.setHoverPanel(panel);
 *        }
 *    }
 *
 *    handleTooltipChange(tooltip) {
 *        if (!this.ui.hoverProbability) return;
 *
 *        if (tooltip) {
 *            // Show tooltip
 *            this.ui.hoverProbability.textContent = tooltip.text;
 *            this.ui.hoverProbability.style.left = `${tooltip.x}px`;
 *            this.ui.hoverProbability.style.top = `${tooltip.y}px`;
 *            this.ui.hoverProbability.style.display = 'block';
 *        } else {
 *            // Hide tooltip
 *            this.ui.hoverProbability.style.display = 'none';
 *        }
 *    }
 *
 *    handlePanelClick(panel, canvasX, canvasY) {
 *        // Handle different panel types
 *        if (panel.name === 'wavefunction') {
 *            // Perform measurement
 *            const gridCoords = panel.canvasToGrid(canvasX, canvasY);
 *            this.performMeasurement(gridCoords.x, gridCoords.y);
 *        }
 *    }
 *
 * 4. Remove old event listeners from Controller:
 *    - Remove canvas.addEventListener('click', ...)
 *    - Remove canvas.addEventListener('mousemove', ...)
 *    - Remove canvas.addEventListener('mouseleave', ...)
 *    - Remove touch event listeners
 *
 * 5. Clean up in Controller.destroy():
 *    destroy() {
 *        if (this.interactionManager) {
 *            this.interactionManager.cleanup();
 *        }
 *        // ... existing cleanup code
 *    }
 *
 * Benefits:
 * - Single source of truth for canvas interactions
 * - No duplicate coordinate conversion logic
 * - Clean separation between interaction handling and business logic
 * - Easy to test interaction logic in isolation
 * - Panels can implement their own interaction behavior
 * - No tight coupling between Controller and Visualizer
 */
