/**
 * main.js - Main application entry point
 *
 * Coordinates the quantum simulation, visualization, and user controls
 */

import { QuantumSimulation } from './quantum.js';
import { Visualizer } from './visualization.js';
import { Controller } from './controls.js';

/**
 * Application configuration
 */
const config = {
  // Grid settings
  gridSize: 128,           // N�N grid (must be power of 2)
  domainSize: 10.0,        // Physical size (arbitrary units)

  // Physics constants (natural units: =1, m=1)
  hbar: 1.0,
  mass: 1.0,

  // Time evolution
  dt: 0.01,                // Time step
  timeScale: 1.0,          // Evolution speed multiplier
  stepsPerFrame: 5,        // Physics steps per render frame

  // Boundary conditions
  boundaryCondition: 'periodic',

  // Note: Initial conditions are now defined in the controller (controls.js)
  // This ensures the panel and simulation stay in sync

  // Visualization
  showGrid: false,
  showPhaseWheel: true,
  visualizationMode: 'full' // 'full', 'probability', 'phase'
};

/**
 * Main application class
 */
class QuantumPlaygroundApp {
  constructor() {
    this.simulation = null;
    this.visualizer = null;
    this.controller = null;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      console.log('Initializing Quantum Playground...');

      // Get canvas element
      const canvas = document.getElementById('quantum-canvas');
      if (!canvas) {
        throw new Error('Canvas element not found');
      }

      // Set canvas size (square, responsive)
      this.resizeCanvas(canvas);
      window.addEventListener('resize', () => this.resizeCanvas(canvas));

      // Calculate spatial step
      const dx = config.domainSize / config.gridSize;

      // Check stability condition: dt < 2m*dx�/
      const stabilityLimit = (2 * config.mass * dx * dx) / config.hbar;
      const effectiveDt = config.dt * config.timeScale;

      if (effectiveDt >= stabilityLimit) {
        console.warn(
          `Warning: Time step may be too large for stability.\n` +
          `dt � timeScale = ${effectiveDt.toFixed(6)}\n` +
          `Stability limit: ${stabilityLimit.toFixed(6)}\n` +
          `Consider reducing dt or timeScale.`
        );
      } else {
        console.log(`Stability check: OK (dt=${effectiveDt.toFixed(6)} < ${stabilityLimit.toFixed(6)})`);
      }

      // Initialize quantum simulation (don't initialize wavefunction yet)
      console.log('Creating quantum simulation...');
      this.simulation = new QuantumSimulation(
        config.gridSize,
        dx,
        config.dt,
        config.hbar,
        config.mass,
        config.boundaryCondition,
        config.timeScale
      );

      // Initialize visualizer
      console.log('Creating visualizer...');
      this.visualizer = new Visualizer(canvas, this.simulation);
      this.visualizer.setGridVisible(config.showGrid);
      this.visualizer.setPhaseWheelVisible(config.showPhaseWheel);
      this.visualizer.setVisualizationMode(config.visualizationMode);

      // Gather UI elements
      const uiElements = {
        canvas: canvas,
        playPauseBtn: document.getElementById('play-pause'),
        resetBtn: document.getElementById('reset'),
        speedSlider: document.getElementById('speed-slider'),
        speedValue: document.getElementById('speed-value'),
        measurementRadiusSlider: document.getElementById('measurement-radius-slider'),
        measurementRadiusValue: document.getElementById('measurement-radius-value'),
        potentialStrengthSlider: document.getElementById('potential-strength-slider'),
        potentialStrengthValue: document.getElementById('potential-strength-value'),
        gridSizeSelect: document.getElementById('grid-size'),
        gridToggle: document.getElementById('grid-toggle'),
        vizModeSelect: document.getElementById('viz-mode'),
        totalProbDisplay: document.getElementById('total-probability'),
        timeDisplay: document.getElementById('time-elapsed'),
        measurementResult: document.getElementById('info-overlay'),
        hoverProbability: document.getElementById('hover-info'),
        positionSelector: document.getElementById('position-selector'),
        momentumSelector: document.getElementById('momentum-selector'),
        packetSizeSlider: document.getElementById('packet-size-slider'),
        packetSizeValue: document.getElementById('packet-size-value'),
        positionDisplay: document.getElementById('position-display'),
        momentumDisplay: document.getElementById('momentum-display')
      };

      // Verify all UI elements exist
      for (const [key, element] of Object.entries(uiElements)) {
        if (!element) {
          console.warn(`UI element not found: ${key}`);
        }
      }

      // Initialize controller
      console.log('Creating controller...');
      this.controller = new Controller(this.simulation, this.visualizer, uiElements);

      // Now initialize the simulation with values from the controller (single source of truth)
      const centerX = this.controller.initialPosition.x * config.gridSize;
      const centerY = this.controller.initialPosition.y * config.gridSize;
      const maxMomentum = 5.0;
      const momentumX = (this.controller.initialMomentum.x - 0.5) * 2 * maxMomentum;
      const momentumY = (this.controller.initialMomentum.y - 0.5) * 2 * maxMomentum;
      const width = this.controller.packetSize * dx * 3;

      console.log(`Initializing simulation from controller initial conditions:`);
      console.log(`  Position: (${centerX}, ${centerY})`);
      console.log(`  Momentum: (${momentumX}, ${momentumY})`);
      console.log(`  Width: ${width}`);

      this.simulation.initialize({
        centerX: centerX,
        centerY: centerY,
        width: width,
        momentumX: momentumX,
        momentumY: momentumY
      });

      // Verify normalization
      const totalProb = this.simulation.getTotalProbability();
      console.log(`Initial total probability: ${totalProb.toFixed(8)}`);

      // Set up grid toggle if it exists
      if (uiElements.gridToggle) {
        uiElements.gridToggle.addEventListener('change', (e) => {
          this.visualizer.setGridVisible(e.target.checked);
        });
      }

      // Render initial state
      this.visualizer.render();

      // Start main loop
      console.log('Starting main loop...');
      this.lastFrameTime = performance.now();
      this.mainLoop(this.lastFrameTime);

      console.log('Quantum Playground initialized successfully!');

      // Show welcome message
      this.showWelcomeMessage();

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError(error.message);
    }
  }

  /**
   * Resize canvas to fit container while maintaining aspect ratio
   */
  resizeCanvas(canvas) {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight, 800);

    canvas.width = size;
    canvas.height = size;

    // Update visualizer if it exists
    if (this.visualizer) {
      this.visualizer.resize();
    }
  }

  /**
   * Main animation loop
   */
  mainLoop(currentTime) {
    this.animationFrameId = requestAnimationFrame((time) => this.mainLoop(time));

    // Calculate delta time
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    // Update controller (stats, etc.)
    if (this.controller) {
      this.controller.update(deltaTime);
    }

    // Perform physics steps if playing
    if (this.controller && this.controller.getIsPlaying()) {
      const stepsPerFrame = this.controller.getStepsPerFrame();

      for (let i = 0; i < stepsPerFrame; i++) {
        this.simulation.step();
      }
    }

    // Render current state
    this.visualizer.render();
  }

  /**
   * Show welcome message
   */
  showWelcomeMessage() {
    const messageEl = document.querySelector('.measurement-result');
    if (messageEl) {
      messageEl.textContent = 'Welcome! Click anywhere on the canvas to perform a quantum measurement.';
      messageEl.className = 'measurement-result visible';

      setTimeout(() => {
        messageEl.classList.remove('visible');
      }, 4000);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #e74c3c;
      color: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      max-width: 80%;
      text-align: center;
    `;
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0;">Initialization Error</h3>
      <p style="margin: 0;">${message}</p>
    `;
    document.body.appendChild(errorDiv);
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.controller) {
      this.controller.destroy();
    }
    if (this.visualizer) {
      this.visualizer.dispose();
    }
  }
}

/**
 * Initialize app when DOM is loaded
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.quantumApp = new QuantumPlaygroundApp();
    window.quantumApp.init();
  });
} else {
  // DOM already loaded
  window.quantumApp = new QuantumPlaygroundApp();
  window.quantumApp.init();
}

// Export for external access if needed
export { QuantumPlaygroundApp, config };
