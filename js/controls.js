/**
 * Controller class - handles user interaction and coordinates between simulation and visualization
 *
 * Responsibilities:
 * - Canvas click/touch events for measurements
 * - Play/Pause button control
 * - Reset button
 * - Speed control slider (adjusts stepsPerFrame)
 * - Grid size selector
 * - Visualization mode toggles
 * - Touch events for mobile support
 * - Keyboard shortcuts (space for play/pause, R for reset)
 * - Display measurement results and probability
 * - Update UI stats (total probability, time elapsed)
 */

export class Controller {
  /**
   * @param {QuantumSimulation} simulation - The quantum simulation instance
   * @param {Visualizer} visualizer - The visualizer instance
   * @param {Object} uiElements - Object containing references to UI elements
   * @param {HTMLCanvasElement} uiElements.canvas - Main canvas element
   * @param {HTMLButtonElement} uiElements.playPauseBtn - Play/pause button
   * @param {HTMLButtonElement} uiElements.resetBtn - Reset button
   * @param {HTMLInputElement} uiElements.speedSlider - Speed control slider
   * @param {HTMLElement} uiElements.speedValue - Speed display element
   * @param {HTMLSelectElement} uiElements.gridSizeSelect - Grid size selector
   * @param {HTMLElement} uiElements.totalProbDisplay - Total probability display
   * @param {HTMLElement} uiElements.timeDisplay - Time elapsed display
   * @param {HTMLElement} uiElements.measurementResult - Measurement result message
   * @param {HTMLElement} uiElements.hoverProbability - Hover probability tooltip
   * @param {Object} uiElements.vizModeToggles - Visualization mode toggle buttons
   */
  constructor(simulation, visualizer, uiElements) {
    this.simulation = simulation;
    this.visualizer = visualizer;
    this.ui = uiElements;

    // State
    this.isPlaying = true;
    this.stepsPerFrame = 5; // Default physics steps per render frame
    this.gridSize = simulation.gridSize;
    this.measurementInProgress = false;
    this.measurementResultTimeout = null;

    // Timing for stats
    this.elapsedTime = 0;
    this.lastStatsUpdate = 0;
    this.statsUpdateInterval = 100; // Update stats every 100ms

    // Canvas interaction state
    this.isHovering = false;
    this.hoverPosition = { x: 0, y: 0 };

    // Bind methods to maintain context
    this.handleCanvasClick = this.handleCanvasClick.bind(this);
    this.handleCanvasMove = this.handleCanvasMove.bind(this);
    this.handleCanvasLeave = this.handleCanvasLeave.bind(this);
    this.handlePlayPause = this.handlePlayPause.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleSpeedControl = this.handleSpeedControl.bind(this);
    this.handleMeasurementRadiusControl = this.handleMeasurementRadiusControl.bind(this);
    this.handleGridSizeChange = this.handleGridSizeChange.bind(this);
    this.handlePotentialTypeChange = this.handlePotentialTypeChange.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    // Setup event listeners
    this.setupEventListeners();

    // Initial UI update
    this.updateUI();
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Canvas events
    if (this.ui.canvas) {
      this.ui.canvas.addEventListener('click', this.handleCanvasClick);
      this.ui.canvas.addEventListener('mousemove', this.handleCanvasMove);
      this.ui.canvas.addEventListener('mouseleave', this.handleCanvasLeave);

      // Touch events for mobile
      this.ui.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.ui.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.ui.canvas.addEventListener('touchend', this.handleTouchEnd);
    }

    // Button events
    if (this.ui.playPauseBtn) {
      this.ui.playPauseBtn.addEventListener('click', this.handlePlayPause);
    }

    if (this.ui.resetBtn) {
      this.ui.resetBtn.addEventListener('click', this.handleReset);
    }

    // Speed slider
    if (this.ui.speedSlider) {
      this.ui.speedSlider.addEventListener('input', this.handleSpeedControl);
    }

    // Measurement radius slider
    if (this.ui.measurementRadiusSlider) {
      this.ui.measurementRadiusSlider.addEventListener('input', this.handleMeasurementRadiusControl);
    }

    // Potential type radio buttons
    const potentialRadios = document.querySelectorAll('input[name="potential-type"]');
    potentialRadios.forEach(radio => {
      radio.addEventListener('change', this.handlePotentialTypeChange.bind(this));
    });

    // Grid size selector
    if (this.ui.gridSizeSelect) {
      this.ui.gridSizeSelect.addEventListener('change', this.handleGridSizeChange);
    }

    // Visualization mode select
    if (this.ui.vizModeSelect) {
      this.ui.vizModeSelect.addEventListener('change', this.handleVizModeChange.bind(this));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyPress);
  }

  /**
   * Remove all event listeners (cleanup)
   */
  removeEventListeners() {
    if (this.ui.canvas) {
      this.ui.canvas.removeEventListener('click', this.handleCanvasClick);
      this.ui.canvas.removeEventListener('mousemove', this.handleCanvasMove);
      this.ui.canvas.removeEventListener('mouseleave', this.handleCanvasLeave);
      this.ui.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.ui.canvas.removeEventListener('touchmove', this.handleTouchMove);
      this.ui.canvas.removeEventListener('touchend', this.handleTouchEnd);
    }

    if (this.ui.playPauseBtn) {
      this.ui.playPauseBtn.removeEventListener('click', this.handlePlayPause);
    }

    if (this.ui.resetBtn) {
      this.ui.resetBtn.removeEventListener('click', this.handleReset);
    }

    if (this.ui.speedSlider) {
      this.ui.speedSlider.removeEventListener('input', this.handleSpeedControl);
    }

    if (this.ui.gridSizeSelect) {
      this.ui.gridSizeSelect.removeEventListener('change', this.handleGridSizeChange);
    }

    document.removeEventListener('keydown', this.handleKeyPress);
  }

  /**
   * Convert canvas pixel coordinates to grid coordinates
   * @param {number} canvasX - X coordinate on canvas
   * @param {number} canvasY - Y coordinate on canvas
   * @returns {{x: number, y: number}} Grid coordinates
   */
  canvasToGridCoords(canvasX, canvasY) {
    const rect = this.ui.canvas.getBoundingClientRect();
    const scaleX = this.ui.canvas.width / rect.width;
    const scaleY = this.ui.canvas.height / rect.height;

    // Convert to canvas coordinates
    const x = (canvasX - rect.left) * scaleX;
    const y = (canvasY - rect.top) * scaleY;

    // Convert to grid coordinates
    const gridX = Math.floor(x / this.ui.canvas.width * this.gridSize);
    const gridY = Math.floor(y / this.ui.canvas.height * this.gridSize);

    // Clamp to valid range
    return {
      x: Math.max(0, Math.min(this.gridSize - 1, gridX)),
      y: Math.max(0, Math.min(this.gridSize - 1, gridY))
    };
  }

  /**
   * Handle canvas click event - perform measurement
   * @param {MouseEvent} event - Click event
   */
  handleCanvasClick(event) {
    if (this.measurementInProgress) return;

    const coords = this.canvasToGridCoords(event.clientX, event.clientY);
    this.performMeasurement(coords.x, coords.y);
  }

  /**
   * Handle canvas mousemove - show probability at cursor
   * @param {MouseEvent} event - Move event
   */
  handleCanvasMove(event) {
    const coords = this.canvasToGridCoords(event.clientX, event.clientY);
    this.hoverPosition = coords;
    this.isHovering = true;

    // Update visualizer hover state to show measurement circle
    if (this.visualizer) {
      this.visualizer.setHoverState(true, coords.x, coords.y);
    }

    if (this.ui.hoverProbability) {
      const probability = this.simulation.getProbabilityAt(coords.x, coords.y);
      this.ui.hoverProbability.textContent = `P = ${(probability * 100).toFixed(2)}%`;
      this.ui.hoverProbability.style.display = 'block';

      // Position tooltip near cursor
      const rect = this.ui.canvas.getBoundingClientRect();
      this.ui.hoverProbability.style.left = `${event.clientX - rect.left + 10}px`;
      this.ui.hoverProbability.style.top = `${event.clientY - rect.top + 10}px`;
    }
  }

  /**
   * Handle canvas mouseleave - hide probability tooltip
   */
  handleCanvasLeave() {
    this.isHovering = false;

    // Update visualizer to hide measurement circle
    if (this.visualizer) {
      this.visualizer.setHoverState(false);
    }

    if (this.ui.hoverProbability) {
      this.ui.hoverProbability.style.display = 'none';
    }
  }

  /**
   * Handle touch start event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.handleCanvasMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  /**
   * Handle touch move event
   * @param {TouchEvent} event - Touch event
   */
  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.handleCanvasMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  /**
   * Handle touch end event - perform measurement
   * @param {TouchEvent} event - Touch event
   */
  handleTouchEnd(event) {
    event.preventDefault();
    if (event.changedTouches.length > 0 && this.isHovering) {
      this.performMeasurement(this.hoverPosition.x, this.hoverPosition.y);
    }
    this.handleCanvasLeave();
  }

  /**
   * Perform measurement at grid position (x, y)
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   */
  async performMeasurement(x, y) {
    if (this.measurementInProgress) return;

    this.measurementInProgress = true;

    // Get probability before measurement
    const probability = this.simulation.getProbabilityAt(x, y);

    // Perform measurement
    const result = this.simulation.measure(x, y);

    // Display result
    this.displayMeasurementResult(result, probability, x, y);

    // Show measurement feedback animation (no pause)
    if (this.visualizer && this.visualizer.showMeasurementFeedback) {
      this.visualizer.showMeasurementFeedback(x, y, result.found ? 'positive' : 'negative', 500);
    }

    this.measurementInProgress = false;
  }

  /**
   * Display measurement result message
   * @param {Object} result - Measurement result from simulation
   * @param {boolean} result.found - Whether particle was found
   * @param {number} result.probability - Probability at measurement location
   * @param {number} probability - Pre-measurement probability
   * @param {number} x - Grid x coordinate
   * @param {number} y - Grid y coordinate
   */
  displayMeasurementResult(result, probability, x, y) {
    if (!this.ui.measurementResult) return;

    const probPercent = (probability * 100).toFixed(2);

    if (result.found) {
      this.ui.measurementResult.innerHTML = `
        <div class="measurement-found">
          <strong>Found!</strong> at (${x}, ${y})<br>
          Probability was: ${probPercent}%
        </div>
      `;
      this.ui.measurementResult.className = 'measurement-result found';
    } else {
      this.ui.measurementResult.innerHTML = `
        <div class="measurement-not-found">
          <strong>Not Found!</strong> at (${x}, ${y})<br>
          Probability was: ${probPercent}%
        </div>
      `;
      this.ui.measurementResult.className = 'measurement-result not-found';
    }

    this.ui.measurementResult.style.display = 'block';

    // Clear previous timeout if exists
    if (this.measurementResultTimeout) {
      clearTimeout(this.measurementResultTimeout);
    }

    // Auto-hide after 3 seconds
    this.measurementResultTimeout = setTimeout(() => {
      if (this.ui.measurementResult) {
        this.ui.measurementResult.style.display = 'none';
      }
    }, 3000);
  }

  /**
   * Handle play/pause button
   */
  handlePlayPause() {
    this.isPlaying = !this.isPlaying;
    this.updatePlayPauseButton();
  }

  /**
   * Update play/pause button text
   */
  updatePlayPauseButton() {
    if (this.ui.playPauseBtn) {
      this.ui.playPauseBtn.textContent = this.isPlaying ? 'Pause' : 'Play';
      this.ui.playPauseBtn.setAttribute('aria-label', this.isPlaying ? 'Pause simulation' : 'Play simulation');
    }
  }

  /**
   * Handle reset button - reinitialize simulation
   */
  handleReset() {
    // Reset simulation to initial state
    if (this.simulation && this.simulation.initialize) {
      this.simulation.initialize();
    }

    // Reset elapsed time
    this.elapsedTime = 0;

    // Clear any measurement messages
    if (this.ui.measurementResult) {
      this.ui.measurementResult.style.display = 'none';
    }

    // Clear highlights
    if (this.visualizer && this.visualizer.clearHighlight) {
      this.visualizer.clearHighlight();
    }

    // Update UI
    this.updateUI();

    // Resume playing if was paused
    this.isPlaying = true;
    this.updatePlayPauseButton();
  }

  /**
   * Handle speed control slider
   * @param {Event} event - Input event
   */
  handleSpeedControl(event) {
    const sliderValue = parseInt(event.target.value, 10);
    // Map slider value (-10 to 10) to timeScale (0.01 to 1.0) on log scale
    // value = 0 -> timeScale = 0.1
    // value = -10 -> timeScale = 0.01
    // value = 10 -> timeScale = 1.0
    const timeScale = Math.pow(10, sliderValue / 10 - 1);

    // Update simulation time scale
    this.simulation.setTimeScale(timeScale);

    if (this.ui.speedValue) {
      this.ui.speedValue.textContent = `${timeScale.toFixed(2)}x`;
    }
  }

  /**
   * Handle measurement radius control slider
   * @param {Event} event - Input event
   */
  handleMeasurementRadiusControl(event) {
    const sliderValue = parseInt(event.target.value, 10);
    // Map slider value (0 to 200) to radius (1 to 100) logarithmically
    // value = 0 -> radius = 1
    // value = 100 -> radius = 10 (default)
    // value = 200 -> radius = 100
    const radius = Math.pow(10, sliderValue / 100);

    // Update simulation measurement radius
    this.simulation.setMeasurementRadius(radius);

    if (this.ui.measurementRadiusValue) {
      this.ui.measurementRadiusValue.textContent = radius.toFixed(1);
    }
  }

  /**
   * Handle potential type change from radio buttons
   * @param {Event} event - Change event
   */
  handlePotentialTypeChange(event) {
    const potentialType = event.target.value;
    this.simulation.setPotentialType(potentialType);
  }

  /**
   * Handle grid size change
   * @param {Event} event - Change event
   */
  handleGridSizeChange(event) {
    const newSize = parseInt(event.target.value, 10);

    if (newSize !== this.gridSize) {
      this.gridSize = newSize;

      // Reinitialize simulation with new grid size
      if (this.simulation && this.simulation.reinitialize) {
        this.simulation.reinitialize(newSize);
      }

      // Reinitialize visualizer
      if (this.visualizer && this.visualizer.reinitialize) {
        this.visualizer.reinitialize(this.simulation);
      }

      // Reset time
      this.elapsedTime = 0;

      // Update UI
      this.updateUI();
    }
  }

  /**
   * Handle visualization mode change
   * @param {Event} event - Change event from select element
   */
  handleVizModeChange(event) {
    const mode = event.target.value;

    // Map "complex" to "full" for internal use
    const internalMode = mode === 'complex' ? 'full' : mode;

    if (this.visualizer && this.visualizer.setVisualizationMode) {
      this.visualizer.setVisualizationMode(internalMode);
    }
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyPress(event) {
    // Ignore if typing in input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    switch (event.key.toLowerCase()) {
      case ' ':
      case 'spacebar':
        event.preventDefault();
        this.handlePlayPause();
        break;

      case 'r':
        event.preventDefault();
        this.handleReset();
        break;

      case 'escape':
        if (this.ui.measurementResult) {
          this.ui.measurementResult.style.display = 'none';
        }
        break;
    }
  }

  /**
   * Update UI statistics (total probability, time elapsed)
   * Should be called regularly from the main animation loop
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    if (this.isPlaying) {
      this.elapsedTime += deltaTime;
    }

    const now = Date.now();
    if (now - this.lastStatsUpdate > this.statsUpdateInterval) {
      this.updateUI();
      this.lastStatsUpdate = now;
    }
  }

  /**
   * Update UI display elements
   */
  updateUI() {
    // Update total probability
    if (this.ui.totalProbDisplay && this.simulation) {
      const totalProb = this.simulation.getTotalProbability();
      this.ui.totalProbDisplay.textContent = `${(totalProb * 100).toFixed(4)}%`;

      // Warn if normalization is off
      if (Math.abs(totalProb - 1.0) > 0.01) {
        this.ui.totalProbDisplay.classList.add('warning');
      } else {
        this.ui.totalProbDisplay.classList.remove('warning');
      }
    }

    // Update time elapsed
    if (this.ui.timeDisplay) {
      const seconds = (this.elapsedTime / 1000).toFixed(2);
      this.ui.timeDisplay.textContent = `${seconds}s`;
    }
  }

  /**
   * Get current playing state
   * @returns {boolean} Whether simulation is playing
   */
  getIsPlaying() {
    return this.isPlaying && !this.measurementInProgress;
  }

  /**
   * Get steps per frame for physics updates
   * @returns {number} Number of physics steps per render frame
   */
  getStepsPerFrame() {
    return this.stepsPerFrame;
  }

  /**
   * Utility: sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after timeout
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup method - remove event listeners
   */
  destroy() {
    this.removeEventListeners();

    if (this.measurementResultTimeout) {
      clearTimeout(this.measurementResultTimeout);
    }
  }
}

export default Controller;
