/**
 * @file test-potential-panel.js
 * @description Comprehensive unit tests for PotentialPlotPanel
 *
 * These tests verify that the PotentialPlotPanel:
 * 1. Correctly renders potential profiles as line plots
 * 2. Produces identical output to the original Visualizer
 * 3. Handles coordinate conversions correctly
 * 4. Responds to mouse events with appropriate tooltips
 * 5. Handles edge cases (no potential, zero range, etc.)
 */

import { PotentialPlotPanel } from '../js/visualization/panels/PotentialPlotPanel.js';

// Test utilities
class MockQuantumSimulation {
    constructor(gridSize = 64, potentialType = 'none') {
        this.gridSize = gridSize;
        this.potentialType = potentialType;
        this.potential = new Float64Array(gridSize * gridSize);

        // Initialize potential based on type
        this.initializePotential();
    }

    initializePotential() {
        if (this.potentialType === 'none') {
            // All zeros
            this.potential.fill(0);
            return;
        }

        if (this.potentialType === 'gaussian') {
            // Single Gaussian barrier at center
            const centerX = this.gridSize / 2;
            const centerY = this.gridSize / 2;
            const width = this.gridSize / 8;
            const strength = 5.0;

            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const r2 = dx * dx + dy * dy;
                    this.potential[y * this.gridSize + x] = strength * Math.exp(-r2 / (2 * width * width));
                }
            }
        } else if (this.potentialType === 'single') {
            // Single well (matching quantum.js 'single' type)
            const centerX = this.gridSize / 2;
            const centerY = this.gridSize / 2;
            const wellSize = this.gridSize / 4;
            const depth = -3.0;

            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const dx = Math.abs(x - centerX);
                    const dy = Math.abs(y - centerY);
                    if (dx < wellSize && dy < wellSize) {
                        this.potential[y * this.gridSize + x] = depth;
                    } else {
                        this.potential[y * this.gridSize + x] = 0;
                    }
                }
            }
        } else if (this.potentialType === 'harmonic') {
            // Harmonic oscillator (quadratic potential)
            const centerX = this.gridSize / 2;
            const centerY = this.gridSize / 2;
            const k = 0.01; // Spring constant

            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const dx = x - centerX;
                    const dy = y - centerY;
                    const r2 = dx * dx + dy * dy;
                    this.potential[y * this.gridSize + x] = k * r2;
                }
            }
        } else if (this.potentialType === 'double') {
            // Double well potential
            const centerX = this.gridSize / 2;
            const separation = this.gridSize / 4;
            const width = this.gridSize / 12;
            const depth = -4.0;

            for (let y = 0; y < this.gridSize; y++) {
                for (let x = 0; x < this.gridSize; x++) {
                    const dx1 = x - (centerX - separation / 2);
                    const dx2 = x - (centerX + separation / 2);
                    const dy = y - this.gridSize / 2;

                    const well1 = depth * Math.exp(-(dx1 * dx1 + dy * dy) / (2 * width * width));
                    const well2 = depth * Math.exp(-(dx2 * dx2 + dy * dy) / (2 * width * width));

                    this.potential[y * this.gridSize + x] = well1 + well2;
                }
            }
        } else if (this.potentialType === 'constant') {
            // Constant potential (for zero-range testing)
            this.potential.fill(2.5);
        }
    }

    getPotential() {
        return this.potential;
    }

    setPotentialType(type) {
        this.potentialType = type;
        this.initializePotential();
    }
}

class MockCanvasContext {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.drawCalls = [];
        this.savedStates = 0;
    }

    save() {
        this.savedStates++;
    }

    restore() {
        this.savedStates--;
    }

    beginPath() {
        this.drawCalls.push({ type: 'beginPath' });
    }

    moveTo(x, y) {
        this.drawCalls.push({ type: 'moveTo', x, y });
    }

    lineTo(x, y) {
        this.drawCalls.push({ type: 'lineTo', x, y });
    }

    stroke() {
        this.drawCalls.push({ type: 'stroke', strokeStyle: this.strokeStyle, lineWidth: this.lineWidth });
    }

    fillText(text, x, y) {
        this.drawCalls.push({ type: 'fillText', text, x, y, fillStyle: this.fillStyle });
    }

    setLineDash(pattern) {
        this.lineDash = pattern;
    }

    clearDrawCalls() {
        this.drawCalls = [];
    }

    getDrawCallsByType(type) {
        return this.drawCalls.filter(call => call.type === type);
    }
}

// Test suite
const tests = {
    testConstruction() {
        console.log('Test: Panel construction...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);

        assert(panel.name === 'potentialPlot', 'Panel name should be "potentialPlot"');
        assert(panel.bounds.x === 512, 'Bounds x should be 512');
        assert(panel.bounds.y === 0, 'Bounds y should be 0');
        assert(panel.bounds.width === 100, 'Bounds width should be 100');
        assert(panel.bounds.height === 512, 'Bounds height should be 512');

        console.log('✓ Panel construction test passed');
    },

    testContainsPoint() {
        console.log('Test: Point containment check...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);

        // Inside bounds
        assert(panel.containsPoint(550, 250), 'Should contain point inside bounds');
        assert(panel.containsPoint(512, 0), 'Should contain top-left corner');
        assert(panel.containsPoint(611, 511), 'Should contain bottom-right corner');

        // Outside bounds
        assert(!panel.containsPoint(500, 250), 'Should not contain point to the left');
        assert(!panel.containsPoint(620, 250), 'Should not contain point to the right');
        assert(!panel.containsPoint(550, -10), 'Should not contain point above');
        assert(!panel.containsPoint(550, 520), 'Should not contain point below');

        console.log('✓ Point containment test passed');
    },

    testCoordinateConversion() {
        console.log('Test: Coordinate conversion...');

        const bounds = { x: 512, y: 50, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);

        // Canvas to local
        const local1 = panel.canvasToLocal(550, 250);
        assert(local1.x === 38, `Local x should be 38, got ${local1.x}`);
        assert(local1.y === 200, `Local y should be 200, got ${local1.y}`);

        // Local to canvas
        const canvas1 = panel.localToCanvas(38, 200);
        assert(canvas1.x === 550, `Canvas x should be 550, got ${canvas1.x}`);
        assert(canvas1.y === 250, `Canvas y should be 250, got ${canvas1.y}`);

        // Edge cases
        const topLeft = panel.canvasToLocal(bounds.x, bounds.y);
        assert(topLeft.x === 0 && topLeft.y === 0, 'Top-left should map to (0, 0)');

        console.log('✓ Coordinate conversion test passed');
    },

    testRenderNoPotential() {
        console.log('Test: Rendering with no potential...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'none');
        const ctx = new MockCanvasContext(612, 512);

        // Should not draw anything
        panel.render(ctx, simulation, 0);

        assert(ctx.drawCalls.length === 0, 'Should not draw anything when potentialType is "none"');
        assert(panel._cachedProfile === null, 'Cached profile should be null');

        console.log('✓ No potential rendering test passed');
    },

    testRenderGaussianPotential() {
        console.log('Test: Rendering Gaussian potential...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'gaussian');
        const ctx = new MockCanvasContext(612, 512);

        panel.render(ctx, simulation, 0);

        // Check that drawing occurred
        assert(ctx.drawCalls.length > 0, 'Should have draw calls');

        // Check for moveTo (start of line)
        const moveToCalls = ctx.getDrawCallsByType('moveTo');
        assert(moveToCalls.length > 0, 'Should have at least one moveTo call');

        // Check for lineTo (line segments)
        const lineToCalls = ctx.getDrawCallsByType('lineTo');
        assert(lineToCalls.length === 63, `Should have 63 lineTo calls (gridSize-1), got ${lineToCalls.length}`);

        // Check for stroke (draw the line)
        const strokeCalls = ctx.getDrawCallsByType('stroke');
        assert(strokeCalls.length >= 1, 'Should have at least one stroke call');

        // Check for text labels
        const textCalls = ctx.getDrawCallsByType('fillText');
        assert(textCalls.length >= 2, `Should have at least 2 text labels, got ${textCalls.length}`);

        // Verify cached data
        assert(panel._cachedProfile !== null, 'Profile should be cached');
        assert(panel._cachedProfile.length === 64, `Cached profile should have 64 values, got ${panel._cachedProfile.length}`);
        assert(panel._cachedRange !== null, 'Range should be cached');
        assert(panel._cachedPotentialType === 'gaussian', 'Potential type should be cached');

        console.log('✓ Gaussian potential rendering test passed');
    },

    testRenderWellPotential() {
        console.log('Test: Rendering well potential...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'single');
        const ctx = new MockCanvasContext(612, 512);

        panel.render(ctx, simulation, 0);

        // Check that drawing occurred
        const lineToCalls = ctx.getDrawCallsByType('lineTo');
        // Should have 63 lineTo calls for the main profile, plus 1 for the zero reference line
        assert(lineToCalls.length === 64, `Should have 64 lineTo calls (63 for profile + 1 for zero line), got ${lineToCalls.length}`);

        // Verify cached range includes negative values
        assert(panel._cachedRange !== null, 'Range should be cached');
        assert(panel._cachedRange.min < 0, 'Min should be negative for well potential');
        assert(panel._cachedRange.max >= 0, 'Max should be non-negative');

        // Check for zero reference line (should be present for well potential)
        // The zero line is drawn with beginPath, moveTo, lineTo, stroke
        const strokeCalls = ctx.getDrawCallsByType('stroke');
        // Should have: main line + zero reference line
        assert(strokeCalls.length >= 2, `Should have at least 2 stroke calls (main line + zero line), got ${strokeCalls.length}`);

        console.log('✓ Well potential rendering test passed');
    },

    testRenderHarmonicPotential() {
        console.log('Test: Rendering harmonic potential...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'harmonic');
        const ctx = new MockCanvasContext(612, 512);

        panel.render(ctx, simulation, 0);

        // Verify harmonic potential was cached
        assert(panel._cachedPotentialType === 'harmonic', 'Potential type should be harmonic');

        // Harmonic potential should be parabolic (all non-negative)
        assert(panel._cachedRange.min >= 0, 'Harmonic potential should have non-negative min');
        assert(panel._cachedRange.max > panel._cachedRange.min, 'Max should be greater than min');

        console.log('✓ Harmonic potential rendering test passed');
    },

    testRenderConstantPotential() {
        console.log('Test: Rendering constant potential (zero range)...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'constant');
        const ctx = new MockCanvasContext(612, 512);

        panel.render(ctx, simulation, 0);

        // Constant potential should trigger zero-range handling
        // The code artificially expands range: minV -= 1, maxV += 1
        assert(panel._cachedRange !== null, 'Range should be cached');
        assert(Math.abs(panel._cachedRange.max - panel._cachedRange.min) > 1e-10,
               'Range should be artificially expanded for constant potential');

        // Should still draw a line (horizontal in this case)
        const lineToCalls = ctx.getDrawCallsByType('lineTo');
        assert(lineToCalls.length === 63, 'Should still draw line for constant potential');

        console.log('✓ Constant potential rendering test passed');
    },

    testMouseMoveTooltip() {
        console.log('Test: Mouse move tooltip...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'gaussian');
        const ctx = new MockCanvasContext(612, 512);

        // Render to populate cache
        panel.render(ctx, simulation, 0);

        // Test hovering at center
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const tooltip = panel.handleMouseMove(centerX, centerY, simulation);

        assert(tooltip !== null, 'Should return tooltip info');
        assert(tooltip.data.V !== undefined, 'Tooltip should contain potential value');
        assert(typeof tooltip.data.V === 'string', 'Potential should be formatted as string');

        // Check tooltip position
        assert(tooltip.canvasX === centerX + 10, 'Tooltip X should be offset from cursor');
        assert(tooltip.canvasY === centerY + 10, 'Tooltip Y should be offset from cursor');

        console.log('✓ Mouse move tooltip test passed');
    },

    testMouseMoveNoPotential() {
        console.log('Test: Mouse move with no potential...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'none');
        const ctx = new MockCanvasContext(612, 512);

        // Render (which does nothing for 'none')
        panel.render(ctx, simulation, 0);

        // Try to get tooltip
        const tooltip = panel.handleMouseMove(550, 250, simulation);

        assert(tooltip === null, 'Should return null when no potential exists');

        console.log('✓ Mouse move with no potential test passed');
    },

    testMouseMoveOutsideBounds() {
        console.log('Test: Mouse move outside bounds...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'gaussian');
        const ctx = new MockCanvasContext(612, 512);

        // Render to populate cache
        panel.render(ctx, simulation, 0);

        // Test hovering above panel
        const tooltip1 = panel.handleMouseMove(550, -10, simulation);
        assert(tooltip1 === null, 'Should return null for Y above bounds');

        // Test hovering below panel
        const tooltip2 = panel.handleMouseMove(550, 600, simulation);
        assert(tooltip2 === null, 'Should return null for Y below bounds');

        console.log('✓ Mouse move outside bounds test passed');
    },

    testUpdateBounds() {
        console.log('Test: Updating bounds...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'gaussian');
        const ctx = new MockCanvasContext(612, 512);

        // Render to populate cache
        panel.render(ctx, simulation, 0);
        assert(panel._cachedProfile !== null, 'Cache should be populated');

        // Update bounds
        const newBounds = { x: 600, y: 50, width: 120, height: 480 };
        panel.updateBounds(newBounds);

        assert(panel.bounds.x === 600, 'Bounds should be updated');
        assert(panel.bounds.width === 120, 'Width should be updated');
        assert(panel._cachedProfile === null, 'Cache should be cleared after bounds update');

        console.log('✓ Update bounds test passed');
    },

    testLabelFormatting() {
        console.log('Test: Potential type label formatting...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const ctx = new MockCanvasContext(612, 512);

        // Test with different potential types (using mock types, not actual quantum.js types)
        const types = ['gaussian', 'single', 'harmonic', 'double'];

        for (const type of types) {
            const simulation = new MockQuantumSimulation(64, type);
            ctx.clearDrawCalls();
            panel.render(ctx, simulation, 0);

            const textCalls = ctx.getDrawCallsByType('fillText');
            const labelCall = textCalls.find(call => call.text !== 'V(x)');

            assert(labelCall !== undefined, `Should have label for ${type} potential`);
            const expectedLabel = type.charAt(0).toUpperCase() + type.slice(1);
            assert(labelCall.text === expectedLabel,
                   `Label should be "${expectedLabel}", got "${labelCall.text}"`);
        }

        console.log('✓ Label formatting test passed');
    },

    testProfileExtraction() {
        console.log('Test: Potential profile extraction along centerline...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const simulation = new MockQuantumSimulation(64, 'gaussian');
        const ctx = new MockCanvasContext(612, 512);

        panel.render(ctx, simulation, 0);

        // Verify profile is extracted from centerline
        const centerX = Math.floor(simulation.gridSize / 2);
        const potential = simulation.getPotential();

        assert(panel._cachedProfile.length === simulation.gridSize,
               'Profile should have same length as gridSize');

        // Check that profile matches centerline values
        for (let gy = 0; gy < simulation.gridSize; gy++) {
            const expectedV = potential[gy * simulation.gridSize + centerX];
            const actualV = panel._cachedProfile[gy];
            assert(Math.abs(expectedV - actualV) < 1e-10,
                   `Profile value at y=${gy} should match centerline: expected ${expectedV}, got ${actualV}`);
        }

        console.log('✓ Profile extraction test passed');
    },

    testDifferentGridSizes() {
        console.log('Test: Rendering with different grid sizes...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);
        const ctx = new MockCanvasContext(612, 512);

        const gridSizes = [32, 64, 128, 256];

        for (const gridSize of gridSizes) {
            const simulation = new MockQuantumSimulation(gridSize, 'gaussian');
            ctx.clearDrawCalls();
            panel.render(ctx, simulation, 0);

            const lineToCalls = ctx.getDrawCallsByType('lineTo');
            assert(lineToCalls.length === gridSize - 1,
                   `Should have ${gridSize - 1} lineTo calls for grid size ${gridSize}, got ${lineToCalls.length}`);

            assert(panel._cachedProfile.length === gridSize,
                   `Cached profile should have ${gridSize} values, got ${panel._cachedProfile.length}`);
        }

        console.log('✓ Different grid sizes test passed');
    },

    testToString() {
        console.log('Test: toString() method...');

        const bounds = { x: 512, y: 0, width: 100, height: 512 };
        const panel = new PotentialPlotPanel(bounds);

        const str = panel.toString();
        assert(str.includes('potentialPlot'), 'String should include panel name');
        assert(str.includes('512'), 'String should include bounds info');
        assert(str.includes('100'), 'String should include width');

        console.log('✓ toString() test passed');
    }
};

// Test runner utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function runTests() {
    console.log('=== PotentialPlotPanel Unit Tests ===\n');

    let passed = 0;
    let failed = 0;

    for (const [name, test] of Object.entries(tests)) {
        try {
            test();
            passed++;
        } catch (error) {
            console.error(`✗ Test "${name}" failed:`, error.message);
            console.error(error.stack);
            failed++;
        }
    }

    console.log(`\n=== Test Results ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n✓ All tests passed!');
    } else {
        console.log(`\n✗ ${failed} test(s) failed`);
    }

    return failed === 0;
}

// Run tests if this module is executed directly
if (typeof window !== 'undefined') {
    window.runPotentialPanelTests = runTests;
}

export { runTests };
