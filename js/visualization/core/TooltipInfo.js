/**
 * @file TooltipInfo.js
 * @description Data structure for tooltip information returned by panels.
 *
 * TooltipInfo encapsulates all the information needed to display a tooltip
 * when hovering over a panel. Panels can return null for no tooltip, or a
 * TooltipInfo instance with relevant data.
 */

/**
 * Information for displaying a tooltip over a panel.
 */
export class TooltipInfo {
    /**
     * Creates a new TooltipInfo instance.
     *
     * @param {Object} data - The data to display in the tooltip
     * @param {number} canvasX - X coordinate on canvas for tooltip positioning
     * @param {number} canvasY - Y coordinate on canvas for tooltip positioning
     *
     * @example
     * const tooltip = new TooltipInfo(
     *     { probability: 0.25, phase: 1.57 },
     *     150, 200
     * );
     */
    constructor(data, canvasX, canvasY) {
        /**
         * The data to display in the tooltip.
         * Structure is panel-specific.
         * @type {Object}
         */
        this.data = data;

        /**
         * X coordinate on canvas for tooltip positioning.
         * @type {number}
         */
        this.canvasX = canvasX;

        /**
         * Y coordinate on canvas for tooltip positioning.
         * @type {number}
         */
        this.canvasY = canvasY;
    }
}
