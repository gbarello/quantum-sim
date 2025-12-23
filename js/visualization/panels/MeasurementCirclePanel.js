/**
 * @file MeasurementCirclePanel.js
 * @description Panel for rendering the measurement radius indicator on hover.
 *
 * The MeasurementCirclePanel shows a red circle indicating the measurement area
 * when the user hovers over the wavefunction. This provides visual feedback about
 * the spatial extent of a quantum measurement before it is performed.
 *
 * Features:
 * - Red circle showing measurement radius
 * - Follows mouse position in grid coordinates
 * - Configurable radius
 * - Only visible when hovering over the wavefunction
 * - Semi-transparent to avoid obscuring the visualization
 *
 * This implementation is extracted from the monolithic Visualizer class to enable
 * better modularity and testability.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering the measurement radius indicator.
 *
 * The indicator is a red circle centered at the hover position, with radius
 * determined by the simulation's measurementRadius parameter (in physical units).
 *
 * Rendering is pixel-perfect identical to the original Visualizer.drawMeasurementCircle()
 * implementation (lines 431-455).
 */
export class MeasurementCirclePanel extends Panel {
    /**
     * Creates a new MeasurementCirclePanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels (should match wavefunction panel)
     * @param {number} bounds.height - Height in pixels (should match wavefunction panel)
     * @param {number} gridSize - Number of grid cells (N×N)
     *
     * @example
     * const panel = new MeasurementCirclePanel(
     *     { x: 0, y: 0, width: 512, height: 512 },
     *     128
     * );
     */
    constructor(bounds, gridSize) {
        super('measurementCircle', bounds);

        /**
         * Number of grid cells in each dimension.
         * Used to calculate cell size for positioning the circle.
         * @type {number}
         */
        this.gridSize = gridSize;

        /**
         * Current hover state.
         * @type {Object}
         * @private
         */
        this._hoverState = {
            active: false,  // Whether the mouse is hovering
            x: 0,           // Grid X coordinate
            y: 0            // Grid Y coordinate
        };
    }

    /**
     * Sets the hover state for the measurement circle.
     *
     * This method updates whether the circle should be visible and where it
     * should be drawn. It is typically called by the Controller in response
     * to mouse movement.
     *
     * @param {boolean} active - Whether the mouse is hovering over the wavefunction
     * @param {number} gridX - Grid X coordinate (0 to gridSize-1)
     * @param {number} gridY - Grid Y coordinate (0 to gridSize-1)
     *
     * @example
     * // Show circle at grid position (64, 64)
     * panel.setHoverState(true, 64, 64);
     *
     * // Hide circle
     * panel.setHoverState(false);
     */
    setHoverState(active, gridX = 0, gridY = 0) {
        this._hoverState = {
            active,
            x: gridX,
            y: gridY
        };
    }

    /**
     * Gets the current hover state.
     *
     * @returns {Object} The current hover state
     */
    getHoverState() {
        return { ...this._hoverState };
    }

    /**
     * Checks if the circle is currently active.
     *
     * @returns {boolean} True if hovering
     */
    isActive() {
        return this._hoverState.active;
    }

    /**
     * Renders the measurement circle to the canvas.
     *
     * This method draws a red circle at the current hover position, with radius
     * determined by the simulation's measurementRadius parameter (in physical units).
     *
     * The rendering is identical to the original Visualizer.drawMeasurementCircle()
     * implementation (lines 431-455).
     *
     * Algorithm:
     * 1. Check if hover is active
     * 2. Calculate cell size
     * 3. Convert grid coordinates to canvas coordinates (center of cell)
     * 4. Get measurement radius from simulation (physical units)
     * 5. Convert to grid units by dividing by dx
     * 6. Convert to canvas pixels by multiplying by cellSize
     * 7. Draw red circle with the calculated pixel radius
     *
     * Note: The circle is centered at (x + 0.5, y + 0.5) in grid coordinates
     * to position it at the center of the cell rather than the corner.
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation for radius info
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        // Skip if not hovering
        if (!this._hoverState.active) {
            return;
        }

        const { x, y } = this._hoverState;

        // Calculate cell size
        const cellSize = this.bounds.width / this.gridSize;

        // Convert grid coordinates to canvas coordinates (center of cell)
        const canvasX = this.bounds.x + (x + 0.5) * cellSize;
        const canvasY = this.bounds.y + (y + 0.5) * cellSize;

        // Get measurement radius from simulation (in physical units)
        const measurementRadiusPhysical = simulation.measurementRadius || 0.2;

        // Convert from physical units to grid units
        const measurementRadiusGrid = measurementRadiusPhysical / simulation.dx;

        // Convert to canvas pixels
        const radiusInPixels = measurementRadiusGrid * cellSize;

        ctx.save();

        // Draw red circle
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, radiusInPixels, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Updates the grid size.
     *
     * This method should be called if the simulation grid size changes.
     *
     * @param {number} newGridSize - The new grid size
     */
    setGridSize(newGridSize) {
        if (newGridSize > 0 && Number.isInteger(newGridSize)) {
            this.gridSize = newGridSize;
        }
    }
}
