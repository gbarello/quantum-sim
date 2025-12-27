/**
 * @file BrushPreviewPanel.js
 * @description Panel for rendering the brush preview indicator during freehand drawing.
 *
 * The BrushPreviewPanel shows a blue circle indicating the brush size
 * when the user is in freehand drawing mode. This provides visual feedback about
 * the brush radius before drawing begins.
 *
 * Features:
 * - Blue circle showing brush radius
 * - Follows mouse position in grid coordinates
 * - Configurable radius based on brush size
 * - Only visible when in freehand drawing mode
 * - Semi-transparent to avoid obscuring the visualization
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering the brush preview indicator.
 *
 * The indicator is a blue circle centered at the mouse position, with radius
 * determined by the brush size parameter (in physical units).
 */
export class BrushPreviewPanel extends Panel {
    /**
     * Creates a new BrushPreviewPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels (should match wavefunction panel)
     * @param {number} bounds.height - Height in pixels (should match wavefunction panel)
     * @param {number} gridSize - Number of grid cells (N×N)
     *
     * @example
     * const panel = new BrushPreviewPanel(
     *     { x: 0, y: 0, width: 512, height: 512 },
     *     128
     * );
     */
    constructor(bounds, gridSize) {
        super('brushPreview', bounds);

        /**
         * Number of grid cells in each dimension.
         * Used to calculate cell size for positioning the circle.
         * @type {number}
         */
        this.gridSize = gridSize;

        /**
         * Current hover/brush state.
         * @type {Object}
         * @private
         */
        this._brushState = {
            active: false,    // Whether we're in draw mode and mouse is hovering
            x: 0,             // Grid X coordinate
            y: 0,             // Grid Y coordinate
            brushSize: 0.15,  // Brush radius in physical units
            eraseMode: false  // Whether erase mode is active
        };
    }

    /**
     * Sets the brush state for the preview circle.
     *
     * This method updates whether the circle should be visible, where it
     * should be drawn, and what size it should be. It is typically called by
     * the Controller in response to mouse movement or mode changes.
     *
     * @param {boolean} active - Whether we're in draw mode and hovering
     * @param {number} gridX - Grid X coordinate (0 to gridSize-1)
     * @param {number} gridY - Grid Y coordinate (0 to gridSize-1)
     * @param {number} brushSize - Brush radius in physical units
     * @param {boolean} eraseMode - Whether erase mode is active
     *
     * @example
     * // Show brush preview at grid position (64, 64)
     * panel.setBrushState(true, 64, 64, 0.2, false);
     *
     * // Hide preview
     * panel.setBrushState(false);
     */
    setBrushState(active, gridX = 0, gridY = 0, brushSize = 0.15, eraseMode = false) {
        this._brushState = {
            active,
            x: gridX,
            y: gridY,
            brushSize,
            eraseMode
        };
    }

    /**
     * Gets the current brush state.
     *
     * @returns {Object} The current brush state
     */
    getBrushState() {
        return { ...this._brushState };
    }

    /**
     * Checks if the brush preview is currently active.
     *
     * @returns {boolean} True if in draw mode and hovering
     */
    isActive() {
        return this._brushState.active;
    }

    /**
     * Renders the brush preview circle to the canvas.
     *
     * This method draws a blue circle at the current mouse position, with radius
     * determined by the brush size parameter (in physical units).
     *
     * Algorithm:
     * 1. Check if preview is active
     * 2. Calculate cell size
     * 3. Convert grid coordinates to canvas coordinates (center of cell)
     * 4. Get brush size in physical units
     * 5. Convert to grid units by dividing by dx
     * 6. Convert to canvas pixels by multiplying by cellSize
     * 7. Draw blue circle with the calculated pixel radius
     *
     * Note: The circle is centered at (x + 0.5, y + 0.5) in grid coordinates
     * to position it at the center of the cell rather than the corner.
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation for dx info
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        // Skip if not active
        if (!this._brushState.active) {
            return;
        }

        const { x, y, brushSize, eraseMode } = this._brushState;

        // Calculate cell size
        const cellSize = this.bounds.width / this.gridSize;

        // Convert grid coordinates to canvas coordinates (center of cell)
        const canvasX = this.bounds.x + (x + 0.5) * cellSize;
        const canvasY = this.bounds.y + (y + 0.5) * cellSize;

        // Convert brush size from physical units to grid units
        const brushSizeGrid = brushSize / simulation.dx;

        // Convert to canvas pixels
        const radiusInPixels = brushSizeGrid * cellSize;

        ctx.save();

        // Draw blue circle (or red for erase mode)
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, radiusInPixels, 0, Math.PI * 2);

        if (eraseMode) {
            // Red for erase mode
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        } else {
            // Blue for draw mode
            ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
        }

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
