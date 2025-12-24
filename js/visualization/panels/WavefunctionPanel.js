/**
 * @file WavefunctionPanel.js
 * @description Panel for rendering the quantum wavefunction using complex-to-color mapping.
 *
 * The WavefunctionPanel is the core visualization component that renders the complex-valued
 * wavefunction ψ(x,y) to the canvas using a sophisticated color mapping scheme:
 * - Phase (arg(ψ)) maps to hue (0-360°)
 * - Amplitude (|ψ|) maps to both saturation and lightness
 * - Supports multiple visualization modes: full complex, probability only, phase only
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
 * Panel for rendering the quantum wavefunction with complex-to-color mapping.
 *
 * Supports three visualization modes:
 * - 'full': Full complex visualization (phase → hue, amplitude → saturation/lightness)
 * - 'probability': Grayscale probability density |ψ|²
 * - 'phase': Phase only with fixed saturation
 *
 * The rendering is pixel-perfect identical to the original Visualizer implementation.
 */
export class WavefunctionPanel extends Panel {
    /**
     * Creates a new WavefunctionPanel.
     *
     * @param {Object} bounds - The rectangular bounds of this panel
     * @param {number} bounds.x - Left edge in canvas coordinates
     * @param {number} bounds.y - Top edge in canvas coordinates
     * @param {number} bounds.width - Width in pixels (must be square with height)
     * @param {number} bounds.height - Height in pixels (must be square with width)
     * @param {Object} config - Configuration options
     * @param {string} config.visualizationMode - Visualization mode: 'full', 'probability', or 'phase'
     * @param {number} config.saturationScale - Saturation multiplier for better visibility (default: 5.0)
     *
     * @example
     * const panel = new WavefunctionPanel(
     *     { x: 0, y: 0, width: 512, height: 512 },
     *     { visualizationMode: 'full', saturationScale: 5.0 }
     * );
     */
    constructor(bounds, config = {}) {
        super('wavefunction', bounds);

        /**
         * Configuration for wavefunction rendering.
         * @type {Object}
         */
        this.config = {
            visualizationMode: config.visualizationMode || 'full',
            saturationScale: config.saturationScale !== undefined ? config.saturationScale : 5.0
        };

        /**
         * Current hover position in grid coordinates (null if not hovering).
         * Used for displaying probability tooltips.
         * @type {{x: number, y: number}|null}
         * @private
         */
        this._hoverGridCoords = null;
    }

    /**
     * Renders the wavefunction to the canvas using ImageData.
     *
     * This method performs pixel-perfect rendering identical to the original
     * Visualizer implementation. It creates an ImageData buffer, fills it with
     * colors computed from the complex wavefunction values, and puts it on the canvas.
     *
     * Algorithm:
     * 1. Create ImageData buffer for the panel bounds
     * 2. Calculate cell size (panel width / grid size)
     * 3. For each grid cell (gx, gy):
     *    a. Get complex wavefunction value ψ(gx, gy)
     *    b. Convert to RGB color using complexToColor()
     *    c. Fill all pixels in that cell with the color
     * 4. Put ImageData on canvas at panel position
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
     * @param {QuantumSimulation} simulation - The quantum simulation
     * @param {number} time - Current time (unused, for interface compatibility)
     */
    render(ctx, simulation, time) {
        const gridSize = simulation.gridSize;
        const psi = simulation.psi;

        // IMPORTANT: ImageData and putImageData work in PHYSICAL pixels (ignoring canvas transforms).
        // We need to account for the device pixel ratio that was applied to the context.
        // The bounds are in logical pixels, but ImageData needs physical pixels.

        // Get the current transform to extract the DPR scaling
        const transform = ctx.getTransform();
        const dpr = transform.a; // Assumes uniform scaling (a == d)

        // Calculate physical pixel dimensions
        const physicalWidth = Math.round(this.bounds.width * dpr);
        const physicalHeight = Math.round(this.bounds.height * dpr);
        const physicalX = Math.round(this.bounds.x * dpr);
        const physicalY = Math.round(this.bounds.y * dpr);

        // Create ImageData for this panel's PHYSICAL dimensions
        const imageData = ctx.createImageData(physicalWidth, physicalHeight);
        const data = imageData.data;

        // Calculate cell size in physical pixels
        const cellSize = physicalWidth / gridSize;

        // Get dx for normalization relative to grid spacing
        const dx = simulation.dx;

        // Render each grid cell
        for (let gy = 0; gy < gridSize; gy++) {
            for (let gx = 0; gx < gridSize; gx++) {
                // Get complex wavefunction value at this grid point
                const psiValue = {
                    re: psi.getRe(gx, gy),
                    im: psi.getIm(gx, gy)
                };

                // Convert complex value to RGB color (with dx-relative normalization)
                const [r, g, b] = this.complexToColor(psiValue, dx, gridSize);

                // Calculate pixel range for this grid cell (in physical pixels)
                const startX = Math.floor(gx * cellSize);
                const startY = Math.floor(gy * cellSize);
                const endX = Math.floor((gx + 1) * cellSize);
                const endY = Math.floor((gy + 1) * cellSize);

                // Fill all pixels in this grid cell with the computed color
                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        // Calculate pixel index in ImageData (using physical width as stride)
                        // ImageData is row-major: [r, g, b, a, r, g, b, a, ...]
                        const pixelIdx = (py * physicalWidth + px) * 4;
                        data[pixelIdx] = r;
                        data[pixelIdx + 1] = g;
                        data[pixelIdx + 2] = b;
                        data[pixelIdx + 3] = 255; // Full opacity
                    }
                }
            }
        }

        // Put the ImageData on the canvas at the panel's PHYSICAL position
        // Note: putImageData ignores the current transform and writes directly to canvas pixels
        ctx.putImageData(imageData, physicalX, physicalY);
    }

    /**
     * Converts a complex wavefunction value to an RGB color.
     *
     * This is the core color mapping algorithm that visualizes complex numbers:
     * - Phase (angle in complex plane) → Hue (0-360°)
     * - Amplitude (magnitude) → Saturation and Lightness
     *
     * The mapping includes several enhancements:
     * - Probability density normalization: amplitude is |ψ|/dx (not |ψ|*dx)
     * - This accounts for discrete normalization (Σ|ψ|² = 1) scaling as |ψ| ~ dx
     * - Makes brightness grid-independent regardless of grid size or dx
     * - Brightness scale constant ensures perceptible colors
     * - Square root boost (gamma correction) for amplitude to improve visibility of dim regions
     * - Configurable saturation scale for better contrast
     * - Variable lightness based on amplitude
     *
     * Color wheel mapping:
     * - 0° (red): Real positive
     * - 90° (yellow): Imaginary positive
     * - 180° (cyan): Real negative
     * - 270° (blue): Imaginary negative
     *
     * @param {Object} psi - Complex wavefunction value
     * @param {number} psi.re - Real part
     * @param {number} psi.im - Imaginary part
     * @param {number} dx - Grid spacing (for consistent normalization)
     * @param {number} gridSize - Grid size (for brightness compensation)
     * @returns {Array<number>} [r, g, b] color values (0-255)
     *
     * @example
     * // Real positive number
     * const color1 = panel.complexToColor({ re: 1.0, im: 0.0 }, 0.078, 128);
     * // Returns reddish color [~255, ~128, ~128]
     *
     * // Imaginary positive number
     * const color2 = panel.complexToColor({ re: 0.0, im: 1.0 }, 0.078, 128);
     * // Returns yellowish color [~255, ~255, ~128]
     */
    complexToColor(psi, dx, gridSize) {
        // Calculate amplitude (magnitude) and phase (angle)
        // The wavefunction uses discrete normalization: Σ|ψ|² = 1
        // For a Gaussian with physical width σ, this gives |ψ| ~ dx/σ
        // To get grid-independent visualization, we scale as probability density: |ψ|/dx
        const rawAmplitude = Math.sqrt(psi.re * psi.re + psi.im * psi.im);
        const amplitude = rawAmplitude / dx;  // Division, not multiplication!
        const phase = Math.atan2(psi.im, psi.re); // Range: [-π, π]

        // Convert phase to hue (0-360°)
        // phase = -π maps to 180° (cyan, real negative)
        // phase = -π/2 maps to 270° (blue, imaginary negative)
        // phase = 0 maps to 0° (red, real positive)
        // phase = π/2 maps to 90° (yellow, imaginary positive)
        let hue = (phase * 180 / Math.PI + 360) % 360;

        // Brightness scale constant (tuned for good visibility)
        // Since we divide by dx, amplitude represents probability density (grid-independent)
        const brightnessScale = 1;

        // Handle different visualization modes
        if (this.config.visualizationMode === 'probability') {
            // Grayscale based on probability density |ψ|²
            // Apply gamma correction for better visibility
            const probability = amplitude * amplitude;
            const boosted = Math.pow(probability * this.config.saturationScale * brightnessScale, 0.5);
            const gray = Math.floor(Math.min(255, boosted * 255));
            return [gray, gray, gray];
        }

        // For 'full' and 'phase' modes: match the contrast of probability mode
        // Use the same gamma correction and scaling as probability mode
        const probability = amplitude * amplitude;
        const boosted = Math.pow(probability * this.config.saturationScale * brightnessScale, 0.5);

        // Convert to lightness (0-100 range for HSL)
        // Map the same way probability maps to gray, but to lightness scale
        const lightness = Math.min(100, boosted * 100);

        if (this.config.visualizationMode === 'phase') {
            // Full saturation, amplitude affects lightness (matching probability contrast)
            return this.hslToRgb(hue, 100, lightness);
        }

        // Default: full complex visualization with high saturation for vibrant colors
        return this.hslToRgb(hue, 100, lightness);
    }

    /**
     * Converts HSL color to RGB.
     *
     * This is a standard HSL to RGB conversion algorithm.
     * HSL (Hue, Saturation, Lightness) is more intuitive for the complex-to-color
     * mapping than RGB, so we compute HSL values and convert to RGB for rendering.
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

    /**
     * Converts canvas coordinates to grid indices.
     *
     * This method maps a point on the canvas to the corresponding grid cell.
     * It accounts for the panel's position on the canvas and the cell size.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @param {number} gridSize - Size of the simulation grid (N×N)
     * @returns {Object} Grid coordinates
     * @returns {number} return.x - Grid X index (0 to gridSize-1)
     * @returns {number} return.y - Grid Y index (0 to gridSize-1)
     *
     * @example
     * const gridCoords = panel.canvasToGrid(256, 256, 128);
     * console.log(`Grid cell: (${gridCoords.x}, ${gridCoords.y})`);
     */
    canvasToGrid(canvasX, canvasY, gridSize) {
        // Convert to panel-local coordinates
        const local = this.canvasToLocal(canvasX, canvasY);

        // Calculate cell size (same calculation as in render)
        const cellSize = this.bounds.width / gridSize;

        // Map local coordinates to grid indices
        return {
            x: Math.floor(local.x / cellSize),
            y: Math.floor(local.y / cellSize)
        };
    }

    /**
     * Handles mouse move events to provide probability tooltips.
     *
     * When the mouse hovers over the wavefunction panel, this method
     * calculates the probability |ψ|² at that location and returns
     * tooltip information to display it.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @param {QuantumSimulation} simulation - The quantum simulation
     * @returns {TooltipInfo|null} Tooltip with probability information
     *
     * @example
     * const tooltip = panel.handleMouseMove(150, 200, simulation);
     * if (tooltip) {
     *     console.log(`Probability: ${tooltip.data.probability}`);
     * }
     */
    handleMouseMove(canvasX, canvasY, simulation) {
        // Convert canvas coordinates to grid indices
        const gridCoords = this.canvasToGrid(canvasX, canvasY, simulation.gridSize);

        // Check bounds
        if (gridCoords.x < 0 || gridCoords.x >= simulation.gridSize ||
            gridCoords.y < 0 || gridCoords.y >= simulation.gridSize) {
            this._hoverGridCoords = null;
            return null;
        }

        // Store hover position for potential future use
        this._hoverGridCoords = gridCoords;

        // Get probability at this location
        const probability = simulation.getProbabilityAt(gridCoords.x, gridCoords.y);

        // Return tooltip information
        return new TooltipInfo(
            {
                probability: probability,
                text: `P = ${(probability * 100).toFixed(2)}%`,
                gridX: gridCoords.x,
                gridY: gridCoords.y
            },
            canvasX,
            canvasY
        );
    }

    /**
     * Handles click events (currently not implemented).
     *
     * Click handling is typically managed at the Controller level,
     * but this method is provided for future extensibility.
     *
     * @param {number} canvasX - X coordinate in canvas space
     * @param {number} canvasY - Y coordinate in canvas space
     * @param {QuantumSimulation} simulation - The quantum simulation
     * @returns {boolean} False (clicks not handled by panel itself)
     */
    handleClick(canvasX, canvasY, simulation) {
        // Click handling is managed by Controller, not the panel
        // Return false to indicate we didn't handle the click
        return false;
    }

    /**
     * Gets the current hover position in grid coordinates.
     *
     * @returns {{x: number, y: number}|null} Grid coordinates or null if not hovering
     */
    getHoverGridCoords() {
        return this._hoverGridCoords;
    }

    /**
     * Sets the visualization mode.
     *
     * @param {string} mode - 'full', 'probability', or 'phase'
     */
    setVisualizationMode(mode) {
        if (['full', 'probability', 'phase'].includes(mode)) {
            this.config.visualizationMode = mode;
        }
    }

    /**
     * Sets the saturation scale.
     *
     * @param {number} scale - Saturation multiplier (typically 1.0 to 10.0)
     */
    setSaturationScale(scale) {
        this.config.saturationScale = Math.max(0, scale);
    }
}
