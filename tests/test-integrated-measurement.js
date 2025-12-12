/**
 * Test integrated measurement probability
 */

import { QuantumSimulation } from './js/quantum.js';

console.log('=== Testing Integrated Measurement Probability ===\n');

const gridSize = 32;
const dx = 10.0 / gridSize;
const dt = 0.01;

const sim = new QuantumSimulation(gridSize, dx, dt, 1.0, 1.0, 'periodic', 1.0);

// Initialize with centered Gaussian
sim.initialize({
    centerX: 16,
    centerY: 16,
    width: 0.6,
    momentumX: 0,
    momentumY: 0
});

console.log('Centered Gaussian wavepacket');
console.log(`Grid: ${gridSize}×${gridSize}`);
console.log(`Total probability: ${sim.getTotalProbability().toFixed(6)}\n`);

// Test with different measurement radii
const radii = [0.5, 1.5, 3.0, 5.0];

console.log('Measuring at center (16, 16) with different radii:\n');

for (const radius of radii) {
    // Reset to same initial state
    sim.initialize({
        centerX: 16,
        centerY: 16,
        width: 0.6,
        momentumX: 0,
        momentumY: 0
    });

    sim.setMeasurementRadius(radius);

    // Perform measurement
    const result = sim.measure(16, 16);

    console.log(`Radius ${radius.toFixed(1)}:`);
    console.log(`  Integrated probability: ${(result.probability * 100).toFixed(2)}%`);
    console.log(`  Detection result: ${result.found ? 'FOUND ✓' : 'NOT FOUND'}`);
    console.log();
}

console.log('Expected behavior:');
console.log('- Larger radii should integrate more probability');
console.log('- Detection probability should increase with radius');
console.log('- At center of Gaussian, larger detectors catch more of the wavepacket');

console.log('\n=== Testing off-center measurement ===\n');

// Test measurement away from center
sim.initialize({
    centerX: 16,
    centerY: 16,
    width: 0.6,
    momentumX: 0,
    momentumY: 0
});

console.log('Measuring at (20, 20) - offset from center:\n');

for (const radius of [1.5, 5.0]) {
    sim.initialize({
        centerX: 16,
        centerY: 16,
        width: 0.6,
        momentumX: 0,
        momentumY: 0
    });

    sim.setMeasurementRadius(radius);
    const result = sim.measure(20, 20);

    console.log(`Radius ${radius.toFixed(1)}:`);
    console.log(`  Integrated probability: ${(result.probability * 100).toFixed(2)}%`);
    console.log(`  Detection: ${result.found ? 'FOUND' : 'NOT FOUND'}`);
    console.log();
}

console.log('Expected: Larger radius should capture tail of Gaussian,');
console.log('giving higher detection probability even at (20, 20).');
