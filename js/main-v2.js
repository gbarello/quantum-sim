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
    this.canvas = document.getElementById('quantumCanvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Initialize quantum simulation
    this.simulation = new QuantumSimulation(this.config);

    // Initialize visualizer (using VisualizerV2!)
    this.visualizer = new Visualizer(this.canvas, this.simulation, {
      visualizationMode: 'full',
      saturationScale: 5.0,
      showGrid: false,
      showPhaseWheel: false,
      showPotentialPlot: true
    });

    // Initialize controller
    this.controller = new Controller(
      this.canvas,
      this.simulation,
      this.visualizer,
      this
    );

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

    // Update physics (multiple steps per frame for better accuracy)
    for (let i = 0; i < this.config.stepsPerFrame; i++) {
      this.simulation.step();
    }

    // Update controller (UI state)
    if (this.controller) {
      this.controller.update();
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
