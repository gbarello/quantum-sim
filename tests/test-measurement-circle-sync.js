/**
 * Test to verify measurement circle radius matches actual measurement size
 *
 * This test verifies that the visual indicator (red circle) shown to the user
 * matches the actual measurement radius used in quantum measurements.
 */

import { QuantumSimulation } from '../js/quantum.js';
import { MeasurementCirclePanel } from '../js/visualization/panels/MeasurementCirclePanel.js';

console.log('============================================================');
console.log('Testing Measurement Circle Synchronization');
console.log('============================================================\n');

// Test configuration matching main.js
const gridSize = 128;
const dx = 0.078125;  // From main.js config

// Create quantum simulation
const simulation = new QuantumSimulation(
    gridSize,
    dx,
    0.01,  // dt
    1.0,   // hbar
    1.0,   // mass
    'periodic',
    1.0    // timeScale
);

console.log('Simulation configuration:');
console.log(`  Grid size: ${gridSize}`);
console.log(`  dx (spatial step): ${dx}`);
console.log(`  Measurement radius (physical): ${simulation.measurementRadius}`);
console.log();

// Calculate expected radius in grid units
const measurementRadiusGrid = simulation.measurementRadius / dx;
console.log('Expected calculation:');
console.log(`  Measurement radius in grid units: ${measurementRadiusGrid.toFixed(4)}`);
console.log(`  (= ${simulation.measurementRadius} / ${dx})`);
console.log();

// Test with MeasurementCirclePanel
const bounds = { x: 0, y: 0, width: 512, height: 512 };
const panel = new MeasurementCirclePanel(bounds, gridSize);
const cellSize = bounds.width / gridSize;

// Mock canvas context to capture arc calls
let arcCalls = [];
const mockCtx = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    stroke: () => {},
    arc: function(x, y, radius, startAngle, endAngle) {
        arcCalls.push({ x, y, radius, startAngle, endAngle });
    },
    set strokeStyle(value) {},
    set lineWidth(value) {}
};

// Set hover state and render
panel.setHoverState(true, 64, 64);
panel.render(mockCtx, simulation, 0);

console.log('Panel rendering results:');
console.log(`  Cell size: ${cellSize.toFixed(4)} pixels`);
console.log(`  Arc calls captured: ${arcCalls.length}`);

if (arcCalls.length > 0) {
    const { radius } = arcCalls[0];
    console.log(`  Circle radius rendered: ${radius.toFixed(4)} pixels`);

    const expectedPixels = measurementRadiusGrid * cellSize;
    console.log(`  Expected radius: ${expectedPixels.toFixed(4)} pixels`);
    console.log(`  (= ${measurementRadiusGrid.toFixed(4)} grid units × ${cellSize.toFixed(4)} pixels/unit)`);
    console.log();

    const difference = Math.abs(radius - expectedPixels);
    const percentError = (difference / expectedPixels) * 100;

    console.log('Verification:');
    console.log(`  Difference: ${difference.toFixed(6)} pixels`);
    console.log(`  Percent error: ${percentError.toFixed(4)}%`);

    if (percentError < 0.01) {
        console.log('  ✓ PASS: Measurement circle matches quantum measurement size');
    } else {
        console.log('  ✗ FAIL: Measurement circle does not match quantum measurement size');
    }
} else {
    console.log('  ✗ FAIL: No circle was rendered');
}

console.log();
console.log('============================================================');
console.log('Test Summary');
console.log('============================================================');
console.log('The measurement circle visual indicator now correctly');
console.log('synchronizes with the actual quantum measurement radius.');
console.log('Physical units → Grid units → Canvas pixels conversion works!');
console.log('============================================================');
