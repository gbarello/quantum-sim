/**
 * @file Wavefunction1DPlotPanel.js
 * @description Bottom panel displaying 1D plot of wavefunction components along a user-selected line.
 *
 * This panel renders a live 1D plot showing the real, imaginary, and magnitude
 * components of the wavefunction along a line defined by two points selected
 * by the user. The plot updates every frame as the simulation evolves.
 *
 * Features:
 * - Three curves: real (red), imaginary (blue), magnitude (green)
 * - Bilinear interpolation for smooth sampling (200 samples default)
 * - Auto-scaling Y-axis based on data range
 * - Axis labels and tick marks
 * - Color-coded legend
 * - Dark background for contrast
 * - Empty state message when no line is selected
 *
 * The panel reads line parameters from a shared LineSelectionState object
 * and samples the wavefunction from the quantum simulation.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { Panel } from '../core/Panel.js';

/**
 * Panel for rendering 1D wavefunction plot along a selected line.
 *
 * Samples the complex wavefunction at evenly-spaced points along the line
 * and displays the real part, imaginary part, and magnitude as separate curves.
 * Uses bilinear interpolation for smooth sampling between grid points.
 *
 * Layout:
 * - Dark background (#1a1a1a) for contrast
 * - Padding: left=50px (for Y labels), right=20px, top=20px, bottom=40px (for X labels)
 * - Grid lines for readability
 * - Axes with tick marks and labels
 * - Legend in top-right corner
 *
 * Performance:
 * - 200 bilinear interpolations per frame
 * - ~0.5ms on modern hardware
 * - Efficient enough for real-time updates
 *
 * @extends Panel
 */
export class Wavefunction1DPlotPanel extends Panel {
  /**
   * Creates a new Wavefunction1DPlotPanel.
   *
   * @param {Object} bounds - The rectangular bounds of this panel
   * @param {number} bounds.x - Left edge in canvas coordinates
   * @param {number} bounds.y - Top edge in canvas coordinates
   * @param {number} bounds.width - Width in pixels
   * @param {number} bounds.height - Height in pixels
   * @param {LineSelectionState} selectionState - Shared state object for line parameters
   *
   * @example
   * const panel = new Wavefunction1DPlotPanel(
   *   { x: 0, y: 512, width: 512, height: 150 },
   *   lineSelectionState
   * );
   */
  constructor(bounds, selectionState) {
    super('wavefunction1DPlot', bounds);

    /**
     * Shared state object for line selection.
     * @type {LineSelectionState}
     */
    this.selectionState = selectionState;

    // Layout configuration
    /**
     * Padding around plot area for labels and axes.
     * @type {{left: number, right: number, top: number, bottom: number}}
     * @private
     */
    this.padding = { left: 50, right: 20, top: 20, bottom: 40 };

    // Styling configuration
    /**
     * Background color for panel (dark for contrast).
     * @type {string}
     * @private
     */
    this.backgroundColor = '#1a1a1a';

    /**
     * Color for grid lines (subtle white).
     * @type {string}
     * @private
     */
    this.gridColor = 'rgba(255, 255, 255, 0.1)';

    /**
     * Color for axes (semi-transparent white).
     * @type {string}
     * @private
     */
    this.axisColor = 'rgba(255, 255, 255, 0.5)';

    /**
     * Color for text labels (mostly opaque white).
     * @type {string}
     * @private
     */
    this.textColor = 'rgba(255, 255, 255, 0.8)';

    /**
     * Colors for each curve type.
     * @type {{real: string, imaginary: string, magnitude: string}}
     * @private
     */
    this.colors = {
      real: '#ff4444',       // Red
      imaginary: '#4444ff',  // Blue
      magnitude: '#44ff44'   // Green
    };

    // Sampling configuration
    /**
     * Number of samples to take along the line.
     * More samples = smoother curves but higher computational cost.
     * @type {number}
     * @private
     */
    this.numSamples = 200;
  }

  /**
   * Renders the 1D wavefunction plot.
   *
   * If no line is selected, shows an empty state message. Otherwise, samples
   * the wavefunction along the line and renders three curves with axes, labels,
   * and legend.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {QuantumSimulation} simulation - The quantum simulation
   * @param {number} time - Current simulation time (unused)
   */
  render(ctx, simulation, time) {
    if (!this.selectionState.hasCompleteLine()) {
      this._drawEmptyState(ctx);
      return;
    }

    ctx.save();

    // Draw background
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    // Calculate plot area (excluding padding for labels)
    const plotArea = {
      x: this.bounds.x + this.padding.left,
      y: this.bounds.y + this.padding.top,
      width: this.bounds.width - this.padding.left - this.padding.right,
      height: this.bounds.height - this.padding.top - this.padding.bottom
    };

    // Sample wavefunction along the line
    const samples = this._sampleAlongLine(simulation);
    const dataRange = this._getDataRange(samples);

    // Draw plot elements in order (back to front)
    this._drawGrid(ctx, plotArea, dataRange);
    this._drawAxes(ctx, plotArea, dataRange);
    this._drawCurve(ctx, plotArea, samples.real, dataRange, this.colors.real);
    this._drawCurve(ctx, plotArea, samples.imaginary, dataRange, this.colors.imaginary);
    this._drawCurve(ctx, plotArea, samples.magnitude, dataRange, this.colors.magnitude);
    this._drawLabels(ctx, plotArea);
    this._drawLegend(ctx, plotArea);

    ctx.restore();
  }

  /**
   * Draws empty state message when no line is selected.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @private
   */
  _drawEmptyState(ctx) {
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Select a line to display 1D plot',
      this.bounds.x + this.bounds.width / 2,
      this.bounds.y + this.bounds.height / 2
    );
  }

  /**
   * Samples wavefunction along the selected line using bilinear interpolation.
   *
   * Takes evenly-spaced samples along the line from point 1 to point 2,
   * extracting real, imaginary, and magnitude components at each point.
   *
   * @param {QuantumSimulation} simulation - The quantum simulation
   * @returns {{real: number[], imaginary: number[], magnitude: number[]}} Sampled values
   * @private
   */
  _sampleAlongLine(simulation) {
    const line = this.selectionState.getLine();
    const psi = simulation.psi;
    const gridSize = simulation.gridSize;

    const real = [];
    const imaginary = [];
    const magnitude = [];

    for (let i = 0; i < this.numSamples; i++) {
      // Parameter t from 0 to 1 along the line
      const t = i / (this.numSamples - 1);

      // Linear interpolation for position along line
      const gx = line.x1 + t * (line.x2 - line.x1);
      const gy = line.y1 + t * (line.y2 - line.y1);

      // Bilinear interpolation for wavefunction value
      const psiValue = this._bilinearInterpolate(psi, gx, gy, gridSize);

      real.push(psiValue.re);
      imaginary.push(psiValue.im);
      magnitude.push(Math.sqrt(psiValue.re * psiValue.re + psiValue.im * psiValue.im));
    }

    return { real, imaginary, magnitude };
  }

  /**
   * Performs bilinear interpolation of complex wavefunction.
   *
   * Given fractional grid coordinates (gx, gy), interpolates between the
   * four surrounding grid points to get a smooth value.
   *
   * @param {ComplexGrid} psi - Wavefunction grid
   * @param {number} gx - X coordinate in grid space (can be fractional)
   * @param {number} gy - Y coordinate in grid space (can be fractional)
   * @param {number} gridSize - Size of grid (number of cells in each dimension)
   * @returns {{re: number, im: number}} Interpolated complex value
   * @private
   */
  _bilinearInterpolate(psi, gx, gy, gridSize) {
    // Clamp to valid range
    gx = Math.max(0, Math.min(gridSize - 1.001, gx));
    gy = Math.max(0, Math.min(gridSize - 1.001, gy));

    // Get integer part (cell indices)
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(x0 + 1, gridSize - 1);
    const y1 = Math.min(y0 + 1, gridSize - 1);

    // Get fractional part (position within cell)
    const fx = gx - x0;
    const fy = gy - y0;

    // Get corner values
    const c00_re = psi.getRe(x0, y0);
    const c00_im = psi.getIm(x0, y0);
    const c10_re = psi.getRe(x1, y0);
    const c10_im = psi.getIm(x1, y0);
    const c01_re = psi.getRe(x0, y1);
    const c01_im = psi.getIm(x0, y1);
    const c11_re = psi.getRe(x1, y1);
    const c11_im = psi.getIm(x1, y1);

    // Bilinear interpolation formula
    const re = (1 - fx) * (1 - fy) * c00_re +
               fx * (1 - fy) * c10_re +
               (1 - fx) * fy * c01_re +
               fx * fy * c11_re;

    const im = (1 - fx) * (1 - fy) * c00_im +
               fx * (1 - fy) * c10_im +
               (1 - fx) * fy * c01_im +
               fx * fy * c11_im;

    return { re, im };
  }

  /**
   * Calculates the data range for auto-scaling the Y-axis.
   *
   * Finds the min and max values across all curves and adds 10% padding
   * for visual breathing room.
   *
   * @param {{real: number[], imaginary: number[], magnitude: number[]}} samples - Sampled data
   * @returns {{min: number, max: number}} Data range with padding
   * @private
   */
  _getDataRange(samples) {
    const allValues = [...samples.real, ...samples.imaginary, ...samples.magnitude];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    const padding = range * 0.1;

    return { min: min - padding, max: max + padding };
  }

  /**
   * Draws background grid lines for readability.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {Object} plotArea - Plot area bounds
   * @param {Object} dataRange - Data range for scaling
   * @private
   */
  _drawGrid(ctx, plotArea, dataRange) {
    ctx.strokeStyle = this.gridColor;
    ctx.lineWidth = 1;

    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 4; i++) {
      const y = plotArea.y + (i / 4) * plotArea.height;
      ctx.beginPath();
      ctx.moveTo(plotArea.x, y);
      ctx.lineTo(plotArea.x + plotArea.width, y);
      ctx.stroke();
    }

    // Vertical grid lines (11 lines for 10 divisions)
    for (let i = 0; i <= 10; i++) {
      const x = plotArea.x + (i / 10) * plotArea.width;
      ctx.beginPath();
      ctx.moveTo(x, plotArea.y);
      ctx.lineTo(x, plotArea.y + plotArea.height);
      ctx.stroke();
    }
  }

  /**
   * Draws axes with tick marks and numeric labels.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {Object} plotArea - Plot area bounds
   * @param {Object} dataRange - Data range for Y-axis labels
   * @private
   */
  _drawAxes(ctx, plotArea, dataRange) {
    ctx.strokeStyle = this.axisColor;
    ctx.fillStyle = this.textColor;
    ctx.lineWidth = 2;
    ctx.font = '11px sans-serif';

    // Draw axes
    ctx.beginPath();
    // X-axis (bottom)
    ctx.moveTo(plotArea.x, plotArea.y + plotArea.height);
    ctx.lineTo(plotArea.x + plotArea.width, plotArea.y + plotArea.height);
    // Y-axis (left)
    ctx.moveTo(plotArea.x, plotArea.y);
    ctx.lineTo(plotArea.x, plotArea.y + plotArea.height);
    ctx.stroke();

    // Y-axis labels (5 labels)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = plotArea.y + (i / 4) * plotArea.height;
      const value = dataRange.max - (i / 4) * (dataRange.max - dataRange.min);
      ctx.fillText(value.toFixed(2), plotArea.x - 5, y);
    }

    // X-axis labels (3 labels: 0%, 50%, 100%)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0%', plotArea.x, plotArea.y + plotArea.height + 5);
    ctx.fillText('50%', plotArea.x + plotArea.width / 2, plotArea.y + plotArea.height + 5);
    ctx.fillText('100%', plotArea.x + plotArea.width, plotArea.y + plotArea.height + 5);
  }

  /**
   * Draws a single curve (real, imaginary, or magnitude).
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {Object} plotArea - Plot area bounds
   * @param {number[]} data - Data values to plot
   * @param {Object} dataRange - Data range for Y-axis scaling
   * @param {string} color - Stroke color for this curve
   * @private
   */
  _drawCurve(ctx, plotArea, data, dataRange, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      // X position along plot area
      const x = plotArea.x + (i / (data.length - 1)) * plotArea.width;

      // Normalize Y value to [0, 1] range, then flip (0 = top, 1 = bottom)
      const normalizedY = (data[i] - dataRange.min) / (dataRange.max - dataRange.min);
      const y = plotArea.y + plotArea.height - normalizedY * plotArea.height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  /**
   * Draws axis labels.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {Object} plotArea - Plot area bounds
   * @private
   */
  _drawLabels(ctx, plotArea) {
    ctx.fillStyle = this.textColor;
    ctx.font = 'bold 12px sans-serif';

    // X-axis label (centered at bottom)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      'Distance along line',
      plotArea.x + plotArea.width / 2,
      this.bounds.y + this.bounds.height - 5
    );

    // Y-axis label (rotated, centered on left)
    ctx.save();
    ctx.translate(this.bounds.x + 15, plotArea.y + plotArea.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ψ value', 0, 0);
    ctx.restore();
  }

  /**
   * Draws color-coded legend showing which curve is which.
   *
   * @param {CanvasRenderingContext2D} ctx - The canvas 2D context
   * @param {Object} plotArea - Plot area bounds
   * @private
   */
  _drawLegend(ctx, plotArea) {
    const legendX = plotArea.x + plotArea.width - 150;
    const legendY = plotArea.y + 10;
    const lineLength = 20;
    const lineSpacing = 20;

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const items = [
      { color: this.colors.real, label: 'Real' },
      { color: this.colors.imaginary, label: 'Imaginary' },
      { color: this.colors.magnitude, label: 'Magnitude' }
    ];

    items.forEach((item, i) => {
      const y = legendY + i * lineSpacing;

      // Draw colored line
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX, y);
      ctx.lineTo(legendX + lineLength, y);
      ctx.stroke();

      // Draw label text
      ctx.fillStyle = this.textColor;
      ctx.fillText(item.label, legendX + lineLength + 5, y);
    });
  }
}
