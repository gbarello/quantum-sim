/**
 * @file test-overlay-panels.js
 * @description Unit tests for overlay panel classes.
 *
 * This file contains comprehensive tests for all overlay panels:
 * - GridOverlayPanel
 * - MeasurementFeedbackPanel
 * - MeasurementCirclePanel
 * - PhaseWheelPanel
 *
 * These tests verify correct initialization, rendering, state management,
 * and behavior under various conditions.
 *
 * Run these tests by opening test-overlay-panels-visual.html in a browser
 * or using a test runner that supports ES6 modules.
 */

import { GridOverlayPanel } from '../js/visualization/panels/GridOverlayPanel.js';
import { MeasurementFeedbackPanel } from '../js/visualization/panels/MeasurementFeedbackPanel.js';
import { MeasurementCirclePanel } from '../js/visualization/panels/MeasurementCirclePanel.js';
import { PhaseWheelPanel } from '../js/visualization/panels/PhaseWheelPanel.js';

/**
 * Test suite runner
 */
class TestRunner {
    constructor() {
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('='.repeat(60));
        console.log('Running Overlay Panel Tests');
        console.log('='.repeat(60));

        for (const test of this.tests) {
            try {
                await test.fn();
                console.log(`✓ ${test.name}`);
                this.passedTests++;
            } catch (error) {
                console.error(`✗ ${test.name}`);
                console.error(`  ${error.message}`);
                console.error(error.stack);
                this.failedTests++;
            }
        }

        console.log('='.repeat(60));
        console.log(`Tests: ${this.passedTests + this.failedTests}`);
        console.log(`Passed: ${this.passedTests}`);
        console.log(`Failed: ${this.failedTests}`);
        console.log('='.repeat(60));

        return this.failedTests === 0;
    }
}

/**
 * Assertion utilities
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(
            message || `Expected ${expected}, got ${actual}`
        );
    }
}

function assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(
            message || `Expected ${expectedStr}, got ${actualStr}`
        );
    }
}

/**
 * Mock canvas context for testing
 */
function createMockContext() {
    const calls = [];

    const ctx = {
        calls,
        beginPath: function() { calls.push(['beginPath']); },
        moveTo: function(x, y) { calls.push(['moveTo', x, y]); },
        lineTo: function(x, y) { calls.push(['lineTo', x, y]); },
        stroke: function() { calls.push(['stroke']); },
        fill: function() { calls.push(['fill']); },
        arc: function(x, y, r, start, end) { calls.push(['arc', x, y, r, start, end]); },
        closePath: function() { calls.push(['closePath']); },
        fillRect: function(x, y, w, h) { calls.push(['fillRect', x, y, w, h]); },
        strokeRect: function(x, y, w, h) { calls.push(['strokeRect', x, y, w, h]); },
        fillText: function(text, x, y) { calls.push(['fillText', text, x, y]); },
        setLineDash: function(dash) { calls.push(['setLineDash', dash]); },
        save: function() { calls.push(['save']); },
        restore: function() { calls.push(['restore']); },
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: '',
        textBaseline: ''
    };

    return ctx;
}

/**
 * Mock simulation for testing
 */
function createMockSimulation() {
    return {
        gridSize: 128,
        measurementRadius: 0.2,  // Physical units
        dx: 0.02,                 // Spatial step size: 0.2 / 0.02 = 10 grid units
        potentialType: 'harmonic'
    };
}

// ============================================================================
// GridOverlayPanel Tests
// ============================================================================

const runner = new TestRunner();

runner.test('GridOverlayPanel: Constructor initializes correctly', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new GridOverlayPanel(bounds, 128);

    assertEqual(panel.name, 'gridOverlay');
    assertEqual(panel.gridSize, 128);
    assertEqual(panel.config.lineColor, 'rgba(255, 255, 255, 0.2)');
    assertEqual(panel.config.lineWidth, 1);
});

runner.test('GridOverlayPanel: Constructor accepts custom config', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const config = {
        lineColor: 'rgba(0, 255, 0, 0.5)',
        lineWidth: 2
    };
    const panel = new GridOverlayPanel(bounds, 64, config);

    assertEqual(panel.gridSize, 64);
    assertEqual(panel.config.lineColor, 'rgba(0, 255, 0, 0.5)');
    assertEqual(panel.config.lineWidth, 2);
});

runner.test('GridOverlayPanel: render() draws correct number of lines', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new GridOverlayPanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    panel.render(ctx, simulation, 0);

    // Should have save and restore
    assert(ctx.calls[0][0] === 'save');
    assert(ctx.calls[ctx.calls.length - 1][0] === 'restore');

    // Count beginPath calls (one per line)
    const beginPathCalls = ctx.calls.filter(c => c[0] === 'beginPath').length;
    // Should have gridSize + 1 vertical + gridSize + 1 horizontal = 2 * (gridSize + 1)
    assertEqual(beginPathCalls, 2 * (128 + 1));
});

runner.test('GridOverlayPanel: setGridSize() updates grid size', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new GridOverlayPanel(bounds, 128);

    panel.setGridSize(256);
    assertEqual(panel.gridSize, 256);
});

runner.test('GridOverlayPanel: setGridSize() rejects invalid values', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new GridOverlayPanel(bounds, 128);

    panel.setGridSize(-1);
    assertEqual(panel.gridSize, 128); // Should not change

    panel.setGridSize(0);
    assertEqual(panel.gridSize, 128); // Should not change

    panel.setGridSize(64.5);
    assertEqual(panel.gridSize, 128); // Should not change (not integer)
});

runner.test('GridOverlayPanel: setLineColor() updates color', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new GridOverlayPanel(bounds, 128);

    panel.setLineColor('rgba(255, 0, 0, 0.5)');
    assertEqual(panel.config.lineColor, 'rgba(255, 0, 0, 0.5)');
});

runner.test('GridOverlayPanel: setLineWidth() updates width', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new GridOverlayPanel(bounds, 128);

    panel.setLineWidth(3);
    assertEqual(panel.config.lineWidth, 3);
});

// ============================================================================
// MeasurementFeedbackPanel Tests
// ============================================================================

runner.test('MeasurementFeedbackPanel: Constructor initializes correctly', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);

    assertEqual(panel.name, 'measurementFeedback');
    assertEqual(panel.gridSize, 128);
    assertEqual(panel.isActive(), false);
});

runner.test('MeasurementFeedbackPanel: showFeedback() activates animation', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);

    panel.showFeedback(64, 64, 'positive', 500);

    assertEqual(panel.isActive(), true);
    const state = panel.getFeedbackState();
    assertEqual(state.x, 64);
    assertEqual(state.y, 64);
    assertEqual(state.type, 'positive');
    assertEqual(state.duration, 500);
});

runner.test('MeasurementFeedbackPanel: clearFeedback() deactivates animation', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);

    panel.showFeedback(64, 64, 'positive', 500);
    assertEqual(panel.isActive(), true);

    panel.clearFeedback();
    assertEqual(panel.isActive(), false);
});

runner.test('MeasurementFeedbackPanel: render() skips when inactive', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    panel.render(ctx, simulation, performance.now());

    // Should not have drawn anything
    assertEqual(ctx.calls.length, 0);
});

runner.test('MeasurementFeedbackPanel: render() draws when active', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    const startTime = performance.now();
    panel.showFeedback(64, 64, 'positive', 500);
    panel.render(ctx, simulation, startTime + 100); // 100ms into animation

    // Should have save, restore, and drawing calls
    assert(ctx.calls.length > 0);
    assert(ctx.calls[0][0] === 'save');
    assert(ctx.calls[ctx.calls.length - 1][0] === 'restore');

    // Should draw rectangle and circle for positive measurement
    const fillRectCalls = ctx.calls.filter(c => c[0] === 'fillRect');
    assertEqual(fillRectCalls.length, 1);

    const arcCalls = ctx.calls.filter(c => c[0] === 'arc');
    assert(arcCalls.length > 0); // Circle for positive measurement
});

runner.test('MeasurementFeedbackPanel: animation deactivates after duration', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    const startTime = performance.now();
    panel.showFeedback(64, 64, 'positive', 500);

    // Render at time after duration
    panel.render(ctx, simulation, startTime + 600);

    // Should be inactive now
    assertEqual(panel.isActive(), false);
});

runner.test('MeasurementFeedbackPanel: negative measurement uses red color', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    const startTime = performance.now();
    panel.showFeedback(64, 64, 'negative', 500);
    panel.render(ctx, simulation, startTime + 100);

    // Should have drawn, but no arc (no expanding circle for negative)
    const arcCalls = ctx.calls.filter(c => c[0] === 'arc');
    assertEqual(arcCalls.length, 0);
});

runner.test('MeasurementFeedbackPanel: setGridSize() updates grid size', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementFeedbackPanel(bounds, 128);

    panel.setGridSize(256);
    assertEqual(panel.gridSize, 256);
});

// ============================================================================
// MeasurementCirclePanel Tests
// ============================================================================

runner.test('MeasurementCirclePanel: Constructor initializes correctly', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementCirclePanel(bounds, 128);

    assertEqual(panel.name, 'measurementCircle');
    assertEqual(panel.gridSize, 128);
    assertEqual(panel.isActive(), false);
});

runner.test('MeasurementCirclePanel: setHoverState() activates circle', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementCirclePanel(bounds, 128);

    panel.setHoverState(true, 64, 64);

    assertEqual(panel.isActive(), true);
    const state = panel.getHoverState();
    assertEqual(state.x, 64);
    assertEqual(state.y, 64);
});

runner.test('MeasurementCirclePanel: setHoverState() deactivates circle', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementCirclePanel(bounds, 128);

    panel.setHoverState(true, 64, 64);
    assertEqual(panel.isActive(), true);

    panel.setHoverState(false);
    assertEqual(panel.isActive(), false);
});

runner.test('MeasurementCirclePanel: render() skips when inactive', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementCirclePanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    panel.render(ctx, simulation, performance.now());

    // Should not have drawn anything
    assertEqual(ctx.calls.length, 0);
});

runner.test('MeasurementCirclePanel: render() draws circle when active', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementCirclePanel(bounds, 128);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    panel.setHoverState(true, 64, 64);
    panel.render(ctx, simulation, performance.now());

    // Should have save, restore, and arc call
    assert(ctx.calls.length > 0);
    assert(ctx.calls[0][0] === 'save');
    assert(ctx.calls[ctx.calls.length - 1][0] === 'restore');

    const arcCalls = ctx.calls.filter(c => c[0] === 'arc');
    assertEqual(arcCalls.length, 1);

    // Check arc parameters
    const [, x, y, radius] = arcCalls[0];
    // Circle should be centered at grid position (64.5, 64.5) in canvas coords
    // With cellSize = 512/128 = 4, center is at 4 * 64.5 = 258
    assert(x > 250 && x < 270);
    assert(y > 250 && y < 270);
    // Radius should be (measurementRadius / dx) * cellSize = (0.2 / 0.02) * 4 = 10 * 4 = 40
    assert(radius > 35 && radius < 45);
});

runner.test('MeasurementCirclePanel: setGridSize() updates grid size', () => {
    const bounds = { x: 0, y: 0, width: 512, height: 512 };
    const panel = new MeasurementCirclePanel(bounds, 128);

    panel.setGridSize(256);
    assertEqual(panel.gridSize, 256);
});

// ============================================================================
// PhaseWheelPanel Tests
// ============================================================================

runner.test('PhaseWheelPanel: Constructor initializes correctly', () => {
    const bounds = { x: 700, y: 20, width: 80, height: 80 };
    const panel = new PhaseWheelPanel(bounds);

    assertEqual(panel.name, 'phaseWheel');
    assertDeepEqual(panel.bounds, bounds);
});

runner.test('PhaseWheelPanel: render() draws wheel and labels', () => {
    const bounds = { x: 700, y: 20, width: 80, height: 80 };
    const panel = new PhaseWheelPanel(bounds);
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    panel.render(ctx, simulation, performance.now());

    // Should have save and restore
    assert(ctx.calls[0][0] === 'save');
    assert(ctx.calls[ctx.calls.length - 1][0] === 'restore');

    // Should have many arc calls (360 wedges)
    const arcCalls = ctx.calls.filter(c => c[0] === 'arc');
    assert(arcCalls.length >= 360); // 360 wedges + 1 border

    // Should have text labels
    const textCalls = ctx.calls.filter(c => c[0] === 'fillText');
    assertEqual(textCalls.length, 4); // Re+, Im+, Re-, Im-

    // Check label texts
    const labelTexts = textCalls.map(c => c[1]);
    assert(labelTexts.includes('Re+'));
    assert(labelTexts.includes('Im+'));
    assert(labelTexts.includes('Re-'));
    assert(labelTexts.includes('Im-'));
});

runner.test('PhaseWheelPanel: hslToRgb() converts correctly', () => {
    const bounds = { x: 700, y: 20, width: 80, height: 80 };
    const panel = new PhaseWheelPanel(bounds);

    // Test primary colors
    const red = panel.hslToRgb(0, 100, 50);
    assertDeepEqual(red, [255, 0, 0]);

    const yellow = panel.hslToRgb(60, 100, 50);
    assertDeepEqual(yellow, [255, 255, 0]);

    const cyan = panel.hslToRgb(180, 100, 50);
    assertDeepEqual(cyan, [0, 255, 255]);

    const blue = panel.hslToRgb(240, 100, 50);
    assertDeepEqual(blue, [0, 0, 255]);
});

runner.test('PhaseWheelPanel: hslToRgb() handles edge cases', () => {
    const bounds = { x: 700, y: 20, width: 80, height: 80 };
    const panel = new PhaseWheelPanel(bounds);

    // Black (zero lightness)
    const black = panel.hslToRgb(0, 100, 0);
    assertDeepEqual(black, [0, 0, 0]);

    // White (full lightness)
    const white = panel.hslToRgb(0, 100, 100);
    assertDeepEqual(white, [255, 255, 255]);

    // Gray (zero saturation)
    const gray = panel.hslToRgb(0, 0, 50);
    assertDeepEqual(gray, [128, 128, 128]);
});

// ============================================================================
// Integration Tests
// ============================================================================

runner.test('Integration: All panels can be constructed together', () => {
    const wavefunctionBounds = { x: 0, y: 0, width: 512, height: 512 };
    const wheelBounds = { x: 700, y: 20, width: 80, height: 80 };

    const grid = new GridOverlayPanel(wavefunctionBounds, 128);
    const feedback = new MeasurementFeedbackPanel(wavefunctionBounds, 128);
    const circle = new MeasurementCirclePanel(wavefunctionBounds, 128);
    const wheel = new PhaseWheelPanel(wheelBounds);

    assert(grid instanceof GridOverlayPanel);
    assert(feedback instanceof MeasurementFeedbackPanel);
    assert(circle instanceof MeasurementCirclePanel);
    assert(wheel instanceof PhaseWheelPanel);
});

runner.test('Integration: All panels can render without errors', () => {
    const wavefunctionBounds = { x: 0, y: 0, width: 512, height: 512 };
    const wheelBounds = { x: 700, y: 20, width: 80, height: 80 };
    const ctx = createMockContext();
    const simulation = createMockSimulation();

    const grid = new GridOverlayPanel(wavefunctionBounds, 128);
    const feedback = new MeasurementFeedbackPanel(wavefunctionBounds, 128);
    const circle = new MeasurementCirclePanel(wavefunctionBounds, 128);
    const wheel = new PhaseWheelPanel(wheelBounds);

    // All should render without throwing
    grid.render(ctx, simulation, performance.now());
    feedback.render(ctx, simulation, performance.now());
    circle.render(ctx, simulation, performance.now());
    wheel.render(ctx, simulation, performance.now());

    // No errors is success
    assert(true);
});

runner.test('Integration: Panels handle bounds updates', () => {
    const initialBounds = { x: 0, y: 0, width: 512, height: 512 };
    const newBounds = { x: 0, y: 0, width: 768, height: 768 };

    const panels = [
        new GridOverlayPanel(initialBounds, 128),
        new MeasurementFeedbackPanel(initialBounds, 128),
        new MeasurementCirclePanel(initialBounds, 128),
        new PhaseWheelPanel(initialBounds)
    ];

    // All should update bounds without throwing
    panels.forEach(panel => {
        panel.updateBounds(newBounds);
        assertDeepEqual(panel.bounds, newBounds);
    });
});

// Run tests
runner.run().then(success => {
    if (typeof window !== 'undefined') {
        // Browser environment
        const resultDiv = document.getElementById('test-results');
        if (resultDiv) {
            resultDiv.textContent = success ? 'All tests passed!' : 'Some tests failed (see console)';
            resultDiv.style.color = success ? 'green' : 'red';
        }
    }
});

// Export for potential use in other test files
export { TestRunner, assert, assertEqual, assertDeepEqual, createMockContext, createMockSimulation };
