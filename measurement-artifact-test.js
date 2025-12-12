/**
 * Test FFT artifacts after measurements
 */

import { QuantumSimulation } from './js/quantum.js';

console.log('=== Measurement Artifact Test ===\n');

const gridSize = 32;
const dx = 10.0 / gridSize;
const dt = 0.01;

const sim = new QuantumSimulation(gridSize, dx, dt, 1.0, 1.0, 'periodic', 1.0);

sim.initialize({
    centerX: 16,
    centerY: 16,
    width: 0.6,
    momentumX: 1.0,
    momentumY: 0.6
});

console.log('Before measurement:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);

// Get probability distribution
let maxProb = 0;
let minNonZeroProb = Infinity;
for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
        const p = sim.getProbabilityAt(x, y);
        if (p > maxProb) maxProb = p;
        if (p > 1e-10 && p < minNonZeroProb) minNonZeroProb = p;
    }
}
console.log(`  Max probability: ${maxProb.toFixed(6)}`);
console.log(`  Min non-zero probability: ${minNonZeroProb.toFixed(6)}`);
console.log(`  Dynamic range: ${(maxProb / minNonZeroProb).toFixed(2)}x`);

// Perform a negative measurement (zero out a point)
console.log('\nPerforming negative measurement at (20, 20)...');
sim.collapseNegative(20, 20);

console.log('\nImmediately after measurement:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Probability at (20, 20): ${sim.getProbabilityAt(20, 20).toFixed(10)}`);
console.log(`  Probability at (19, 20): ${sim.getProbabilityAt(19, 20).toFixed(6)}`);
console.log(`  Probability at (21, 20): ${sim.getProbabilityAt(21, 20).toFixed(6)}`);

// Take a few steps
console.log('\nTaking 5 time steps...');
for (let i = 0; i < 5; i++) {
    sim.step();
}

console.log('\nAfter 5 steps:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Probability at (20, 20): ${sim.getProbabilityAt(20, 20).toFixed(6)}`);
console.log(`  Probability at (19, 20): ${sim.getProbabilityAt(19, 20).toFixed(6)}`);
console.log(`  Probability at (21, 20): ${sim.getProbabilityAt(21, 20).toFixed(6)}`);

// Check for negative probabilities or NaN (signs of numerical instability)
let hasNegative = false;
let hasNaN = false;
for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
        const p = sim.getProbabilityAt(x, y);
        if (p < 0) hasNegative = true;
        if (isNaN(p)) hasNaN = true;
    }
}

if (hasNegative) console.log('\n⚠ WARNING: Negative probabilities detected!');
if (hasNaN) console.log('\n⚠ WARNING: NaN values detected!');
if (!hasNegative && !hasNaN) console.log('\n✓ No numerical instabilities detected');

// Check if the hole "heals" (fills in) due to FFT spreading
console.log('\nTaking 20 more steps...');
for (let i = 0; i < 20; i++) {
    sim.step();
}

console.log('\nAfter 25 total steps:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Probability at (20, 20): ${sim.getProbabilityAt(20, 20).toFixed(6)}`);
console.log('  (The zeroed point should fill back in due to quantum spreading)');

if (sim.getProbabilityAt(20, 20) > 1e-6) {
    console.log('\n✓ Hole has filled in (expected behavior)');
} else {
    console.log('\n⚠ Hole remains empty (unexpected)');
}

console.log('\n=== Testing positive measurement (collapse to point) ===');

// Reset
sim.initialize({
    centerX: 16,
    centerY: 16,
    width: 0.6,
    momentumX: 1.0,
    momentumY: 0.6
});

console.log('\nBefore collapse:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);

// Collapse to a single point
sim.collapsePositive(16, 16);

console.log('\nAfter collapse to (16, 16):');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Probability at (16, 16): ${sim.getProbabilityAt(16, 16).toFixed(6)}`);
console.log(`  Probability at (15, 16): ${sim.getProbabilityAt(15, 16).toFixed(10)}`);

// Evolve the delta function
console.log('\nEvolving delta function for 10 steps...');
for (let i = 0; i < 10; i++) {
    sim.step();
}

console.log('\nAfter 10 steps:');
console.log(`  Total probability: ${sim.getTotalProbability().toFixed(8)}`);
console.log(`  Max probability: ${Math.max(...Array.from({length: gridSize * gridSize}, (_, i) =>
    sim.getProbabilityAt(i % gridSize, Math.floor(i / gridSize)))).toFixed(6)}`);

console.log('\nNote: A delta function has infinite momentum spread,');
console.log('which can cause aliasing artifacts on a finite grid.');

console.log('\nDone.');
