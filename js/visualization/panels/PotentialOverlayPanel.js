/**
 * @file PotentialOverlayPanel.js
 * @description Panel for overlaying the 2D potential energy landscape on the wavefunction grid.
 *
 * The PotentialOverlayPanel displays the full 2D potential V(x,y) as a semi-transparent
 * colored overlay on top of the wavefunction visualization, allowing users to see the
 * structure of potential wells, barriers, and other features.
 *
 * Features:
 * - Semi-transparent colored overlay (red for positive potential, blue for negative)
 * - Automatic normalization and scaling
 * - Alpha channel based on potential strength
 * - Blends with underlying wavefunction visualization
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering the 2D potential energy as an overlay.
 *
 * The potential is rendered as a blue overlay where:
 * - All non-zero potential appears in cyan-blue
 * - Opacity varies with potential magnitude (stronger = more opaque)
 * - Zero potential is fully transparent (shows wavefunction underneath)
 * - Allows simultaneous visualization of wavefunction and potential structure
 */
export class PotentialOverlayPanel extends Panel {
    /**
     * Creates a new PotentialOverlayPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels
     * @param {number} bounds.height - Height in pixels
     * @param {Object} config - Configuration options
     * @param {number} config.opacity - Maximum opacity for the overlay (default: 0.5)
     *
     * @example
     * const panel = new PotentialOverlayPanel(
     *     { x: 0, y: 0, width: 512, height: 512 },
     *     { opacity: 0.5 }
     * );
     */
    constructor(bounds, config = {}) {
        super('potentialOverlay', bounds);

        /**
         * Configuration for overlay rendering.
         * @type {Object}
         */
        this.config = {
            opacity: config.opacity !== undefined ? config.opacity : 0.5
        };
    }

    /**
     * Renders the 2D potential overlay to the canvas using ImageData.
     *
     * Algorithm:
     * 1. Get potential array from simulation
     * 2. Find min/max for normalization
     * 3. Create ImageData buffer for the panel bounds
     * 4. For each grid cell (gx, gy):
     *    a. Get potential value V(gx, gy)
     *    b. Normalize to 0 to 1 range based on magnitude
     *    c. Map to cyan-blue color
     *    d. Set alpha based on normalized magnitude (0 = transparent, 1 = opaque)
     *    e. Fill all pixels in that cell with the color
     * 5. Put ImageData on canvas at panel position
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        const potentialType = simulation.potentialType;

        // Skip if no potential or potentialType is none
        if (!potentialType || potentialType === 'none') {
            return;
        }

        const gridSize = simulation.gridSize;
        const potential = simulation.getPotential();

        // Find min/max for normalization
        let minV = Infinity;
        let maxV = -Infinity;
        for (let i = 0; i < potential.length; i++) {
            const V = potential[i];
            if (V < minV) minV = V;
            if (V > maxV) maxV = V;
        }

        // If potential is essentially flat, don't render anything
        if (Math.abs(maxV - minV) < 1e-10) {
            return;
        }

        // Get the current transform to extract the DPR scaling
        const transform = ctx.getTransform();
        const dpr = transform.a; // Assumes uniform scaling

        // Calculate physical dimensions
        const physicalWidth = Math.floor(this.bounds.width * dpr);
        const physicalHeight = Math.floor(this.bounds.height * dpr);

        // Read existing canvas pixels so we can blend with them
        const imageData = ctx.getImageData(
            this.bounds.x * dpr,
            this.bounds.y * dpr,
            physicalWidth,
            physicalHeight
        );
        const data = imageData.data;

        // Calculate cell size in physical pixels
        const cellWidth = physicalWidth / gridSize;
        const cellHeight = physicalHeight / gridSize;

        // Fill the ImageData buffer
        // Strategy: Minimum potential is transparent, values > min+1 are fully opaque
        for (let gy = 0; gy < gridSize; gy++) {
            for (let gx = 0; gx < gridSize; gx++) {
                const V = potential[gy * gridSize + gx];

                // Subtract minimum to get relative potential
                const relativeV = V - minV;

                // Calculate color based on relative potential
                // Smooth blue gradient from 0 to 10, white above 10
                let r, g, b, a;
                const maxBlueValue = 10.0;  // Maximum value for blue gradient

                if (relativeV < 1e-10) {
                    // At minimum - fully transparent
                    r = 0;
                    g = 0;
                    b = 0;
                    a = 0;
                } else if (relativeV >= maxBlueValue) {
                    // Value >= 10 - show as white, fully opaque
                    r = 255;
                    g = 255;
                    b = 255;
                    a = Math.floor(this.config.opacity * 255);
                } else {
                    // 0 < value < 10 - smooth gradient from dark blue to bright blue
                    const normalized = relativeV / maxBlueValue;  // 0 to 1 scale

                    // Blue gradient: dark blue (0, 50, 150) -> bright cyan-blue (100, 180, 255)
                    // Increases brightness smoothly as potential increases
                    r = Math.floor(normalized * 100);
                    g = Math.floor(50 + normalized * 130);
                    b = Math.floor(150 + normalized * 105);
                    a = Math.floor(this.config.opacity * 255);
                }

                // Fill all pixels in this grid cell by blending with existing pixels
                const startX = Math.floor(gx * cellWidth);
                const endX = Math.floor((gx + 1) * cellWidth);
                const startY = Math.floor(gy * cellHeight);
                const endY = Math.floor((gy + 1) * cellHeight);

                // Only blend if there's something to draw (alpha > 0)
                if (a > 0) {
                    const srcAlpha = a / 255.0; // Normalize to 0-1
                    for (let py = startY; py < endY && py < physicalHeight; py++) {
                        for (let px = startX; px < endX && px < physicalWidth; px++) {
                            const index = (py * physicalWidth + px) * 4;

                            // Read existing pixel (destination)
                            const destR = data[index];
                            const destG = data[index + 1];
                            const destB = data[index + 2];
                            const destA = data[index + 3] / 255.0;

                            // Alpha blend: result = source * srcAlpha + dest * (1 - srcAlpha)
                            data[index] = Math.floor(r * srcAlpha + destR * (1 - srcAlpha));
                            data[index + 1] = Math.floor(g * srcAlpha + destG * (1 - srcAlpha));
                            data[index + 2] = Math.floor(b * srcAlpha + destB * (1 - srcAlpha));
                            // Keep destination alpha or blend it
                            data[index + 3] = Math.floor(255 * (srcAlpha + destA * (1 - srcAlpha)));
                        }
                    }
                }
                // If a == 0, don't modify the pixels at all (leave wavefunction visible)
            }
        }

        // Put ImageData on canvas at panel position
        // Note: putImageData ignores transformations, so we use physical coordinates
        ctx.putImageData(
            imageData,
            this.bounds.x * dpr,
            this.bounds.y * dpr
        );
    }
}
