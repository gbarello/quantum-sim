/**
 * main.js - Main application entry point
 *
 * Coordinates the quantum simulation, visualization, and user controls
 *
 * IMPORTANT: Configuration uses domainSize as PRIMARY parameter
 * - domainSize (physical domain size) is specified directly
 * - dx (spatial resolution) is derived as: dx = domainSize / gridSize
 * - This allows intuitive control of the physical domain size
 */

import { QuantumSimulation } from './quantum.js';
import { VisualizerV2 as Visualizer } from './visualization/VisualizerV2.js';
import { ControlsManager } from './controls/ControlsManager.js';

/**
 * Application configuration
 */
const config = {
  // Grid settings
  gridSize: 128,           // N�N grid (must be power of 2 for FFT)
  domainSize: 10.0,        // Physical domain size (PRIMARY parameter)
  // Note: dx is derived as domainSize / gridSize = 0.078125

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
  showPhaseWheel: false
  // Note: visualizationMode is now set from control defaults in ControlsManager
};

/**
 * Main application class
 */
class QuantumPlaygroundApp {
  constructor() {
    this.simulation = null;
    this.visualizer = null;
    this.controlsManager = null;
    this.lastFrameTime = 0;
    this.animationFrameId = null;

    // FPS tracking and limiting
    this.targetFPS = 30;
    this.frameInterval = 1000 / this.targetFPS;
    this.frameCount = 0;
    this.fpsLastTime = 0;
    this.currentFPS = 0;
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

      // Get domain size (now primary parameter)
      const domainSize = config.domainSize;

      // Derived: dx = domainSize / gridSize
      const dx = domainSize / config.gridSize;
      console.log(`Spatial resolution dx: ${dx.toFixed(6)} (= ${domainSize.toFixed(4)} / ${config.gridSize})`);

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

      // Note: Visualization mode will be set from control defaults below

      // Initialize controls manager (pass 'this' so it can update simulation reference on recreation)
      console.log('Creating controls manager...');
      this.controlsManager = new ControlsManager(this.simulation, this.visualizer, null, this);

      // Get controls root element and initialize
      const controlsRoot = document.getElementById('controls-root');
      if (!controlsRoot) {
        throw new Error('Controls root element not found');
      }
      this.controlsManager.initialize(controlsRoot);

      // Apply initial control values to simulation and visualizer
      // This ensures defaults from defaultConfig.js are properly applied
      this.controlsManager.applyInitialControlValues();

      // Initialize the simulation with default values from the controls manager
      // Use the centralized conversion method to ensure consistency with Reset
      const params = this.controlsManager.getSimulationParametersFromState();

      console.log(`Initializing simulation from controls manager:`);
      console.log(`  Position: (${params.centerX.toFixed(2)}, ${params.centerY.toFixed(2)})`);
      console.log(`  Momentum: (${params.momentumX.toFixed(2)}, ${params.momentumY.toFixed(2)})`);
      console.log(`  Width: ${params.width.toFixed(2)}`);

      this.simulation.initialize({
        centerX: params.centerX,
        centerY: params.centerY,
        width: params.width,
        momentumX: params.momentumX,
        momentumY: params.momentumY
      });

      // Verify normalization
      const totalProb = this.simulation.getTotalProbability();
      console.log(`Initial total probability: ${totalProb.toFixed(8)}`);

      // Set mode manager reference on visualizer
      this.visualizer.setModeManager(this.controlsManager.modeManager);

      // Event routing is now handled by CanvasEventRouter (initialized in ControlsManager)
      console.log('Canvas event routing initialized via ControlsManager');

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
   * Main animation loop with frame rate limiting
   */
  mainLoop(currentTime) {
    this.animationFrameId = requestAnimationFrame((time) => this.mainLoop(time));

    // Calculate time since last frame
    const elapsed = currentTime - this.lastFrameTime;

    // Frame rate limiting: skip frame if not enough time has passed
    if (elapsed < this.frameInterval) {
      return;
    }

    // Update last frame time, accounting for any drift
    this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

    // FPS tracking
    this.frameCount++;
    if (this.fpsLastTime === 0) {
      this.fpsLastTime = currentTime;
    }

    // Update FPS calculation every 500ms for responsive display
    if (currentTime - this.fpsLastTime >= 500) {
      const realTimeElapsed = (currentTime - this.fpsLastTime) / 1000;
      this.currentFPS = this.frameCount / realTimeElapsed;

      this.frameCount = 0;
      this.fpsLastTime = currentTime;
    }

    // Update controls manager (updates display controls including FPS)
    if (this.controlsManager) {
      const deltaTime = elapsed / 1000; // Convert to seconds
      this.controlsManager.update(deltaTime);
    }

    // Perform physics steps if playing
    if (this.controlsManager && this.controlsManager.getState().isPlaying) {
      const stepsPerFrame = config.stepsPerFrame;

      for (let i = 0; i < stepsPerFrame; i++) {
        try {
          this.simulation.step();
        } catch (error) {
          console.error('Error during simulation step:', error);
          this.controlsManager.setState({ isPlaying: false });
          break;
        }
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
   * Get current FPS
   */
  getFPS() {
    return this.currentFPS;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.controlsManager) {
      this.controlsManager.destroy();
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
