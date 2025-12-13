/**
 * @file PhaseWheelPanel.js
 * @description Panel for rendering a color wheel legend showing phase mapping.
 *
 * The PhaseWheelPanel displays a circular color wheel that serves as a legend
 * for the wavefunction visualization. It shows how complex phase values map to
 * colors, helping users interpret the wavefunction colors.
 *
 * Features:
 * - Full HSL color wheel (360° of hues)
 * - Labels for key phase angles (Re+, Im+, Re-, Im-)
 * - Circular gradient visualization
 * - Positioned in corner of canvas
 * - Semi-transparent labels for visibility
 *
 * This implementation is extracted from the monolithic Visualizer class to enable
 * better modularity and testability.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering a phase wheel color legend.
 *
 * The phase wheel is a circular display that maps phase angles to colors:
 * - 0° (red): Real positive
 * - 90° (yellow): Imaginary positive
 * - 180° (cyan): Real negative
 * - 270° (blue): Imaginary negative
 *
 * This matches the color scheme used in the wavefunction visualization.
 *
 * Rendering is pixel-perfect identical to the original Visualizer.drawPhaseWheel()
 * implementation (lines 525-573).
 */
export class PhaseWheelPanel extends Panel {
    /**
     * Creates a new PhaseWheelPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels
     * @param {number} bounds.height - Height in pixels
     *
     * @example
     * const panel = new PhaseWheelPanel({
     *     x: 700, y: 20, width: 80, height: 80
     * });
     */
    constructor(bounds) {
        super('phaseWheel', bounds);
    }

    /**
     * Renders the phase wheel to the canvas.
     *
     * This method draws a circular color wheel with labels indicating the
     * mapping between phase angles and colors.
     *
     * The rendering is identical to the original Visualizer.drawPhaseWheel()
     * implementation (lines 525-573).
     *
     * Algorithm:
     * 1. Calculate center and radius from bounds
     * 2. Draw 360 wedges, one for each degree
     * 3. For each wedge:
     *    a. Calculate start and end angles (rotated -90° to start at top)
     *    b. Convert hue to RGB using HSL
     *    c. Draw filled wedge
     * 4. Draw white border around wheel
     * 5. Draw labels at key angles (0°, 90°, 180°, 270°)
     *
     * Note: Angles are rotated -90° to start at top (0° = up) instead of right.
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation (unused)
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        // Calculate center and radius from bounds
        const centerX = this.bounds.x + this.bounds.width / 2;
        const centerY = this.bounds.y + this.bounds.height / 2;
        const radius = Math.min(this.bounds.width, this.bounds.height) / 2 - 5;

        ctx.save();

        // Draw colored wheel using 360 wedges (one per degree)
        for (let angle = 0; angle < 360; angle += 1) {
            // Calculate wedge angles (rotate -90° to start at top)
            const startAngle = (angle - 90) * Math.PI / 180;
            const endAngle = (angle - 89) * Math.PI / 180;

            // Convert hue to RGB (full saturation, 50% lightness)
            const [r, g, b] = this.hslToRgb(angle, 100, 50);

            // Draw wedge
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();
        }

        // Draw white border around wheel
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw labels for key phase angles
        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Label positions (slightly outside the wheel)
        const labelRadius = radius + 15;
        const labels = [
            { text: 'Re+', angle: 0 },      // Real positive (red)
            { text: 'Im+', angle: 90 },     // Imaginary positive (yellow)
            { text: 'Re-', angle: 180 },    // Real negative (cyan)
            { text: 'Im-', angle: 270 }     // Imaginary negative (blue)
        ];

        labels.forEach(({ text, angle }) => {
            // Convert angle to radians (rotate -90° to match wheel orientation)
            const rad = (angle - 90) * Math.PI / 180;
            const x = centerX + Math.cos(rad) * labelRadius;
            const y = centerY + Math.sin(rad) * labelRadius;
            ctx.fillText(text, x, y);
        });

        ctx.restore();
    }

    /**
     * Converts HSL color to RGB.
     *
     * This is a standard HSL to RGB conversion algorithm, identical to the
     * one used in WavefunctionPanel.
     *
     * @param {number} h - Hue (0-360°)
     * @param {number} s - Saturation (0-100%)
     * @param {number} l - Lightness (0-100%)
     * @returns {Array<number>} [r, g, b] color values (0-255)
     *
     * @example
     * const red = panel.hslToRgb(0, 100, 50);      // [255, 0, 0]
     * const yellow = panel.hslToRgb(60, 100, 50);  // [255, 255, 0]
     * const cyan = panel.hslToRgb(180, 100, 50);   // [0, 255, 255]
     */
    hslToRgb(h, s, l) {
        // Normalize s and l to 0-1 range
        s /= 100;
        l /= 100;

        // Calculate chroma (color intensity)
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;

        let r, g, b;

        // Map hue to RGB based on which 60° sector we're in
        if (h < 60) {
            [r, g, b] = [c, x, 0];
        } else if (h < 120) {
            [r, g, b] = [x, c, 0];
        } else if (h < 180) {
            [r, g, b] = [0, c, x];
        } else if (h < 240) {
            [r, g, b] = [0, x, c];
        } else if (h < 300) {
            [r, g, b] = [x, 0, c];
        } else {
            [r, g, b] = [c, 0, x];
        }

        // Convert to 0-255 range and apply lightness offset
        return [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
        ];
    }
}
