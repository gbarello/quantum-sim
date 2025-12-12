/**
 * visualization.js
 *
 * Visualizer class for rendering quantum wavefunction on HTML5 Canvas
 *
 * Color mapping (HSL):
 * - Hue (0-360�): Phase � = arg(�)
 *   - 0� (red): Real positive
 *   - 90� (yellow): Imaginary positive
 *   - 180� (cyan): Real negative
 *   - 270� (blue): Imaginary negative
 * - Saturation (0-100%): Amplitude |�|
 * - Lightness: Fixed at 50%
 */

export class Visualizer {
  /**
   * Create a new visualizer
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {QuantumSimulation} simulation - The quantum simulation instance
   */
  constructor(canvas, simulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.simulation = simulation;

    // Configuration
    this.config = {
      showGrid: false,
      showPhaseWheel: false,
      showPotential: false,
      visualizationMode: 'full', // 'full', 'probability', 'phase'
      saturationScale: 5.0, // Increased for much better visibility
      lightness: 50, // Fixed lightness at 50% (now variable in complexToColor)
      gridLineColor: 'rgba(255, 255, 255, 0.2)',
      gridLineWidth: 1,
      potentialColor: 'rgba(255, 255, 0, 0.3)' // Semi-transparent yellow
    };

    // Measurement feedback state
    this.measurementFeedback = {
      active: false,
      x: 0,
      y: 0,
      type: 'none', // 'positive', 'negative'
      startTime: 0,
      duration: 500 // milliseconds
    };

    // Hover state for measurement area preview
    this.hoverState = {
      active: false,
      x: 0,
      y: 0
    };

    // Animation frame tracking
    this.animationFrameId = null;
    this.isRendering = false;

    // Initialize canvas size
    this.resize();
  }

  /**
   * Resize canvas to match its display size
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Reset transform and scale context to account for device pixel ratio
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Store logical dimensions
    this.width = rect.width;
    this.height = rect.height;
  }

  /**
   * Convert complex wavefunction value to RGB color
   * @param {Object} psi - Complex number {re, im}
   * @returns {Array} [r, g, b] values (0-255)
   */
  complexToColor(psi) {
    // Calculate amplitude and phase
    const amplitude = Math.sqrt(psi.re * psi.re + psi.im * psi.im);
    const phase = Math.atan2(psi.im, psi.re); // Range: [-�, �]

    // Convert phase to hue (0-360�)
    // phase = -� maps to 180� (cyan, real negative)
    // phase = -�/2 maps to 270� (blue, imaginary negative)
    // phase = 0 maps to 0� (red, real positive)
    // phase = �/2 maps to 90� (yellow, imaginary positive)
    let hue = (phase * 180 / Math.PI + 360) % 360;

    // Apply contrast boost: use square root to compress dynamic range
    // This makes dim areas brighter while keeping bright areas bright
    const boostedAmplitude = Math.sqrt(amplitude);

    // Saturation based on amplitude (0-100%)
    // Scale amplitude to saturation percentage with high multiplier
    const saturation = Math.min(100, boostedAmplitude * this.config.saturationScale * 100);

    // Variable lightness based on amplitude for better contrast
    // Bright where amplitude is high, dark where it's low
    const lightness = 20 + Math.min(60, boostedAmplitude * this.config.saturationScale * 80);

    // Handle different visualization modes
    if (this.config.visualizationMode === 'probability') {
      // Grayscale based on probability density |�|�
      // Apply gamma correction for better visibility
      const probability = amplitude * amplitude;
      const boosted = Math.pow(probability * this.config.saturationScale * 50, 0.5);
      const gray = Math.floor(Math.min(255, boosted * 255));
      return [gray, gray, gray];
    } else if (this.config.visualizationMode === 'phase') {
      // Full saturation, amplitude affects lightness
      const phaseLightness = 20 + Math.min(60, boostedAmplitude * this.config.saturationScale * 80);
      return this.hslToRgb(hue, 100, phaseLightness);
    }

    // Default: full complex visualization
    return this.hslToRgb(hue, saturation, lightness);
  }

  /**
   * Convert HSL to RGB
   * @param {number} h - Hue (0-360)
   * @param {number} s - Saturation (0-100)
   * @param {number} l - Lightness (0-100)
   * @returns {Array} [r, g, b] values (0-255)
   */
  hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;

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

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  /**
   * Render the current simulation state to the canvas
   */
  render() {
    const gridSize = this.simulation.gridSize;
    const psi = this.simulation.psi;

    // Reserve space for potential plot on the right (if potential is active)
    const potentialType = this.simulation.potentialType || 'none';
    const hasPlot = (potentialType !== 'none');

    // Calculate square grid area (grid should be square)
    // Use canvas height as the basis to ensure grid stays square
    const gridSize_pixels = this.canvas.height;
    const plotWidth_pixels = hasPlot ? (this.canvas.width - gridSize_pixels) : 0;

    // Create image data
    const imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Calculate cell size - must be square
    const cellSize = gridSize_pixels / gridSize;

    // Render each grid cell
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        // Get wavefunction value at this grid point
        const psiValue = {
          re: psi.getRe(gx, gy),
          im: psi.getIm(gx, gy)
        };

        // Convert to color
        const [r, g, b] = this.complexToColor(psiValue);

        // Fill all pixels in this grid cell
        const startX = Math.floor(gx * cellSize);
        const startY = Math.floor(gy * cellSize);
        const endX = Math.floor((gx + 1) * cellSize);
        const endY = Math.floor((gy + 1) * cellSize);

        for (let py = startY; py < endY; py++) {
          for (let px = startX; px < endX; px++) {
            const pixelIdx = (py * this.canvas.width + px) * 4;
            data[pixelIdx] = r;
            data[pixelIdx + 1] = g;
            data[pixelIdx + 2] = b;
            data[pixelIdx + 3] = 255; // Full opacity
          }
        }
      }
    }

    // Put image data on canvas
    this.ctx.putImageData(imageData, 0, 0);

    // Draw grid overlay if enabled
    if (this.config.showGrid) {
      this.drawGrid();
    }

    // Draw potential profile on the edge if there's a potential
    this.drawPotentialProfile();

    // Draw measurement feedback if active
    if (this.measurementFeedback.active) {
      this.drawMeasurementFeedback();
    }

    // Draw phase wheel if enabled
    if (this.config.showPhaseWheel) {
      this.drawPhaseWheel();
    }

    // Draw hover measurement circle if active
    if (this.hoverState.active) {
      this.drawMeasurementCircle();
    }
  }

  /**
   * Draw grid overlay on the canvas
   */
  drawGrid() {
    const gridSize = this.simulation.gridSize;

    // Grid is square, based on canvas height
    const gridSize_pixels = this.height;
    const cellSize = gridSize_pixels / gridSize;

    this.ctx.strokeStyle = this.config.gridLineColor;
    this.ctx.lineWidth = this.config.gridLineWidth;

    // Draw vertical lines
    for (let i = 0; i <= gridSize; i++) {
      const x = i * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, gridSize_pixels);
      this.ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= gridSize; i++) {
      const y = i * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(gridSize_pixels, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw potential well overlay as a contour/heatmap
   */
  drawPotential() {
    const gridSize = this.simulation.gridSize;
    const potential = this.simulation.getPotential();

    // Find min/max potential for normalization
    let minV = Infinity;
    let maxV = -Infinity;
    for (let i = 0; i < potential.length; i++) {
      minV = Math.min(minV, potential[i]);
      maxV = Math.max(maxV, potential[i]);
    }

    const cellWidth = this.width / gridSize;
    const cellHeight = this.height / gridSize;

    // Draw as a semi-transparent overlay
    this.ctx.save();

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const V = potential[gy * gridSize + gx];

        // Normalize to 0-1 range (0 = max potential, 1 = min potential for wells)
        const normalized = (V - minV) / (maxV - minV);

        // For attractive wells (negative V), show yellow where V is most negative
        // Alpha varies with depth
        const alpha = Math.abs(1 - normalized) * 0.5; // Max alpha = 0.5

        if (alpha > 0.05) {
          const x = gx * cellWidth;
          const y = gy * cellHeight;

          this.ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
          this.ctx.fillRect(x, y, cellWidth, cellHeight);
        }
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw potential profile as a line plot to the right of the grid
   * Shows the potential along the horizontal centerline of the grid
   */
  drawPotentialProfile() {
    const gridSize = this.simulation.gridSize;
    const potential = this.simulation.getPotential();
    const potentialType = this.simulation.potentialType;

    // Skip if no potential or potentialType is undefined
    if (!potentialType || potentialType === 'none') {
      return;
    }

    // Get potential values along the vertical centerline
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
    if (Math.abs(maxV - minV) < 1e-10) {
      minV -= 1;
      maxV += 1;
    }

    // Calculate plot area (to the right of the square grid)
    const gridSize_pixels = this.height; // Grid is square, based on height
    const plotStartX = gridSize_pixels;
    const plotWidth = this.width - gridSize_pixels;
    const plotHeight = this.height;

    this.ctx.save();

    // No opaque background - plot is transparent showing the canvas background

    // Add small padding inside the plot area
    const padding = Math.max(5, plotWidth * 0.1);
    const plotAreaWidth = Math.max(10, plotWidth - 2 * padding);

    // Draw the potential profile as a thin red line
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
    this.ctx.lineWidth = 2;

    for (let i = 0; i < potentialProfile.length; i++) {
      const V = potentialProfile[i];

      // Normalize to 0-1 range (flip so negative potential extends right)
      const normalized = 1 - ((V - minV) / (maxV - minV));

      // Map to plot coordinates
      const x = plotStartX + padding + normalized * plotAreaWidth;
      const y = (i / (gridSize - 1)) * plotHeight;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();

    // Draw reference line at zero potential if it's in range
    if (minV <= 0 && maxV >= 0) {
      const zeroNormalized = 1 - ((0 - minV) / (maxV - minV));
      const zeroX = plotStartX + padding + zeroNormalized * plotAreaWidth;
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      this.ctx.moveTo(zeroX, 0);
      this.ctx.lineTo(zeroX, plotHeight);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Draw label for potential type
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    const label = potentialType.charAt(0).toUpperCase() + potentialType.slice(1);
    this.ctx.fillText(label, plotStartX + plotWidth / 2, 5);

    // Draw axis labels
    this.ctx.font = '8px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('V(x)', plotStartX + plotWidth / 2, plotHeight - 10);

    this.ctx.restore();
  }

  /**
   * Draw red circle showing measurement area at hover position
   */
  drawMeasurementCircle() {
    const { x, y } = this.hoverState;
    const gridSize = this.simulation.gridSize;

    // Grid is square, based on canvas height
    const gridSize_pixels = this.height;
    const cellSize = gridSize_pixels / gridSize;

    // Convert grid coordinates to canvas coordinates (center of cell)
    const canvasX = (x + 0.5) * cellSize;
    const canvasY = (y + 0.5) * cellSize;

    // Get measurement radius from simulation (in grid units)
    const measurementRadius = this.simulation.measurementRadiusMultiplier;

    // Convert to canvas pixels
    const radiusInPixels = measurementRadius * cellSize;

    // Draw red circle
    this.ctx.beginPath();
    this.ctx.arc(canvasX, canvasY, radiusInPixels, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  /**
   * Draw measurement feedback animation (flash/highlight)
   */
  drawMeasurementFeedback() {
    const currentTime = performance.now();
    const elapsed = currentTime - this.measurementFeedback.startTime;

    if (elapsed >= this.measurementFeedback.duration) {
      this.measurementFeedback.active = false;
      return;
    }

    // Calculate animation progress (0 to 1)
    const progress = elapsed / this.measurementFeedback.duration;

    // Fade out effect
    const alpha = 1 - progress;

    // Get grid coordinates
    const { x, y } = this.measurementFeedback;
    const gridSize = this.simulation.gridSize;

    // Grid is square, based on canvas height
    const gridSize_pixels = this.height;
    const cellSize = gridSize_pixels / gridSize;

    const canvasX = x * cellSize;
    const canvasY = y * cellSize;

    // Choose color based on measurement type
    let color;
    if (this.measurementFeedback.type === 'positive') {
      color = `rgba(0, 255, 0, ${alpha * 0.6})`; // Green for found
    } else if (this.measurementFeedback.type === 'negative') {
      color = `rgba(255, 0, 0, ${alpha * 0.6})`; // Red for not found
    } else {
      color = `rgba(255, 255, 255, ${alpha * 0.6})`; // White for neutral
    }

    // Draw highlight rectangle
    this.ctx.fillStyle = color;
    this.ctx.fillRect(canvasX, canvasY, cellSize, cellSize);

    // Draw border
    this.ctx.strokeStyle = color.replace(alpha * 0.6, alpha);
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(canvasX, canvasY, cellSize, cellSize);

    // Draw expanding circle for positive measurements
    if (this.measurementFeedback.type === 'positive') {
      const radius = cellSize * 0.5 * (1 + progress * 2);
      this.ctx.beginPath();
      this.ctx.arc(
        canvasX + cellSize / 2,
        canvasY + cellSize / 2,
        radius,
        0,
        Math.PI * 2
      );
      this.ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  /**
   * Draw phase wheel reference indicator
   */
  drawPhaseWheel() {
    const wheelRadius = 40;
    const wheelX = this.width - wheelRadius - 20;
    const wheelY = wheelRadius + 20;

    // Draw colored wheel
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 90) * Math.PI / 180;
      const endAngle = (angle - 89) * Math.PI / 180;

      const [r, g, b] = this.hslToRgb(angle, 100, 50);

      this.ctx.beginPath();
      this.ctx.moveTo(wheelX, wheelY);
      this.ctx.arc(wheelX, wheelY, wheelRadius, startAngle, endAngle);
      this.ctx.closePath();
      this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      this.ctx.fill();
    }

    // Draw border
    this.ctx.beginPath();
    this.ctx.arc(wheelX, wheelY, wheelRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw labels
    this.ctx.fillStyle = 'white';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Label positions
    const labelRadius = wheelRadius + 15;
    const labels = [
      { text: 'Re+', angle: 0 },
      { text: 'Im+', angle: 90 },
      { text: 'Re-', angle: 180 },
      { text: 'Im-', angle: 270 }
    ];

    labels.forEach(({ text, angle }) => {
      const rad = (angle - 90) * Math.PI / 180;
      const x = wheelX + Math.cos(rad) * labelRadius;
      const y = wheelY + Math.sin(rad) * labelRadius;
      this.ctx.fillText(text, x, y);
    });
  }

  /**
   * Start measurement feedback animation
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   * @param {string} type - 'positive' or 'negative'
   * @param {number} duration - Animation duration in ms (default 500)
   */
  showMeasurementFeedback(x, y, type, duration = 500) {
    this.measurementFeedback = {
      active: true,
      x,
      y,
      type,
      startTime: performance.now(),
      duration
    };
  }

  /**
   * Start continuous rendering using requestAnimationFrame
   * @param {Function} callback - Optional callback to run each frame
   */
  startRenderLoop(callback) {
    if (this.isRendering) return;

    this.isRendering = true;

    const renderFrame = () => {
      if (!this.isRendering) return;

      this.render();

      if (callback) {
        callback();
      }

      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    renderFrame();
  }

  /**
   * Stop the render loop
   */
  stopRenderLoop() {
    this.isRendering = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Convert canvas coordinates to grid coordinates
   * @param {number} canvasX - X coordinate on canvas
   * @param {number} canvasY - Y coordinate on canvas
   * @returns {Object} {x, y} grid coordinates
   */
  canvasToGrid(canvasX, canvasY) {
    const gridSize = this.simulation.gridSize;

    // Grid is square, based on canvas height
    const gridSize_pixels = this.height;
    const cellSize = gridSize_pixels / gridSize;

    return {
      x: Math.floor(canvasX / cellSize),
      y: Math.floor(canvasY / cellSize)
    };
  }

  /**
   * Get probability at canvas coordinates
   * @param {number} canvasX - X coordinate on canvas
   * @param {number} canvasY - Y coordinate on canvas
   * @returns {number} Probability |�|� at that location
   */
  getProbabilityAt(canvasX, canvasY) {
    const { x, y } = this.canvasToGrid(canvasX, canvasY);

    // Check bounds
    if (x < 0 || x >= this.simulation.gridSize ||
        y < 0 || y >= this.simulation.gridSize) {
      return 0;
    }

    return this.simulation.getProbabilityAt(x, y);
  }

  /**
   * Toggle grid overlay
   * @param {boolean} show - Whether to show grid
   */
  setGridVisible(show) {
    this.config.showGrid = show;
  }

  /**
   * Toggle phase wheel reference
   * @param {boolean} show - Whether to show phase wheel
   */
  setPhaseWheelVisible(show) {
    this.config.showPhaseWheel = show;
  }

  /**
   * Toggle potential well visualization
   * @param {boolean} show - Whether to show potential well overlay
   */
  setPotentialVisible(show) {
    this.config.showPotential = show;
  }

  /**
   * Set visualization mode
   * @param {string} mode - 'full', 'probability', or 'phase'
   */
  setVisualizationMode(mode) {
    if (['full', 'probability', 'phase'].includes(mode)) {
      this.config.visualizationMode = mode;
    }
  }

  /**
   * Set saturation scale
   * @param {number} scale - Saturation multiplier (default 1.0)
   */
  setSaturationScale(scale) {
    this.config.saturationScale = Math.max(0, scale);
  }

  /**
   * Set hover state for measurement circle
   * @param {boolean} active - Whether mouse is hovering
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   */
  setHoverState(active, x = 0, y = 0) {
    this.hoverState.active = active;
    this.hoverState.x = x;
    this.hoverState.y = y;
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stopRenderLoop();
  }
}

export default Visualizer;
