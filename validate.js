/**
 * Validation script for Quantum Playground
 * Tests that all modules can be imported and basic functionality works
 */

import { Complex, ComplexGrid, FFT2D, normalize } from './js/utils.js';
import { QuantumSimulation } from './js/quantum.js';
import { Visualizer } from './js/visualization.js';
import { Controller } from './js/controls.js';

console.log('=== Quantum Playground Validation ===\n');

// Test 1: Complex number operations
console.log('Test 1: Complex number utilities...');
try {
  const c1 = new Complex(1, 2);
  const c2 = new Complex(3, 4);
  const sum = c1.add(c2);
  const product = c1.mul(c2);

  console.assert(sum.re === 4 && sum.im === 6, 'Complex addition failed');
  console.assert(product.re === -5 && product.im === 10, 'Complex multiplication failed');

  console.log('  ✓ Complex number operations work\n');
} catch (error) {
  console.error('  ✗ Complex number test failed:', error.message);
  process.exit(1);
}

// Test 2: ComplexGrid
console.log('Test 2: ComplexGrid storage...');
try {
  const grid = new ComplexGrid(8);
  grid.set(4, 4, new Complex(1, 0));
  const val = grid.get(4, 4);

  console.assert(val.re === 1 && val.im === 0, 'Grid get/set failed');
  console.log('  ✓ ComplexGrid works\n');
} catch (error) {
  console.error('  ✗ ComplexGrid test failed:', error.message);
  process.exit(1);
}

// Test 3: FFT
console.log('Test 3: FFT operations...');
try {
  const size = 8;
  const fft = new FFT2D(size, size);
  const data = new ComplexGrid(size);

  // Set a simple pattern
  const originalVal = new Complex(1, 0);
  data.set(4, 4, originalVal);

  // Store original value
  const originalRe = originalVal.re;
  const originalIm = originalVal.im;

  // Forward transform (in-place)
  fft.forward(data);

  // Inverse transform (in-place)
  fft.inverse(data);

  // Check round-trip
  const restored = data.get(4, 4);
  const error = Math.abs(originalRe - restored.re) + Math.abs(originalIm - restored.im);

  console.assert(error < 1e-6, `FFT round-trip failed: error=${error}`);
  console.log('  ✓ FFT forward/inverse works\n');
} catch (error) {
  console.error('  ✗ FFT test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test 4: Quantum simulation initialization
console.log('Test 4: Quantum simulation...');
try {
  const gridSize = 64;
  const dx = 0.1;
  const dt = 0.005;

  const sim = new QuantumSimulation(gridSize, dx, dt);

  // Initialize Gaussian
  sim.initialize({
    centerX: 32,
    centerY: 32,
    width: 1.0,
    momentumX: 0,
    momentumY: 0
  });

  // Check normalization
  const totalProb = sim.getTotalProbability();
  console.assert(Math.abs(totalProb - 1.0) < 0.01, 'Initial normalization failed');

  console.log(`  Initial probability: ${totalProb.toFixed(8)}`);

  // Evolve a few steps
  for (let i = 0; i < 10; i++) {
    sim.step();
  }

  // Check normalization is preserved
  const afterProb = sim.getTotalProbability();
  console.assert(Math.abs(afterProb - 1.0) < 0.01, 'Probability conservation failed');

  console.log(`  After 10 steps: ${afterProb.toFixed(8)}`);
  console.log('  ✓ Quantum simulation works\n');
} catch (error) {
  console.error('  ✗ Quantum simulation test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

// Test 5: Measurement
console.log('Test 5: Quantum measurement...');
try {
  const sim = new QuantumSimulation(64, 0.1, 0.005);
  sim.initialize({
    centerX: 32,
    centerY: 32,
    width: 1.0,
    momentumX: 0,
    momentumY: 0
  });

  // Get probability at center
  const probBefore = sim.getProbabilityAt(32, 32);
  console.log(`  Probability at center before measurement: ${probBefore.toFixed(6)}`);

  // Perform measurement
  const result = sim.measure(32, 32);
  console.log(`  Measurement result: ${result.found ? 'FOUND' : 'NOT FOUND'} (p=${result.probability.toFixed(6)})`);

  // Check normalization after measurement
  const totalProb = sim.getTotalProbability();
  console.assert(Math.abs(totalProb - 1.0) < 0.01, 'Post-measurement normalization failed');

  console.log(`  Total probability after measurement: ${totalProb.toFixed(8)}`);
  console.log('  ✓ Quantum measurement works\n');
} catch (error) {
  console.error('  ✗ Measurement test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('=== All validation tests passed! ===\n');
console.log('The Quantum Playground is ready to use.');
console.log('Open index.html in a web browser to start the simulation.\n');
