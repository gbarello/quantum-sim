/**
 * main-v2.js
 *
 * Alternative main application file using VisualizerV2
 * This is identical to main.js except it imports VisualizerV2 instead of Visualizer
 *
 * To use this version:
 * 1. Update index.html to import './js/main-v2.js' instead of './js/main.js'
 * 2. Or rename this file to main.js (backup original first)
 */

import { QuantumSimulation } from './quantum.js';
import { VisualizerV2 as Visualizer } from './visualization/VisualizerV2.js';
import { Controller } from './controls.js';

/**
 * Main application class that coordinates all components
 */
class QuantumPlaygroundApp {
  constructor() {
    this.simulation = null;
    this.visualizer = null;
    this.controller = null;
    this.canvas = null;
    this.isRunning = false;
    this.lastTime = 0;

    // Configuration
    this.config = {
      gridSize: 128, // Must be power of 2 for FFT
      domainSize: 10.0,
      dt: 0.01,
      timeScale: 1.0,
      stepsPerFrame: 5,
      boundaryCondition: 'periodic'
    };
  }

  /**
   * Initialize the application
   */
  init() {
    console.log('Initializing Quantum Playground with VisualizerV2...');

    // Create canvas
    this.canvas = document.getElementById('quantum-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Debug logging
    console.log('✓ Canvas found:', this.canvas);
    console.log('  Canvas dimensions (physical):', this.canvas.width, this.canvas.height);
    console.log('  Canvas dimensions (client):', this.canvas.clientWidth, this.canvas.clientHeight);
    console.log('  Canvas bounding rect:', this.canvas.getBoundingClientRect());

    // Initialize quantum simulation
    const dx = this.config.domainSize / this.config.gridSize;
    this.simulation = new QuantumSimulation(
      this.config.gridSize,
      dx,
      this.config.dt,
      1.0, // hbar (default)
      1.0, // mass (default)
      this.config.boundaryCondition,
      this.config.timeScale
    );

    // Initialize visualizer (using VisualizerV2!)
    this.visualizer = new Visualizer(this.canvas, this.simulation, {
      visualizationMode: 'full',
      saturationScale: 5.0,
      showGrid: false,
      showPhaseWheel: false,
      showPotentialPlot: true
    });

    // Debug logging
    console.log('✓ VisualizerV2 created');
    console.log('  Visualizer dimensions:', this.visualizer.width, 'x', this.visualizer.height);
    console.log('  Panels created:', Object.keys(this.visualizer.panels));

    // Gather UI elements for controller
    const uiElements = {
      canvas: this.canvas,
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

    // Initialize controller with correct parameters
    this.controller = new Controller(this.simulation, this.visualizer, uiElements);

    // Now initialize the simulation with values from the controller (single source of truth)
    // dx already calculated above at line 59
    const centerX = this.controller.initialPosition.x * this.config.gridSize;
    const centerY = this.controller.initialPosition.y * this.config.gridSize;
    const maxMomentum = 5.0;
    const momentumX = (this.controller.initialMomentum.x - 0.5) * 2 * maxMomentum;
    const momentumY = (this.controller.initialMomentum.y - 0.5) * 2 * maxMomentum;
    const width = this.controller.packetSize * dx * 3;

    console.log(`Initializing simulation from controller initial conditions:`);
    console.log(`  Position: (${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
    console.log(`  Momentum: (${momentumX.toFixed(2)}, ${momentumY.toFixed(2)})`);
    console.log(`  Width: ${width.toFixed(2)}`);

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

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Initial resize
    this.handleResize();

    // Validate configuration
    this.validateConfig();

    // Start the main loop
    this.start();

    console.log('VisualizerV2 initialization complete');
    console.log('Using panel-based architecture');
  }

  /**
   * Validate simulation configuration
   */
  validateConfig() {
    const { gridSize, dt, timeScale } = this.config;

    // Check if gridSize is power of 2
    const isPowerOf2 = (gridSize & (gridSize - 1)) === 0;
    if (!isPowerOf2) {
      console.warn(`Grid size ${gridSize} is not a power of 2. This may cause FFT issues.`);
    }

    // Check numerical stability (Courant condition)
    // For split-operator method: dt < 2m*dx^2/h_bar
    const dx = this.config.domainSize / gridSize;
    const m = 1.0; // particle mass
    const h_bar = 1.0;
    const maxDt = 2 * m * dx * dx / h_bar;
    const effectiveDt = dt * timeScale;

    if (effectiveDt >= maxDt) {
      console.warn(
        `Time step dt * timeScale = ${effectiveDt.toFixed(4)} exceeds stability limit ${maxDt.toFixed(4)}. ` +
        'Simulation may become unstable.'
      );
    } else {
      console.log(`Stability check passed: dt * timeScale = ${effectiveDt.toFixed(4)} < ${maxDt.toFixed(4)}`);
    }
  }

  /**
   * Handle window resize
   */
  handleResize() {
    if (this.visualizer) {
      this.visualizer.resize();
    }
  }

  /**
   * Start the simulation
   */
  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.mainLoop(this.lastTime);
  }

  /**
   * Pause the simulation
   */
  pause() {
    this.isRunning = false;
  }

  /**
   * Resume the simulation
   */
  resume() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.mainLoop(this.lastTime);
    }
  }

  /**
   * Toggle pause/resume
   */
  togglePause() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.resume();
    }
  }

  /**
   * Main animation loop
   */
  mainLoop(currentTime) {
    if (!this.isRunning) return;

    // Calculate time delta (capped to avoid large jumps)
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Update controller (UI state)
    if (this.controller) {
      this.controller.update(deltaTime);
    }

    // Update physics only if playing (multiple steps per frame for better accuracy)
    if (this.controller && this.controller.getIsPlaying()) {
      const stepsPerFrame = this.controller.getStepsPerFrame();
      for (let i = 0; i < stepsPerFrame; i++) {
        this.simulation.step();
      }
    }

    // Render visualization
    if (this.visualizer) {
      this.visualizer.render();
    }

    // Continue loop
    requestAnimationFrame((time) => this.mainLoop(time));
  }

  /**
   * Reset simulation to initial state
   */
  reset() {
    this.simulation.initialize({
      centerX: this.config.gridSize / 2,
      centerY: this.config.gridSize / 2,
      width: 0.6,
      momentumX: 1.0,
      momentumY: 0.5
    });

    if (this.visualizer) {
      this.visualizer.render();
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.pause();

    if (this.visualizer) {
      this.visualizer.dispose();
    }

    if (this.controller) {
      this.controller.dispose();
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuantumPlaygroundApp();
    window.app.init();
  });
} else {
  window.app = new QuantumPlaygroundApp();
  window.app.init();
}

export { QuantumPlaygroundApp };
