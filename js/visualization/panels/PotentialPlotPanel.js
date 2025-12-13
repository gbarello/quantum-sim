/**
 * @file PotentialPlotPanel.js
 * @description Panel for rendering the potential energy profile as a line plot.
 *
 * The PotentialPlotPanel displays the potential energy V(x,y) as a line graph
 * showing the profile along the vertical centerline of the simulation grid.
 * This provides a clear visualization of potential wells, barriers, and other
 * potential structures in the quantum system.
 *
 * Features:
 * - Line plot of potential profile along centerline
 * - Automatic normalization and scaling
 * - Zero reference line when applicable
 * - Labeled with potential type
 * - Tooltip showing potential value at hover position
 *
 * This implementation is extracted from the monolithic Visualizer class to enable
 * better modularity, testability, and maintainability.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';
import { TooltipInfo } from '../core/TooltipInfo.js';

/**
 * Panel for rendering the potential energy profile as a line plot.
 *
 * The potential is sampled along the vertical centerline of the grid and
 * displayed as a red line graph. The plot automatically normalizes the
 * potential range to fit within the panel bounds with appropriate padding.
 *
 * Visualization details:
 * - Red line shows potential profile (opacity 0.9)
 * - Dashed white line at V=0 if zero is in range
 * - Label at top showing potential type
 * - Axis label at bottom
 * - Automatic scaling to fit potential range
 *
 * The rendering is pixel-perfect identical to the original Visualizer implementation.
 */
export class PotentialPlotPanel extends Panel {
    /**
     * Creates a new PotentialPlotPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels
     * @param {number} bounds.height - Height in pixels
     *
     * @example
     * const panel = new PotentialPlotPanel({
     *     x: 512, y: 0, width: 100, height: 512
     * });
     */
    constructor(bounds) {
        super('potentialPlot', bounds);

        /**
         * Internal padding for the plot area.
         * Calculated as max(5px, 10% of width) to provide breathing room.
         * @type {number}
         * @private
         */
        this._padding = null; // Calculated in render() based on current bounds

        /**
         * Current potential profile data (cached for tooltip).
         * Array of potential values along the vertical centerline.
         * @type {number[]|null}
         * @private
         */
        this._cachedProfile = null;

        /**
         * Cached min and max values of potential (for tooltip).
         * @type {{min: number, max: number}|null}
         * @private
         */
        this._cachedRange = null;

        /**
         * Cached potential type (for tooltip).
         * @type {string|null}
         * @private
         */
        this._cachedPotentialType = null;
    }

    /**
     * Renders the potential profile to the canvas as a line plot.
     *
     * This method performs pixel-perfect rendering identical to the original
     * Visualizer.drawPotentialProfile() implementation.
     *
     * Algorithm:
     * 1. Check if potential exists and is not 'none'
     * 2. Extract potential values along vertical centerline
     * 3. Find min/max for normalization
     * 4. Calculate plot area with padding
     * 5. Draw red line showing potential profile
     * 6. Draw zero reference line if V=0 is in range
     * 7. Draw labels for potential type and axis
     *
     * Note on coordinate flipping:
     * The normalization formula (1 - ...) flips the coordinate so that
     * negative potentials (wells) extend to the right, matching intuition
     * about attractive potentials being "deeper".
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        const potentialType = simulation.potentialType;

        // Skip if no potential or potentialType is undefined/none
        if (!potentialType || potentialType === 'none') {
            // Clear cached data
            this._cachedProfile = null;
            this._cachedRange = null;
            this._cachedPotentialType = null;
            return;
        }

        const gridSize = simulation.gridSize;
        const potential = simulation.getPotential();

        // Extract potential profile along the vertical centerline
        const centerX = Math.floor(gridSize / 2);
        const potentialProfile = [];

        for (let gy = 0; gy < gridSize; gy++) {
            const V = potential[gy * gridSize + centerX];
            potentialProfile.push(V);
        }

        // Find min/max for normalization
        let minV = Math.min(...potentialProfile);
        let maxV = Math.max(...potentialProfile);

        // Add small padding to avoid division by zero
        // If range is too small, artificially expand it
        if (Math.abs(maxV - minV) < 1e-10) {
            minV -= 1;
            maxV += 1;
        }

        // Cache for tooltip
        this._cachedProfile = potentialProfile;
        this._cachedRange = { min: minV, max: maxV };
        this._cachedPotentialType = potentialType;

        // Calculate padding (matching original implementation)
        const plotWidth = this.bounds.width;
        const plotHeight = this.bounds.height;
        const padding = Math.max(5, plotWidth * 0.1);
        this._padding = padding;

        // Calculate plot area with padding
        const plotAreaWidth = Math.max(10, plotWidth - 2 * padding);

        ctx.save();

        // No opaque background - plot is transparent showing the canvas background
        // (matching original implementation)

        // Draw the potential profile as a thin red line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
        ctx.lineWidth = 2;

        for (let i = 0; i < potentialProfile.length; i++) {
            const V = potentialProfile[i];

            // Normalize to 0-1 range (flip so negative potential extends right)
            // This matches the original implementation exactly
            const normalized = 1 - ((V - minV) / (maxV - minV));

            // Map to plot coordinates
            const x = this.bounds.x + padding + normalized * plotAreaWidth;
            const y = this.bounds.y + (i / (gridSize - 1)) * plotHeight;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();

        // Draw reference line at zero potential if it's in range
        if (minV <= 0 && maxV >= 0) {
            const zeroNormalized = 1 - ((0 - minV) / (maxV - minV));
            const zeroX = this.bounds.x + padding + zeroNormalized * plotAreaWidth;

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(zeroX, this.bounds.y);
            ctx.lineTo(zeroX, this.bounds.y + plotHeight);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash pattern
        }

        // Draw label for potential type
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = potentialType.charAt(0).toUpperCase() + potentialType.slice(1);
        ctx.fillText(label, this.bounds.x + plotWidth / 2, this.bounds.y + 5);

        // Draw axis label
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V(x)', this.bounds.x + plotWidth / 2, this.bounds.y + plotHeight - 10);

        ctx.restore();
    }

    /**
     * Handles mouse move events to show potential value at the hovered Y position.
     *
     * When the user hovers over the potential plot panel, this method calculates
     * the corresponding grid Y coordinate and returns the potential value at that
     * position along the centerline.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @param {QuantumSimulation} simulation - The quantum simulation for data access
     * @returns {TooltipInfo|null} Tooltip with potential value, or null if no potential
     *
     * @example
     * const tooltip = panel.handleMouseMove(600, 250, simulation);
     * if (tooltip) {
     *     console.log(tooltip.data); // { V: "1.23" }
     * }
     */
    handleMouseMove(canvasX, canvasY, simulation) {
        // No tooltip if no potential
        if (!this._cachedProfile || !this._cachedRange || !this._cachedPotentialType) {
            return null;
        }

        // Convert to local coordinates
        const local = this.canvasToLocal(canvasX, canvasY);

        // Calculate Y fraction (0 at top, 1 at bottom)
        const yFraction = local.y / this.bounds.height;

        // Clamp to valid range
        if (yFraction < 0 || yFraction > 1) {
            return null;
        }

        // Calculate grid Y coordinate
        const gridSize = simulation.gridSize;
        const gridY = Math.floor(yFraction * gridSize);

        // Clamp to valid grid range
        const clampedGridY = Math.max(0, Math.min(gridSize - 1, gridY));

        // Get potential value from cached profile
        const V = this._cachedProfile[clampedGridY];

        // Return tooltip with potential value
        // Position tooltip slightly offset from cursor
        return new TooltipInfo(
            { V: V.toFixed(2) },
            canvasX + 10,
            canvasY + 10
        );
    }

    /**
     * Updates the bounds of this panel.
     *
     * Overrides the base class method to clear cached data when bounds change.
     * This ensures the plot is recalculated with correct dimensions.
     *
     * @param {Object} newBounds - The new bounds for this panel
     */
    updateBounds(newBounds) {
        super.updateBounds(newBounds);

        // Clear cached data when bounds change
        this._cachedProfile = null;
        this._cachedRange = null;
        this._cachedPotentialType = null;
        this._padding = null;
    }
}
