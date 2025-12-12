/**
 * Diagnostic script to check periodic boundary handling
 */

import { QuantumSimulation } from './js/quantum.js';

console.log('=== Periodic Boundary Diagnostic ===\n');

// Create a small simulation
const gridSize = 32;
const dx = 10.0 / gridSize;
const dt = 0.01;

const sim = new QuantumSimulation(gridSize, dx, dt, 1.0, 1.0, 'periodic', 1.0);

// Initialize with a Gaussian near the edge to test wrapping
sim.initialize({
    centerX: 5,  // Near left edge
    centerY: gridSize / 2,
    width: 0.6,
    momentumX: -1.0,  // Moving left (toward edge)
    momentumY: 0.0
});

console.log('Initial state:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Probability at (5, 16): ${sim.getProbabilityAt(5, 16).toFixed(6)}`);
console.log(`  Probability at (0, 16): ${sim.getProbabilityAt(0, 16).toFixed(6)}`);
console.log(`  Probability at (31, 16): ${sim.getProbabilityAt(31, 16).toFixed(6)}`);

// Evolve for several steps
console.log('\nEvolving...');
for (let i = 0; i < 50; i++) {
    sim.step();
}

console.log('\nAfter 50 steps:');
console.log(`  Time: ${sim.getTime().toFixed(3)}`);
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Probability at (5, 16): ${sim.getProbabilityAt(5, 16).toFixed(6)}`);
console.log(`  Probability at (0, 16): ${sim.getProbabilityAt(0, 16).toFixed(6)}`);
console.log(`  Probability at (31, 16): ${sim.getProbabilityAt(31, 16).toFixed(6)}`);

// Check if wavefunction has wrapped around
const leftEdge = sim.getProbabilityAt(0, 16);
const rightEdge = sim.getProbabilityAt(31, 16);

if (leftEdge > 1e-6 || rightEdge > 1e-6) {
    console.log('\n✓ Wavefunction has reached edges (periodic wrapping occurring)');
} else {
    console.log('\n• Wavefunction has not reached edges yet');
}

// Test measurement near edge
console.log('\n=== Testing measurement near edge ===');
const result = sim.measure(2, 16);
console.log(`  Measurement at (2, 16): ${result.found ? 'FOUND' : 'NOT FOUND'}`);
console.log(`  Probability was: ${result.probability.toFixed(6)}`);
console.log(`  Total probability after: ${sim.getTotalProbability().toFixed(8)}`);

// Check for anomalies
if (Math.abs(sim.getTotalProbability() - 1.0) > 0.01) {
    console.log('\n⚠ WARNING: Total probability deviates from 1.0!');
}

console.log('\n=== Checking edge continuity ===');
// For periodic boundaries, edges should be continuous
// Check a few rows
for (let y = 10; y < 20; y++) {
    const left = sim.getProbabilityAt(0, y);
    const right = sim.getProbabilityAt(31, y);
    if (Math.abs(left - right) > 0.01 && (left > 1e-6 || right > 1e-6)) {
        console.log(`  Row ${y}: Discontinuity detected! Left=${left.toFixed(6)}, Right=${right.toFixed(6)}`);
    }
}

console.log('\nDone.');
