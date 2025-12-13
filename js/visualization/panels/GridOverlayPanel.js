/**
 * @file GridOverlayPanel.js
 * @description Panel for rendering a grid overlay on top of the wavefunction.
 *
 * The GridOverlayPanel draws orthogonal grid lines over the visualization to help
 * users identify positions and understand the discrete nature of the simulation grid.
 * This is a purely decorative overlay that does not affect the underlying simulation.
 *
 * Features:
 * - Configurable line color and width
 * - Draws both horizontal and vertical lines
 * - Aligns with simulation grid cells
 * - Semi-transparent to avoid obscuring wavefunction
 *
 * This implementation is extracted from the monolithic Visualizer class to enable
 * better modularity and testability.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering a grid overlay on the wavefunction visualization.
 *
 * The grid is drawn with semi-transparent lines that align with the simulation
 * grid cells. The number of grid lines matches the gridSize parameter.
 *
 * Rendering is pixel-perfect identical to the original Visualizer.drawGrid() implementation.
 */
export class GridOverlayPanel extends Panel {
    /**
     * Creates a new GridOverlayPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels (should match wavefunction panel)
     * @param {number} bounds.height - Height in pixels (should match wavefunction panel)
     * @param {number} gridSize - Number of grid cells (N×N)
     * @param {Object} config - Configuration options
     * @param {string} config.lineColor - CSS color for grid lines (default: 'rgba(255, 255, 255, 0.2)')
     * @param {number} config.lineWidth - Width of grid lines in pixels (default: 1)
     *
     * @example
     * const panel = new GridOverlayPanel(
     *     { x: 0, y: 0, width: 512, height: 512 },
     *     128,
     *     { lineColor: 'rgba(255, 255, 255, 0.2)', lineWidth: 1 }
     * );
     */
    constructor(bounds, gridSize, config = {}) {
        super('gridOverlay', bounds);

        /**
         * Number of grid cells in each dimension.
         * The grid will have (gridSize + 1) lines in each direction.
         * @type {number}
         */
        this.gridSize = gridSize;

        /**
         * Configuration for grid rendering.
         * @type {Object}
         */
        this.config = {
            lineColor: config.lineColor || 'rgba(255, 255, 255, 0.2)',
            lineWidth: config.lineWidth !== undefined ? config.lineWidth : 1
        };
    }

    /**
     * Renders the grid overlay to the canvas.
     *
     * This method draws horizontal and vertical lines that align with the
     * simulation grid cells. The rendering is identical to the original
     * Visualizer.drawGrid() implementation (lines 252-279).
     *
     * Algorithm:
     * 1. Calculate cell size (panel width / grid size)
     * 2. Draw vertical lines at each grid boundary
     * 3. Draw horizontal lines at each grid boundary
     *
     * Note: The grid is drawn on top of the wavefunction, so it should be
     * rendered after the wavefunction panel in the render order.
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation (unused)
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        // Calculate cell size - panel is square and grid is square
        const cellSize = this.bounds.width / this.gridSize;

        ctx.save();

        // Set line style
        ctx.strokeStyle = this.config.lineColor;
        ctx.lineWidth = this.config.lineWidth;

        // Draw vertical lines
        for (let i = 0; i <= this.gridSize; i++) {
            const x = this.bounds.x + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, this.bounds.y);
            ctx.lineTo(x, this.bounds.y + this.bounds.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let i = 0; i <= this.gridSize; i++) {
            const y = this.bounds.y + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(this.bounds.x, y);
            ctx.lineTo(this.bounds.x + this.bounds.width, y);
            ctx.stroke();
        }

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

    /**
     * Updates the line color.
     *
     * @param {string} color - CSS color string
     */
    setLineColor(color) {
        this.config.lineColor = color;
    }

    /**
     * Updates the line width.
     *
     * @param {number} width - Line width in pixels
     */
    setLineWidth(width) {
        this.config.lineWidth = Math.max(0, width);
    }
}
