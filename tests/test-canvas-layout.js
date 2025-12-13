/**
 * test-canvas-layout.js
 *
 * Test suite for CanvasLayout class
 *
 * This validates that the layout calculations match the current
 * hardcoded logic in visualization.js
 */

import { CanvasLayout } from '../js/visualization/core/CanvasLayout.js';

/**
 * Test basic layout calculation without plot
 */
function testBasicLayout() {
  console.log('Test: Basic layout (no plot, no phase wheel)');

  const layout = new CanvasLayout(800, 600, {
    showPlot: false,
    showPhaseWheel: false
  });

  const result = layout.calculateLayout();

  // Wavefunction should be square, based on canvas height
  console.assert(result.wavefunction.x === 0, 'Wavefunction x should be 0');
  console.assert(result.wavefunction.y === 0, 'Wavefunction y should be 0');
  console.assert(result.wavefunction.width === 600, 'Wavefunction width should equal canvas height');
  console.assert(result.wavefunction.height === 600, 'Wavefunction height should equal canvas height');

  // Plot should be null when disabled
  console.assert(result.potentialPlot === null, 'Plot should be null when disabled');

  // Phase wheel should be null when disabled
  console.assert(result.phaseWheel === null, 'Phase wheel should be null when disabled');

  console.log('✓ Basic layout test passed\n');
}

/**
 * Test layout with potential plot enabled
 */
function testLayoutWithPlot() {
  console.log('Test: Layout with potential plot');

  const layout = new CanvasLayout(800, 600, {
    showPlot: true,
    showPhaseWheel: false
  });

  const result = layout.calculateLayout();

  // Wavefunction should still be square
  console.assert(result.wavefunction.width === 600, 'Wavefunction should be square');
  console.assert(result.wavefunction.height === 600, 'Wavefunction should be square');

  // Plot should occupy remaining horizontal space
  console.assert(result.potentialPlot !== null, 'Plot should exist');
  console.assert(result.potentialPlot.x === 600, 'Plot should start after wavefunction');
  console.assert(result.potentialPlot.y === 0, 'Plot should start at top');
  console.assert(result.potentialPlot.width === 200, 'Plot width should be remaining space');
  console.assert(result.potentialPlot.height === 600, 'Plot height should match canvas');

  console.log('✓ Layout with plot test passed\n');
}

/**
 * Test layout with phase wheel enabled
 */
function testLayoutWithPhaseWheel() {
  console.log('Test: Layout with phase wheel');

  const layout = new CanvasLayout(800, 600, {
    showPlot: false,
    showPhaseWheel: true,
    phaseWheelRadius: 40,
    phaseWheelMargin: 20
  });

  const result = layout.calculateLayout();

  // Phase wheel should be in top-right corner
  console.assert(result.phaseWheel !== null, 'Phase wheel should exist');
  console.assert(result.phaseWheel.x === 800 - 80 - 20, 'Phase wheel X position');
  console.assert(result.phaseWheel.y === 20, 'Phase wheel Y position');
  console.assert(result.phaseWheel.width === 80, 'Phase wheel width');
  console.assert(result.phaseWheel.height === 80, 'Phase wheel height');

  console.log('✓ Layout with phase wheel test passed\n');
}

/**
 * Test hit testing
 */
function testHitTesting() {
  console.log('Test: Hit testing');

  const layout = new CanvasLayout(800, 600, {
    showPlot: true,
    showPhaseWheel: true
  });

  // Test hit on wavefunction area
  let hit = layout.hitTest(100, 100);
  console.assert(hit !== null, 'Should hit a panel');
  console.assert(hit.panel === 'wavefunction', 'Should hit wavefunction');

  // Test hit on plot area
  hit = layout.hitTest(650, 100);
  console.assert(hit !== null, 'Should hit a panel');
  console.assert(hit.panel === 'potentialPlot', 'Should hit plot');

  // Test hit on phase wheel (overlay priority)
  hit = layout.hitTest(720, 40);
  console.assert(hit !== null, 'Should hit a panel');
  console.assert(hit.panel === 'phaseWheel', 'Should hit phase wheel');

  // Test miss (outside all panels)
  hit = layout.hitTest(900, 100);
  console.assert(hit === null, 'Should miss all panels');

  console.log('✓ Hit testing test passed\n');
}

/**
 * Test dimension updates
 */
function testDimensionUpdate() {
  console.log('Test: Dimension updates');

  const layout = new CanvasLayout(800, 600, { showPlot: true });

  // Update dimensions
  layout.updateDimensions(1000, 800);

  const result = layout.calculateLayout();

  // Check updated layout
  console.assert(result.wavefunction.width === 800, 'Updated wavefunction width');
  console.assert(result.wavefunction.height === 800, 'Updated wavefunction height');
  console.assert(result.potentialPlot.width === 200, 'Updated plot width');

  console.log('✓ Dimension update test passed\n');
}

/**
 * Test config updates
 */
function testConfigUpdate() {
  console.log('Test: Config updates');

  const layout = new CanvasLayout(800, 600, { showPlot: false });

  let result = layout.calculateLayout();
  console.assert(result.potentialPlot === null, 'Plot initially disabled');

  // Enable plot
  layout.updateConfig({ showPlot: true });
  result = layout.calculateLayout();
  console.assert(result.potentialPlot !== null, 'Plot now enabled');

  console.log('✓ Config update test passed\n');
}

/**
 * Test convenience methods
 */
function testConvenienceMethods() {
  console.log('Test: Convenience methods');

  const layout = new CanvasLayout(800, 600, {
    showPlot: true,
    showPhaseWheel: true
  });

  const waveBounds = layout.getWavefunctionBounds();
  console.assert(waveBounds.width === 600, 'getWavefunctionBounds works');

  const plotBounds = layout.getPotentialPlotBounds();
  console.assert(plotBounds !== null, 'getPotentialPlotBounds works');
  console.assert(plotBounds.width === 200, 'Plot bounds correct');

  const wheelBounds = layout.getPhaseWheelBounds();
  console.assert(wheelBounds !== null, 'getPhaseWheelBounds works');

  // Test with disabled features
  layout.updateConfig({ showPlot: false, showPhaseWheel: false });
  console.assert(layout.getPotentialPlotBounds() === null, 'Returns null when disabled');
  console.assert(layout.getPhaseWheelBounds() === null, 'Returns null when disabled');

  console.log('✓ Convenience methods test passed\n');
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('Test: Edge cases');

  // Very small canvas
  const smallLayout = new CanvasLayout(100, 100, { showPlot: true });
  const result = smallLayout.calculateLayout();
  console.assert(result.wavefunction.width === 100, 'Handles small canvas');
  console.assert(result.potentialPlot.width === 0, 'Plot width is 0 when no space');

  // Square canvas
  const squareLayout = new CanvasLayout(600, 600, { showPlot: false });
  const squareResult = squareLayout.calculateLayout();
  console.assert(squareResult.wavefunction.width === 600, 'Handles square canvas');

  console.log('✓ Edge cases test passed\n');
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('=== CanvasLayout Test Suite ===\n');

  try {
    testBasicLayout();
    testLayoutWithPlot();
    testLayoutWithPhaseWheel();
    testHitTesting();
    testDimensionUpdate();
    testConfigUpdate();
    testConvenienceMethods();
    testEdgeCases();

    console.log('=== All tests passed! ===');
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  runAllTests();
} else {
  // Node environment (if we add Node support later)
  runAllTests();
}
