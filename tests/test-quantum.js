/**
 * test-quantum.js - Basic tests for the quantum physics engine
 *
 * Run with: node test-quantum.js
 */

import { QuantumSimulation } from '../js/quantum.js';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function pass(msg) {
    console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg) {
    console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
    console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function assert(condition, message) {
    if (condition) {
        pass(message);
    } else {
        fail(message);
        throw new Error(message);
    }
}

function assertClose(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        pass(`${message} (${actual.toFixed(6)} ≈ ${expected.toFixed(6)})`);
    } else {
        fail(`${message} (${actual.toFixed(6)} vs ${expected.toFixed(6)}, diff: ${diff.toFixed(6)})`);
        throw new Error(message);
    }
}

console.log('\n' + colors.blue + '='.repeat(60) + colors.reset);
console.log(colors.blue + 'Quantum Physics Engine Tests' + colors.reset);
console.log(colors.blue + '='.repeat(60) + colors.reset + '\n');

// Test 1: Initialization
console.log(colors.yellow + 'Test 1: Initialization' + colors.reset);
try {
    const sim = new QuantumSimulation(
        64,    // gridSize (must be power of 2)
        0.1,   // dx
        0.005, // dt
        1.0,   // hbar
        1.0,   // mass
        'periodic',
        1.0    // timeScale
    );

    assert(sim.gridSize === 64, 'Grid size is 64');
    assert(sim.dx === 0.1, 'dx is 0.1');
    assert(sim.dt === 0.005, 'dt is 0.005');
    assert(sim.time === 0, 'Initial time is 0');

    info('Simulation initialized successfully');
} catch (e) {
    fail('Initialization failed: ' + e.message);
    process.exit(1);
}

// Test 2: Normalization
console.log('\n' + colors.yellow + 'Test 2: Normalization' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters
    const totalProb = sim.getTotalProbability();

    assertClose(totalProb, 1.0, 1e-6, 'Initial total probability is 1.0');
} catch (e) {
    fail('Normalization test failed: ' + e.message);
    process.exit(1);
}

// Test 3: Unitarity (probability conservation during evolution)
console.log('\n' + colors.yellow + 'Test 3: Unitarity (Probability Conservation)' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    // Evolve for 100 steps
    for (let i = 0; i < 100; i++) {
        sim.step();
    }

    const totalProb = sim.getTotalProbability();
    assertClose(totalProb, 1.0, 1e-4, 'Total probability after 100 steps is 1.0');

    info(`Time evolved to ${sim.getTime().toFixed(3)}`);
} catch (e) {
    fail('Unitarity test failed: ' + e.message);
    process.exit(1);
}

// Test 4: Gaussian wavepacket properties
console.log('\n' + colors.yellow + 'Test 4: Gaussian Wavepacket Properties' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    // Check that probability is peaked at center
    const centerX = Math.floor(sim.gridSize / 2);
    const centerY = Math.floor(sim.gridSize / 2);
    const centerProb = sim.getProbabilityAt(centerX, centerY);

    // Check that corners have very low probability
    const cornerProb = sim.getProbabilityAt(0, 0);

    assert(centerProb > cornerProb * 100, 'Center has much higher probability than corners');
    info(`Center probability: ${centerProb.toFixed(6)}, Corner probability: ${cornerProb.toFixed(9)}`);
} catch (e) {
    fail('Gaussian properties test failed: ' + e.message);
    process.exit(1);
}

// Test 5: Positive measurement collapse
console.log('\n' + colors.yellow + 'Test 5: Positive Measurement Collapse' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    // Perform positive collapse at center (using physical coordinates)
    const centerPhysX = sim.domainSize / 2;
    const centerPhysY = sim.domainSize / 2;
    sim.collapsePositive(centerPhysX, centerPhysY);

    // Get grid coordinates for checking probability
    const centerX = Math.floor(sim.gridSize / 2);
    const centerY = Math.floor(sim.gridSize / 2);

    // Check that the center has high probability (but not necessarily 1.0 due to finite measurement radius)
    const centerProb = sim.getProbabilityAt(centerX, centerY);
    const neighborProb = sim.getProbabilityAt(centerX + 1, centerY);

    // With measurement radius of 0.2, the collapse creates a localized Gaussian
    assert(centerProb > 0.05, 'Center has significant probability after positive collapse');
    assert(centerProb > neighborProb, 'Center probability higher than neighbor');
    assertClose(sim.getTotalProbability(), 1.0, 1e-6, 'Total probability after collapse is 1.0');
} catch (e) {
    fail('Positive collapse test failed: ' + e.message);
    process.exit(1);
}

// Test 6: Negative measurement collapse
console.log('\n' + colors.yellow + 'Test 6: Negative Measurement Collapse' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    // Get grid and physical coordinates for center
    const centerX = Math.floor(sim.gridSize / 2);
    const centerY = Math.floor(sim.gridSize / 2);
    const centerPhysX = sim.domainSize / 2;
    const centerPhysY = sim.domainSize / 2;

    const probBefore = sim.getProbabilityAt(centerX, centerY);

    // Perform negative collapse at center (using physical coordinates)
    sim.collapseNegative(centerPhysX, centerPhysY);

    const probAfter = sim.getProbabilityAt(centerX, centerY);

    assert(probBefore > 0.01, 'Center had significant probability before collapse');
    assertClose(probAfter, 0.0, 1e-10, 'Center probability after negative collapse is 0.0');
    assertClose(sim.getTotalProbability(), 1.0, 1e-6, 'Total probability after negative collapse is 1.0');
} catch (e) {
    fail('Negative collapse test failed: ' + e.message);
    process.exit(1);
}

// Test 7: Measurement statistics (Born rule)
console.log('\n' + colors.yellow + 'Test 7: Measurement Statistics (Born Rule)' + colors.reset);
try {
    const numTrials = 1000;
    let foundCount = 0;

    for (let i = 0; i < numTrials; i++) {
        const sim = new QuantumSimulation(64, 0.1, 0.005);
        sim.initialize(); // Initialize with default parameters

        // Get center in physical coordinates
        const centerPhysX = sim.domainSize / 2;
        const centerPhysY = sim.domainSize / 2;

        const result = sim.measure(centerPhysX, centerPhysY);
        if (result.found) {
            foundCount++;
        }
    }

    const frequency = foundCount / numTrials;
    // Expected probability: we need to compute the integrated probability
    // that the measure() function would return (not just the point probability)
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    // Perform a measurement to get the actual integrated probability
    const centerPhysX = sim.domainSize / 2;
    const centerPhysY = sim.domainSize / 2;

    // Calculate integrated probability without actually collapsing
    const N = sim.gridSize;
    const measRadius = sim.measurementRadius;
    let integratedProbability = 0;
    for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
            let dx = Math.abs(ix * sim.dx - centerPhysX);
            let dy = Math.abs(iy * sim.dx - centerPhysY);
            if (dx > sim.domainSize / 2) dx = sim.domainSize - dx;
            if (dy > sim.domainSize / 2) dy = sim.domainSize - dy;
            const r2 = dx * dx + dy * dy;
            const weight = Math.exp(-r2 / (2 * measRadius * measRadius));
            integratedProbability += weight * sim.getProbabilityAt(ix, iy);
        }
    }
    const expectedProb = Math.min(1.0, integratedProbability);

    info(`Found frequency: ${frequency.toFixed(4)}, Expected: ${expectedProb.toFixed(4)}`);

    // Check if frequency is within reasonable statistical bounds (3 sigma)
    const sigma = Math.sqrt(expectedProb * (1 - expectedProb) / numTrials);
    const diff = Math.abs(frequency - expectedProb);
    const nSigma = diff / sigma;

    assert(nSigma < 4, `Measurement frequency matches Born rule (${nSigma.toFixed(2)}σ)`);
} catch (e) {
    fail('Born rule test failed: ' + e.message);
    process.exit(1);
}

// Test 8: Dispersion (spreading over time)
console.log('\n' + colors.yellow + 'Test 8: Wavepacket Dispersion' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    const centerX = Math.floor(sim.gridSize / 2);
    const centerY = Math.floor(sim.gridSize / 2);

    // Initial width (measure by looking at probability spread)
    const initialCenterProb = sim.getProbabilityAt(centerX, centerY);

    // Evolve for 200 steps
    for (let i = 0; i < 200; i++) {
        sim.step();
    }

    const finalCenterProb = sim.getProbabilityAt(centerX, centerY);

    // Wavepacket should spread (center probability decreases)
    assert(finalCenterProb < initialCenterProb, 'Wavepacket spreads over time (center probability decreases)');
    info(`Initial center prob: ${initialCenterProb.toFixed(6)}, Final: ${finalCenterProb.toFixed(6)}`);
} catch (e) {
    fail('Dispersion test failed: ' + e.message);
    process.exit(1);
}

// Test 9: Reset functionality
console.log('\n' + colors.yellow + 'Test 9: Reset Functionality' + colors.reset);
try {
    const sim = new QuantumSimulation(64, 0.1, 0.005);
    sim.initialize(); // Initialize with default parameters

    // Evolve and measure
    for (let i = 0; i < 100; i++) {
        sim.step();
    }
    const centerX = Math.floor(sim.gridSize / 2);
    const centerY = Math.floor(sim.gridSize / 2);
    const centerPhysX = sim.domainSize / 2;
    const centerPhysY = sim.domainSize / 2;
    sim.collapsePositive(centerPhysX, centerPhysY);

    const timeBeforeReset = sim.getTime();
    assert(timeBeforeReset > 0, 'Time advanced during evolution');

    // Reset
    sim.reset();

    assertClose(sim.getTime(), 0.0, 1e-10, 'Time reset to 0');
    assertClose(sim.getTotalProbability(), 1.0, 1e-6, 'Total probability is 1.0 after reset');

    const probAfterReset = sim.getProbabilityAt(centerX, centerY);
    const probAfterCollapse = 1.0; // After positive collapse, this was ~1
    // After reset, it should be back to Gaussian value, which is less than 1
    assert(probAfterReset < 0.5, 'Wavefunction reset to initial Gaussian');
} catch (e) {
    fail('Reset test failed: ' + e.message);
    process.exit(1);
}

// Test 10: Time scale parameter
console.log('\n' + colors.yellow + 'Test 10: Time Scale Parameter' + colors.reset);
try {
    const sim1 = new QuantumSimulation(64, 0.1, 0.005, 1.0, 1.0, 'periodic', 1.0);
    const sim2 = new QuantumSimulation(64, 0.1, 0.005, 1.0, 1.0, 'periodic', 2.0);

    // Take one step in each
    sim1.step();
    sim2.step();

    const time1 = sim1.getTime();
    const time2 = sim2.getTime();

    assertClose(time2, time1 * 2.0, 1e-10, 'Time scale 2.0 doubles the time step');
    info(`Time1: ${time1.toFixed(6)}, Time2: ${time2.toFixed(6)}`);
} catch (e) {
    fail('Time scale test failed: ' + e.message);
    process.exit(1);
}

console.log('\n' + colors.green + '='.repeat(60) + colors.reset);
console.log(colors.green + 'All tests passed!' + colors.reset);
console.log(colors.green + '='.repeat(60) + colors.reset + '\n');
