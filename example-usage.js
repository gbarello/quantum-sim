/**
 * example-usage.js - Example usage of the QuantumSimulation class
 *
 * This file demonstrates how to:
 * - Create a quantum simulation
 * - Initialize a Gaussian wavepacket
 * - Evolve the wavefunction in time
 * - Perform measurements
 * - Query probability distributions and phases
 */

import { QuantumSimulation } from './js/quantum.js';

console.log('='.repeat(60));
console.log('Quantum Simulation Example Usage');
console.log('='.repeat(60));

// ============================================================================
// Example 1: Basic Initialization and Evolution
// ============================================================================
console.log('\n--- Example 1: Basic Initialization ---');

// Create a 64x64 quantum simulation
const sim = new QuantumSimulation(
    64,    // gridSize (must be power of 2)
    0.1,   // dx (spatial step)
    0.005, // dt (time step)
    1.0,   // hbar (natural units)
    1.0,   // mass (natural units)
    'periodic',  // boundary condition
    1.0    // timeScale
);

console.log('Grid size:', sim.gridSize);
console.log('Domain size:', sim.domainSize.toFixed(2));
console.log('Time step:', sim.dt);
console.log('Initial total probability:', sim.getTotalProbability().toFixed(6));

// ============================================================================
// Example 2: Probability Distribution
// ============================================================================
console.log('\n--- Example 2: Probability Distribution ---');

const centerX = Math.floor(sim.gridSize / 2);
const centerY = Math.floor(sim.gridSize / 2);

console.log('Center position: (', centerX, ',', centerY, ')');
console.log('Probability at center:', sim.getProbabilityAt(centerX, centerY).toFixed(6));
console.log('Probability at corner (0,0):', sim.getProbabilityAt(0, 0).toExponential(3));

// Get full probability density
const density = sim.getProbabilityDensity();
console.log('Density array length:', density.length, '(should be', sim.gridSize * sim.gridSize, ')');

// ============================================================================
// Example 3: Time Evolution
// ============================================================================
console.log('\n--- Example 3: Time Evolution ---');

console.log('Evolving wavefunction...');
const initialCenterProb = sim.getProbabilityAt(centerX, centerY);

// Evolve for 100 time steps
for (let i = 0; i < 100; i++) {
    sim.step();
}

const finalCenterProb = sim.getProbabilityAt(centerX, centerY);
console.log('Initial center probability:', initialCenterProb.toFixed(6));
console.log('Final center probability:', finalCenterProb.toFixed(6));
console.log('Probability decreased by factor:', (initialCenterProb / finalCenterProb).toFixed(2));
console.log('Current time:', sim.getTime().toFixed(3));
console.log('Total probability (unitarity check):', sim.getTotalProbability().toFixed(8));

// ============================================================================
// Example 4: Phase Information
// ============================================================================
console.log('\n--- Example 4: Phase Information ---');

const phaseArray = sim.getPhase();
const centerPhase = phaseArray[centerY * sim.gridSize + centerX];
console.log('Phase at center:', centerPhase.toFixed(3), 'radians');
console.log('Phase at corner (0,0):', phaseArray[0].toFixed(3), 'radians');

// ============================================================================
// Example 5: Quantum Measurement
// ============================================================================
console.log('\n--- Example 5: Quantum Measurement ---');

// Reset to initial state
sim.reset();
console.log('Reset simulation to initial state');

// Attempt measurement at center (high probability)
const probBefore = sim.getProbabilityAt(centerX, centerY);
console.log('Probability at center before measurement:', probBefore.toFixed(6));

const result = sim.measure(centerX, centerY);
console.log('Measurement result:', result.found ? 'FOUND' : 'NOT FOUND');
console.log('Measurement probability was:', result.probability.toFixed(6));

const probAfter = sim.getProbabilityAt(centerX, centerY);
if (result.found) {
    console.log('After positive collapse, center probability:', probAfter.toFixed(6));
    console.log('Expected ~1.0 (localized to single grid square)');
} else {
    console.log('After negative collapse, center probability:', probAfter.toFixed(6));
    console.log('Expected ~0.0 (particle not found here)');
}
console.log('Total probability after measurement:', sim.getTotalProbability().toFixed(8));

// ============================================================================
// Example 6: Multiple Measurements Statistics
// ============================================================================
console.log('\n--- Example 6: Born Rule Statistics ---');

const numTrials = 1000;
let foundCount = 0;

for (let i = 0; i < numTrials; i++) {
    sim.reset();
    const result = sim.measure(centerX, centerY);
    if (result.found) {
        foundCount++;
    }
}

sim.reset(); // Reset one more time to get expected probability
const expectedProb = sim.getProbabilityAt(centerX, centerY);
const observedFrequency = foundCount / numTrials;

console.log('Number of trials:', numTrials);
console.log('Times particle found:', foundCount);
console.log('Observed frequency:', observedFrequency.toFixed(4));
console.log('Expected probability:', expectedProb.toFixed(4));
console.log('Agreement:', (Math.abs(observedFrequency - expectedProb) < 0.01 ? 'GOOD' : 'POOR'));

// ============================================================================
// Example 7: Custom Initialization
// ============================================================================
console.log('\n--- Example 7: Custom Initialization ---');

// Initialize with a Gaussian at a different position with momentum
sim.initialize({
    centerX: 20,      // Off-center position
    centerY: 32,
    width: 2.0,       // Narrower wavepacket
    momentumX: 1.0,   // Initial momentum in x-direction
    momentumY: 0.5    // Initial momentum in y-direction
});

console.log('Initialized custom wavepacket:');
console.log('  Center: (20, 32)');
console.log('  Width: 2.0');
console.log('  Momentum: (1.0, 0.5)');
console.log('  Probability at (20, 32):', sim.getProbabilityAt(20, 32).toFixed(6));
console.log('  Total probability:', sim.getTotalProbability().toFixed(8));

// Evolve and watch it move due to momentum
console.log('Evolving for 50 steps...');
for (let i = 0; i < 50; i++) {
    sim.step();
}

// Find where the peak moved to
let maxProb = 0;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < sim.gridSize; y++) {
    for (let x = 0; x < sim.gridSize; x++) {
        const prob = sim.getProbabilityAt(x, y);
        if (prob > maxProb) {
            maxProb = prob;
            maxX = x;
            maxY = y;
        }
    }
}

console.log('After evolution:');
console.log('  Peak probability location: (', maxX, ',', maxY, ')');
console.log('  Displacement from initial: dx=', maxX - 20, ', dy=', maxY - 32);
console.log('  (Should move in direction of momentum)');

// ============================================================================
// Example 8: Time Scale Control
// ============================================================================
console.log('\n--- Example 8: Time Scale Control ---');

sim.reset();
const normalTime = sim.getTime();
sim.step();
const timeAfterOneStep = sim.getTime();
const normalDeltaT = timeAfterOneStep - normalTime;

sim.reset();
sim.setTimeScale(2.0);
console.log('Set time scale to 2.0 (2x faster evolution)');
sim.step();
const fastTimeAfterOneStep = sim.getTime();
const fastDeltaT = fastTimeAfterOneStep;

console.log('Normal dt:', normalDeltaT.toFixed(6));
console.log('Fast dt (2x):', fastDeltaT.toFixed(6));
console.log('Ratio:', (fastDeltaT / normalDeltaT).toFixed(2), '(should be 2.00)');

// ============================================================================
// Example 9: Parameter Inspection
// ============================================================================
console.log('\n--- Example 9: Get Simulation Parameters ---');

const params = sim.getParameters();
console.log('Simulation parameters:');
console.log('  Grid size:', params.gridSize);
console.log('  Spatial step (dx):', params.dx);
console.log('  Time step (dt):', params.dt);
console.log('  Effective time step:', params.dtEffective);
console.log('  Planck constant (hbar):', params.hbar);
console.log('  Mass:', params.mass);
console.log('  Boundary condition:', params.boundaryCondition);
console.log('  Time scale:', params.timeScale);
console.log('  Domain size:', params.domainSize.toFixed(2));
console.log('  Current time:', params.time.toFixed(6));

// ============================================================================
// Example 10: Negative Measurement (NOT found)
// ============================================================================
console.log('\n--- Example 10: Negative Measurement Example ---');

sim.reset();

// Force a negative measurement by measuring at a low-probability location
const lowProbX = 0;
const lowProbY = 0;
const lowProb = sim.getProbabilityAt(lowProbX, lowProbY);

console.log('Measuring at corner (0, 0) where probability is very low');
console.log('Probability before measurement:', lowProb.toExponential(3));

// Keep trying until we get a negative result (should happen quickly)
let attempts = 0;
let gotNegative = false;
while (!gotNegative && attempts < 100) {
    sim.reset();
    const result = sim.measure(lowProbX, lowProbY);
    attempts++;
    if (!result.found) {
        gotNegative = true;
        console.log('Got negative result after', attempts, 'attempt(s)');
        console.log('Probability at (0,0) after negative measurement:',
                   sim.getProbabilityAt(lowProbX, lowProbY).toExponential(3));
        console.log('This confirms particle is NOT at (0,0)');
        console.log('Total probability preserved:', sim.getTotalProbability().toFixed(8));
    }
}

console.log('\n' + '='.repeat(60));
console.log('All examples completed successfully!');
console.log('='.repeat(60));
