/**
 * @file Panel.js
 * @description Base class for all visualization panels in the Quantum Playground.
 *
 * The Panel class provides a common interface and coordinate system for rendering
 * different aspects of the quantum simulation. Each panel occupies a rectangular
 * region of the canvas and handles its own rendering, mouse interactions, and
 * coordinate transformations.
 *
 * All specialized panels (WavefunctionPanel, PotentialPanel, etc.) should extend
 * this base class and implement the abstract render() method.
 *
 * Architecture:
 * - Panels manage their own rectangular bounds on the canvas
 * - Coordinate conversion between canvas space and local panel space
 * - Mouse event handling with tooltip support
 * - Clean separation of concerns: each panel renders one aspect of the simulation
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { TooltipInfo } from './TooltipInfo.js';

/**
 * Base class for all visualization panels.
 *
 * Provides coordinate system management, bounds checking, and a standard
 * interface for rendering and interaction. Subclasses must implement the
 * render() method.
 *
 * @abstract
 */
export class Panel {
    /**
     * Creates a new Panel instance.
     *
     * @param {string} name - Human-readable name for this panel (for debugging)
     * @param {Object} bounds - The rectangular bounds of this panel on the canvas
     * @param {number} bounds.x - Left edge of panel in canvas coordinates
     * @param {number} bounds.y - Top edge of panel in canvas coordinates
     * @param {number} bounds.width - Width of panel in pixels
     * @param {number} bounds.height - Height of panel in pixels
     *
     * @example
     * const panel = new MyPanel('Main View', {
     *     x: 0, y: 0, width: 512, height: 512
     * });
     */
    constructor(name, bounds) {
        /**
         * Human-readable name for this panel.
         * Useful for debugging and error messages.
         * @type {string}
         */
        this.name = name;

        /**
         * The rectangular bounds of this panel on the canvas.
         * @type {Object}
         * @property {number} x - Left edge in canvas coordinates
         * @property {number} y - Top edge in canvas coordinates
         * @property {number} width - Width in pixels
         * @property {number} height - Height in pixels
         */
        this.bounds = { ...bounds }; // Copy to avoid external mutation

        // Validate bounds
        this._validateBounds(bounds);
    }

    /**
     * Validates that bounds have required properties and valid values.
     *
     * @param {Object} bounds - The bounds to validate
     * @throws {Error} If bounds are invalid
     * @private
     */
    _validateBounds(bounds) {
        if (!bounds || typeof bounds !== 'object') {
            throw new Error(`Panel "${this.name}": bounds must be an object`);
        }

        const required = ['x', 'y', 'width', 'height'];
        for (const prop of required) {
            if (typeof bounds[prop] !== 'number' || !isFinite(bounds[prop])) {
                throw new Error(`Panel "${this.name}": bounds.${prop} must be a finite number`);
            }
        }

        if (bounds.width <= 0 || bounds.height <= 0) {
            throw new Error(`Panel "${this.name}": bounds.width and bounds.height must be positive`);
        }
    }

    /**
     * Renders this panel to the canvas context.
     *
     * This is the main rendering method that subclasses MUST implement.
     * The context will already be configured for drawing, and the clip
     * region may be set to the panel bounds.
     *
     * @abstract
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context to draw to
     * @param {QuantumSimulation} simulation - The quantum simulation to visualize
     * @param {number} time - Current simulation time in arbitrary units
     * @throws {Error} Always throws - subclasses must override this method
     *
     * @example
     * class MyPanel extends Panel {
     *     render(ctx, simulation, time) {
     *         ctx.fillStyle = 'blue';
     *         ctx.fillRect(this.bounds.x, this.bounds.y,
     *                      this.bounds.width, this.bounds.height);
     *     }
     * }
     */
    render(ctx, simulation, time) {
        throw new Error(
            `Panel "${this.name}": render() method must be implemented by subclass. ` +
            `This is an abstract method that defines how the panel draws its content.`
        );
    }

    /**
     * Converts canvas coordinates to local panel coordinates.
     *
     * Local coordinates are relative to the panel's top-left corner:
     * - (0, 0) is the top-left corner of the panel
     * - (width, height) is the bottom-right corner
     *
     * This is useful for subclasses that need to map canvas clicks to
     * positions within their own coordinate system.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @returns {Object} Local coordinates
     * @returns {number} return.x - X coordinate relative to panel top-left
     * @returns {number} return.y - Y coordinate relative to panel top-left
     *
     * @example
     * const local = panel.canvasToLocal(150, 200);
     * console.log(`Clicked at (${local.x}, ${local.y}) within panel`);
     */
    canvasToLocal(canvasX, canvasY) {
        return {
            x: canvasX - this.bounds.x,
            y: canvasY - this.bounds.y
        };
    }

    /**
     * Converts local panel coordinates to canvas coordinates.
     *
     * This is the inverse of canvasToLocal(). Local coordinates are relative
     * to the panel's top-left corner, and this method converts them back to
     * absolute canvas coordinates.
     *
     * @param {number} localX - X coordinate relative to panel top-left
     * @param {number} localY - Y coordinate relative to panel top-left
     * @returns {Object} Canvas coordinates
     * @returns {number} return.x - X coordinate in canvas space
     * @returns {number} return.y - Y coordinate in canvas space
     *
     * @example
     * // Draw a point at the center of the panel
     * const center = panel.localToCanvas(
     *     panel.bounds.width / 2,
     *     panel.bounds.height / 2
     * );
     * ctx.fillRect(center.x, center.y, 5, 5);
     */
    localToCanvas(localX, localY) {
        return {
            x: localX + this.bounds.x,
            y: localY + this.bounds.y
        };
    }

    /**
     * Handles mouse move events over this panel.
     *
     * This method is called when the mouse moves over the panel. Subclasses
     * can override this to provide custom hover behavior and tooltip information.
     *
     * The default implementation returns null (no tooltip).
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @param {QuantumSimulation} simulation - The quantum simulation for data access
     * @returns {TooltipInfo|null} Tooltip information, or null for no tooltip
     *
     * @example
     * class MyPanel extends Panel {
     *     handleMouseMove(canvasX, canvasY, simulation) {
     *         const local = this.canvasToLocal(canvasX, canvasY);
     *         const value = this.getValueAt(local.x, local.y);
     *         return new TooltipInfo(
     *             { value: value.toFixed(3) },
     *             canvasX, canvasY
     *         );
     *     }
     * }
     */
    handleMouseMove(canvasX, canvasY, simulation) {
        // Default: no tooltip
        return null;
    }

    /**
     * Handles click events on this panel.
     *
     * This method is called when the user clicks on the panel. Subclasses
     * can override this to provide custom click behavior (e.g., measurements,
     * adding potentials, selecting points).
     *
     * The default implementation does nothing and returns false.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @param {QuantumSimulation} simulation - The quantum simulation for state access
     * @returns {boolean} True if the click was handled, false otherwise
     *
     * @example
     * class MyPanel extends Panel {
     *     handleClick(canvasX, canvasY, simulation) {
     *         const local = this.canvasToLocal(canvasX, canvasY);
     *         console.log(`Clicked at local coords: ${local.x}, ${local.y}`);
     *         // Perform some action...
     *         return true; // Indicate we handled the click
     *     }
     * }
     */
    handleClick(canvasX, canvasY, simulation) {
        // Default: no action
        return false;
    }

    /**
     * Checks if a point in canvas coordinates is within this panel's bounds.
     *
     * This is useful for hit testing and determining which panel should
     * handle a mouse event.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @returns {boolean} True if the point is within this panel's bounds
     *
     * @example
     * if (panel.containsPoint(mouseX, mouseY)) {
     *     panel.handleMouseMove(mouseX, mouseY, simulation);
     * }
     */
    containsPoint(canvasX, canvasY) {
        return (
            canvasX >= this.bounds.x &&
            canvasX < this.bounds.x + this.bounds.width &&
            canvasY >= this.bounds.y &&
            canvasY < this.bounds.y + this.bounds.height
        );
    }

    /**
     * Updates the bounds of this panel.
     *
     * This method is called when the canvas is resized or the layout changes.
     * Subclasses can override this to perform additional updates (e.g.,
     * regenerating cached ImageData buffers).
     *
     * The default implementation validates and updates the bounds.
     *
     * @param {Object} newBounds - The new bounds for this panel
     * @param {number} newBounds.x - New left edge in canvas coordinates
     * @param {number} newBounds.y - New top edge in canvas coordinates
     * @param {number} newBounds.width - New width in pixels
     * @param {number} newBounds.height - New height in pixels
     *
     * @example
     * // Resize panel to fill canvas
     * panel.updateBounds({
     *     x: 0, y: 0,
     *     width: canvas.width,
     *     height: canvas.height
     * });
     */
    updateBounds(newBounds) {
        this._validateBounds(newBounds);
        this.bounds = { ...newBounds }; // Copy to avoid external mutation
    }

    /**
     * Returns a string representation of this panel for debugging.
     *
     * @returns {string} String representation
     *
     * @example
     * console.log(panel.toString());
     * // Output: "Panel 'Main View' at (0, 0) with size 512x512"
     */
    toString() {
        return (
            `Panel '${this.name}' at (${this.bounds.x}, ${this.bounds.y}) ` +
            `with size ${this.bounds.width}x${this.bounds.height}`
        );
    }
}
