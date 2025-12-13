/**
 * test-visualizer-v2.js
 *
 * Comprehensive unit tests for VisualizerV2
 *
 * Tests:
 * - Panel creation and lifecycle
 * - Configuration management
 * - Resize handling
 * - Render coordination
 * - API compatibility with original Visualizer
 */

import { VisualizerV2 } from '../js/visualization/VisualizerV2.js';
import { QuantumSimulation } from '../js/quantum.js';

/**
 * Test suite for VisualizerV2
 */
class VisualizerV2Tests {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('=== VisualizerV2 Test Suite ===\n');

    // Create test fixtures
    const { canvas, simulation } = this.createFixtures();

    // Run tests
    await this.testConstructor(canvas, simulation);
    await this.testPanelCreation(canvas, simulation);
    await this.testConfiguration(canvas, simulation);
    await this.testResize(canvas, simulation);
    await this.testRenderCoordination(canvas, simulation);
    await this.testMeasurementFeedback(canvas, simulation);
    await this.testHoverState(canvas, simulation);
    await this.testCoordinateConversion(canvas, simulation);
    await this.testAPICompatibility(canvas, simulation);
    await this.testPanelDisposal(canvas, simulation);

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);

    return this.failed === 0;
  }

  /**
   * Create test fixtures (canvas + simulation)
   */
  createFixtures() {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create simulation
    const simulation = new QuantumSimulation({
      gridSize: 64,
      domainSize: 10.0,
      dt: 0.01,
      boundaryCondition: 'periodic'
    });

    return { canvas, simulation };
  }

  /**
   * Assert helper
   */
  assert(condition, message) {
    if (condition) {
      this.passed++;
      console.log(`✓ ${message}`);
    } else {
      this.failed++;
      console.error(`✗ ${message}`);
    }
  }

  /**
   * Test: Constructor initialization
   */
  async testConstructor(canvas, simulation) {
    console.log('\n--- Constructor Tests ---');

    // Test 1: Basic construction
    const visualizer = new VisualizerV2(canvas, simulation);
    this.assert(visualizer !== null, 'Constructor creates instance');
    this.assert(visualizer.canvas === canvas, 'Canvas reference stored');
    this.assert(visualizer.simulation === simulation, 'Simulation reference stored');
    this.assert(visualizer.ctx !== null, 'Canvas context created');

    // Test 2: Default configuration
    this.assert(visualizer.config.visualizationMode === 'full', 'Default visualization mode is full');
    this.assert(visualizer.config.saturationScale === 5.0, 'Default saturation scale is 5.0');
    this.assert(visualizer.config.showGrid === false, 'Default showGrid is false');
    this.assert(visualizer.config.showPhaseWheel === false, 'Default showPhaseWheel is false');

    // Test 3: Custom configuration
    const visualizer2 = new VisualizerV2(canvas, simulation, {
      visualizationMode: 'probability',
      saturationScale: 10.0,
      showGrid: true,
      showPhaseWheel: true
    });
    this.assert(visualizer2.config.visualizationMode === 'probability', 'Custom visualization mode applied');
    this.assert(visualizer2.config.saturationScale === 10.0, 'Custom saturation scale applied');
    this.assert(visualizer2.config.showGrid === true, 'Custom showGrid applied');
    this.assert(visualizer2.config.showPhaseWheel === true, 'Custom showPhaseWheel applied');

    // Test 4: Panels created on construction
    this.assert(Object.keys(visualizer.panels).length > 0, 'Panels created on construction');
  }

  /**
   * Test: Panel creation
   */
  async testPanelCreation(canvas, simulation) {
    console.log('\n--- Panel Creation Tests ---');

    // Test 1: Essential panels always created
    const visualizer = new VisualizerV2(canvas, simulation);
    this.assert(visualizer.panels.wavefunction !== undefined, 'WavefunctionPanel created');
    this.assert(visualizer.panels.measurementFeedback !== undefined, 'MeasurementFeedbackPanel created');
    this.assert(visualizer.panels.measurementCircle !== undefined, 'MeasurementCirclePanel created');

    // Test 2: Optional panels based on config
    const withGrid = new VisualizerV2(canvas, simulation, { showGrid: true });
    this.assert(withGrid.panels.gridOverlay !== undefined, 'GridOverlayPanel created when showGrid=true');

    const withoutGrid = new VisualizerV2(canvas, simulation, { showGrid: false });
    this.assert(withoutGrid.panels.gridOverlay === undefined, 'GridOverlayPanel not created when showGrid=false');

    // Test 3: Phase wheel panel
    const withWheel = new VisualizerV2(canvas, simulation, { showPhaseWheel: true });
    this.assert(withWheel.panels.phaseWheel !== undefined, 'PhaseWheelPanel created when showPhaseWheel=true');

    const withoutWheel = new VisualizerV2(canvas, simulation, { showPhaseWheel: false });
    this.assert(withoutWheel.panels.phaseWheel === undefined, 'PhaseWheelPanel not created when showPhaseWheel=false');

    // Test 4: Potential plot panel
    simulation.setPotentialType('harmonic');
    const withPlot = new VisualizerV2(canvas, simulation, { showPotentialPlot: true });
    this.assert(withPlot.panels.potentialPlot !== undefined, 'PotentialPlotPanel created with potential');

    simulation.setPotentialType('none');
    const withoutPlot = new VisualizerV2(canvas, simulation);
    this.assert(withoutPlot.panels.potentialPlot === undefined, 'PotentialPlotPanel not created without potential');
  }

  /**
   * Test: Configuration methods
   */
  async testConfiguration(canvas, simulation) {
    console.log('\n--- Configuration Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: setVisualizationMode
    visualizer.setVisualizationMode('probability');
    this.assert(visualizer.config.visualizationMode === 'probability', 'setVisualizationMode updates config');
    this.assert(
      visualizer.panels.wavefunction.config.visualizationMode === 'probability',
      'setVisualizationMode propagates to panel'
    );

    // Test 2: setSaturationScale
    visualizer.setSaturationScale(8.0);
    this.assert(visualizer.config.saturationScale === 8.0, 'setSaturationScale updates config');
    this.assert(
      visualizer.panels.wavefunction.config.saturationScale === 8.0,
      'setSaturationScale propagates to panel'
    );

    // Test 3: setGridVisible
    const panelsBefore = Object.keys(visualizer.panels).length;
    visualizer.setGridVisible(true);
    this.assert(visualizer.config.showGrid === true, 'setGridVisible updates config');
    this.assert(visualizer.panels.gridOverlay !== undefined, 'setGridVisible(true) creates grid panel');

    visualizer.setGridVisible(false);
    this.assert(visualizer.panels.gridOverlay === undefined, 'setGridVisible(false) removes grid panel');

    // Test 4: setPhaseWheelVisible
    visualizer.setPhaseWheelVisible(true);
    this.assert(visualizer.config.showPhaseWheel === true, 'setPhaseWheelVisible updates config');

    // Test 5: setPotentialVisible
    visualizer.setPotentialVisible(false);
    this.assert(visualizer.config.showPotentialPlot === false, 'setPotentialVisible updates config');
  }

  /**
   * Test: Resize handling
   */
  async testResize(canvas, simulation) {
    console.log('\n--- Resize Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: Canvas dimensions updated
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    canvas.style.width = '1000px';
    canvas.style.height = '800px';
    visualizer.resize();

    // Note: getBoundingClientRect returns display size, not actual canvas size
    this.assert(visualizer.width === 1000, 'Logical width updated on resize');
    this.assert(visualizer.height === 800, 'Logical height updated on resize');

    // Test 2: Panels recreated
    const panelsBefore = visualizer.panels;
    visualizer.resize();
    const panelsAfter = visualizer.panels;
    this.assert(panelsBefore !== panelsAfter, 'Panels recreated on resize (new object)');

    // Test 3: Layout recalculated
    this.assert(visualizer.layout !== null, 'Layout exists after resize');
  }

  /**
   * Test: Render coordination
   */
  async testRenderCoordination(canvas, simulation) {
    console.log('\n--- Render Coordination Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: Render completes without error
    let renderError = null;
    try {
      visualizer.render();
    } catch (e) {
      renderError = e;
    }
    this.assert(renderError === null, 'Render completes without error');

    // Test 2: Canvas is modified (not blank)
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 100, 100);
    const hasPixels = Array.from(imageData.data).some(v => v !== 0);
    this.assert(hasPixels, 'Canvas contains rendered pixels after render()');

    // Test 3: All panels rendered
    // We can't directly check if panels were called, but we can verify they exist
    for (const panel of Object.values(visualizer.panels)) {
      this.assert(typeof panel.render === 'function', 'Panel has render method');
    }
  }

  /**
   * Test: Measurement feedback
   */
  async testMeasurementFeedback(canvas, simulation) {
    console.log('\n--- Measurement Feedback Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: showMeasurementFeedback sets state
    visualizer.showMeasurementFeedback(10, 15, 'positive', 500);
    const panel = visualizer.panels.measurementFeedback;
    this.assert(panel.state.active === true, 'Measurement feedback activated');
    this.assert(panel.state.gridX === 10, 'Measurement feedback gridX set');
    this.assert(panel.state.gridY === 15, 'Measurement feedback gridY set');
    this.assert(panel.state.type === 'positive', 'Measurement feedback type set');

    // Test 2: Render with active feedback
    let renderError = null;
    try {
      visualizer.render();
    } catch (e) {
      renderError = e;
    }
    this.assert(renderError === null, 'Render with active feedback completes');

    // Test 3: Feedback times out
    await new Promise(resolve => setTimeout(resolve, 600));
    visualizer.render();
    this.assert(panel.state.active === false, 'Measurement feedback deactivates after duration');
  }

  /**
   * Test: Hover state
   */
  async testHoverState(canvas, simulation) {
    console.log('\n--- Hover State Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: setHoverState activates
    visualizer.setHoverState(true, 20, 25);
    const panel = visualizer.panels.measurementCircle;
    this.assert(panel.state.active === true, 'Hover state activated');
    this.assert(panel.state.gridX === 20, 'Hover gridX set');
    this.assert(panel.state.gridY === 25, 'Hover gridY set');

    // Test 2: setHoverState deactivates
    visualizer.setHoverState(false);
    this.assert(panel.state.active === false, 'Hover state deactivated');

    // Test 3: setMeasurementRadius
    visualizer.setMeasurementRadius(3.5);
    this.assert(panel.state.radius === 3.5, 'Measurement radius updated');
  }

  /**
   * Test: Coordinate conversion
   */
  async testCoordinateConversion(canvas, simulation) {
    console.log('\n--- Coordinate Conversion Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: canvasToGrid valid coordinates
    const gridCoords = visualizer.canvasToGrid(100, 100);
    this.assert(gridCoords !== null, 'canvasToGrid returns valid result for in-bounds point');
    this.assert(typeof gridCoords.x === 'number', 'canvasToGrid returns numeric x');
    this.assert(typeof gridCoords.y === 'number', 'canvasToGrid returns numeric y');
    this.assert(gridCoords.x >= 0 && gridCoords.x < simulation.gridSize, 'canvasToGrid x in valid range');
    this.assert(gridCoords.y >= 0 && gridCoords.y < simulation.gridSize, 'canvasToGrid y in valid range');

    // Test 2: canvasToGrid out of bounds
    const outOfBounds = visualizer.canvasToGrid(5000, 5000);
    this.assert(outOfBounds === null, 'canvasToGrid returns null for out-of-bounds point');

    // Test 3: getProbabilityAt valid coordinates
    const prob = visualizer.getProbabilityAt(100, 100);
    this.assert(typeof prob === 'number', 'getProbabilityAt returns number');
    this.assert(prob >= 0, 'Probability is non-negative');

    // Test 4: getProbabilityAt out of bounds
    const probOut = visualizer.getProbabilityAt(5000, 5000);
    this.assert(probOut === 0, 'getProbabilityAt returns 0 for out-of-bounds');
  }

  /**
   * Test: API compatibility with original Visualizer
   */
  async testAPICompatibility(canvas, simulation) {
    console.log('\n--- API Compatibility Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Check that all public methods from original Visualizer exist
    const requiredMethods = [
      'render',
      'resize',
      'setVisualizationMode',
      'setSaturationScale',
      'setGridVisible',
      'setPhaseWheelVisible',
      'setPotentialVisible',
      'showMeasurementFeedback',
      'setHoverState',
      'canvasToGrid',
      'getProbabilityAt',
      'dispose'
    ];

    for (const method of requiredMethods) {
      this.assert(
        typeof visualizer[method] === 'function',
        `API method '${method}' exists`
      );
    }

    // Test that methods have correct signatures (won't throw on valid inputs)
    let apiError = null;
    try {
      visualizer.setVisualizationMode('full');
      visualizer.setSaturationScale(5.0);
      visualizer.setGridVisible(false);
      visualizer.setPhaseWheelVisible(false);
      visualizer.setPotentialVisible(true);
      visualizer.showMeasurementFeedback(0, 0, 'positive', 500);
      visualizer.setHoverState(true, 0, 0);
      visualizer.canvasToGrid(100, 100);
      visualizer.getProbabilityAt(100, 100);
    } catch (e) {
      apiError = e;
    }
    this.assert(apiError === null, 'All API methods callable with valid arguments');
  }

  /**
   * Test: Panel disposal
   */
  async testPanelDisposal(canvas, simulation) {
    console.log('\n--- Panel Disposal Tests ---');

    const visualizer = new VisualizerV2(canvas, simulation);

    // Test 1: dispose() completes without error
    let disposeError = null;
    try {
      visualizer.dispose();
    } catch (e) {
      disposeError = e;
    }
    this.assert(disposeError === null, 'dispose() completes without error');

    // Test 2: Panels cleared after dispose
    this.assert(Object.keys(visualizer.panels).length === 0, 'Panels cleared after dispose()');

    // Test 3: Multiple dispose calls safe
    let multiDisposeError = null;
    try {
      visualizer.dispose();
      visualizer.dispose();
    } catch (e) {
      multiDisposeError = e;
    }
    this.assert(multiDisposeError === null, 'Multiple dispose() calls safe');
  }
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.VisualizerV2Tests = VisualizerV2Tests;
}

// Auto-run if in Node.js
if (typeof module !== 'undefined' && module.exports) {
  const tests = new VisualizerV2Tests();
  tests.runAll().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { VisualizerV2Tests };
