/**
 * @file MeasurementFeedbackPanel.js
 * @description Panel for rendering animated feedback after quantum measurements.
 *
 * The MeasurementFeedbackPanel provides visual feedback when a measurement is performed.
 * It shows a fading colored highlight at the measured location, with different colors
 * and animations based on whether the measurement was positive or negative.
 *
 * Features:
 * - Fading colored highlights (green for positive, red for negative)
 * - Expanding circle animation for positive measurements
 * - Configurable animation duration
 * - Time-based animation using performance.now()
 * - Automatic deactivation when animation completes
 *
 * This implementation is extracted from the monolithic Visualizer class to enable
 * better modularity and testability.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering animated measurement feedback.
 *
 * The feedback consists of a fading colored rectangle at the measured grid cell,
 * with an optional expanding circle for positive measurements. The animation
 * automatically completes after the specified duration.
 *
 * Rendering is pixel-perfect identical to the original Visualizer.drawMeasurementFeedback()
 * implementation (lines 460-520).
 */
export class MeasurementFeedbackPanel extends Panel {
    /**
     * Creates a new MeasurementFeedbackPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels (should match wavefunction panel)
     * @param {number} bounds.height - Height in pixels (should match wavefunction panel)
     * @param {number} gridSize - Number of grid cells (N×N)
     *
     * @example
     * const panel = new MeasurementFeedbackPanel(
     *     { x: 0, y: 0, width: 512, height: 512 },
     *     128
     * );
     */
    constructor(bounds, gridSize) {
        super('measurementFeedback', bounds);

        /**
         * Number of grid cells in each dimension.
         * Used to calculate cell size for positioning the feedback.
         * @type {number}
         */
        this.gridSize = gridSize;

        /**
         * Current feedback state.
         * @type {Object}
         * @private
         */
        this._feedbackState = {
            active: false,      // Whether feedback animation is active
            x: 0,               // Grid X coordinate
            y: 0,               // Grid Y coordinate
            type: 'none',       // 'positive', 'negative', or 'none'
            startTime: 0,       // Animation start time (performance.now())
            duration: 500       // Animation duration in milliseconds
        };
    }

    /**
     * Starts a measurement feedback animation.
     *
     * This method initiates the feedback animation at the specified grid location
     * with the given type and duration.
     *
     * @param {number} gridX - Grid X coordinate (0 to gridSize-1)
     * @param {number} gridY - Grid Y coordinate (0 to gridSize-1)
     * @param {string} type - Feedback type: 'positive' (particle found) or 'negative' (not found)
     * @param {number} duration - Animation duration in milliseconds (default: 500)
     *
     * @example
     * panel.showFeedback(64, 64, 'positive', 500);
     */
    showFeedback(gridX, gridY, type, duration = 500) {
        this._feedbackState = {
            active: true,
            x: gridX,
            y: gridY,
            type,
            startTime: performance.now(),
            duration
        };
    }

    /**
     * Clears the current feedback animation.
     *
     * This method immediately stops any active feedback animation.
     */
    clearFeedback() {
        this._feedbackState.active = false;
    }

    /**
     * Checks if a feedback animation is currently active.
     *
     * @returns {boolean} True if feedback is active
     */
    isActive() {
        return this._feedbackState.active;
    }

    /**
     * Renders the measurement feedback animation to the canvas.
     *
     * This method draws a fading colored highlight at the measured location.
     * The animation includes:
     * - Fading colored rectangle (green for positive, red for negative)
     * - Border around the rectangle
     * - Expanding circle for positive measurements
     *
     * The rendering is identical to the original Visualizer.drawMeasurementFeedback()
     * implementation (lines 460-520).
     *
     * Algorithm:
     * 1. Check if feedback is active
     * 2. Calculate elapsed time and progress (0 to 1)
     * 3. If animation complete, deactivate and return
     * 4. Calculate fade effect (alpha = 1 - progress)
     * 5. Draw colored rectangle at grid cell
     * 6. Draw border around rectangle
     * 7. For positive measurements, draw expanding circle
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation (unused)
     * @param {number} time - Current time from performance.now()
     */
    render(ctx, simulation, time) {
        // Skip if feedback is not active
        if (!this._feedbackState.active) {
            return;
        }

        // Calculate elapsed time and check if animation is complete
        const elapsed = time - this._feedbackState.startTime;

        if (elapsed >= this._feedbackState.duration) {
            // Animation complete, deactivate
            this._feedbackState.active = false;
            return;
        }

        // Calculate animation progress (0 to 1)
        const progress = elapsed / this._feedbackState.duration;

        // Fade out effect
        const alpha = 1 - progress;

        // Get feedback position
        const { x, y, type } = this._feedbackState;

        // Calculate cell size and canvas position
        const cellSize = this.bounds.width / this.gridSize;
        const canvasX = this.bounds.x + x * cellSize;
        const canvasY = this.bounds.y + y * cellSize;

        ctx.save();

        // Choose color based on measurement type
        let color;
        if (type === 'positive') {
            color = `rgba(0, 255, 0, ${alpha * 0.6})`; // Green for found
        } else if (type === 'negative') {
            color = `rgba(255, 0, 0, ${alpha * 0.6})`; // Red for not found
        } else {
            color = `rgba(255, 255, 255, ${alpha * 0.6})`; // White for neutral
        }

        // Draw highlight rectangle
        ctx.fillStyle = color;
        ctx.fillRect(canvasX, canvasY, cellSize, cellSize);

        // Draw border around rectangle
        // Note: replace() is used to change just the alpha component of the color string
        ctx.strokeStyle = color.replace(alpha * 0.6, alpha);
        ctx.lineWidth = 2;
        ctx.strokeRect(canvasX, canvasY, cellSize, cellSize);

        // Draw expanding circle for positive measurements
        if (type === 'positive') {
            // Circle expands from 0.5 to 2.5 cell sizes over the animation
            const radius = cellSize * 0.5 * (1 + progress * 2);

            ctx.beginPath();
            ctx.arc(
                canvasX + cellSize / 2,
                canvasY + cellSize / 2,
                radius,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
            ctx.lineWidth = 2;
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
     * Gets the current feedback state (for testing/debugging).
     *
     * @returns {Object} The current feedback state
     */
    getFeedbackState() {
        return { ...this._feedbackState };
    }
}
