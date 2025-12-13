/**
 * @file test-panel-base.js
 * @description Comprehensive unit tests for the Panel base class.
 *
 * Tests cover:
 * - Constructor and bounds validation
 * - Coordinate conversion methods
 * - Mouse event handling
 * - Bounds checking
 * - Abstract method enforcement
 * - Edge cases and error conditions
 */

import { Panel } from '../js/visualization/core/Panel.js';
import { TooltipInfo } from '../js/visualization/core/TooltipInfo.js';

/**
 * Simple concrete Panel implementation for testing.
 * Implements the abstract render() method.
 */
class TestPanel extends Panel {
    constructor(name, bounds) {
        super(name, bounds);
        this.renderCalled = false;
        this.lastRenderArgs = null;
    }

    render(ctx, simulation, time) {
        this.renderCalled = true;
        this.lastRenderArgs = { ctx, simulation, time };
    }
}

/**
 * Test suite for Panel base class
 */
class PanelBaseTests {
    constructor() {
        this.testResults = [];
        this.passed = 0;
        this.failed = 0;
    }

    /**
     * Runs a single test and records the result.
     */
    runTest(name, testFn) {
        try {
            testFn();
            this.testResults.push({ name, passed: true, error: null });
            this.passed++;
            console.log(`✓ ${name}`);
        } catch (error) {
            this.testResults.push({ name, passed: false, error: error.message });
            this.failed++;
            console.error(`✗ ${name}`);
            console.error(`  ${error.message}`);
            if (error.stack) {
                console.error(`  ${error.stack}`);
            }
        }
    }

    /**
     * Assertion helper
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    /**
     * Assert that two values are equal
     */
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(
                message || `Expected ${expected}, got ${actual}`
            );
        }
    }

    /**
     * Assert that a function throws an error
     */
    assertThrows(fn, expectedMessage, message) {
        let threw = false;
        let actualMessage = '';
        try {
            fn();
        } catch (error) {
            threw = true;
            actualMessage = error.message;
        }

        if (!threw) {
            throw new Error(message || 'Expected function to throw an error');
        }

        if (expectedMessage && !actualMessage.includes(expectedMessage)) {
            throw new Error(
                `Expected error message to contain "${expectedMessage}", ` +
                `got "${actualMessage}"`
            );
        }
    }

    /**
     * Test: Constructor accepts valid bounds
     */
    testConstructorValidBounds() {
        const panel = new TestPanel('Test', {
            x: 10, y: 20, width: 100, height: 200
        });

        this.assertEqual(panel.name, 'Test');
        this.assertEqual(panel.bounds.x, 10);
        this.assertEqual(panel.bounds.y, 20);
        this.assertEqual(panel.bounds.width, 100);
        this.assertEqual(panel.bounds.height, 200);
    }

    /**
     * Test: Constructor copies bounds (no external mutation)
     */
    testConstructorCopiesBounds() {
        const bounds = { x: 0, y: 0, width: 100, height: 100 };
        const panel = new TestPanel('Test', bounds);

        // Mutate original bounds
        bounds.x = 999;
        bounds.width = 1;

        // Panel bounds should be unchanged
        this.assertEqual(panel.bounds.x, 0);
        this.assertEqual(panel.bounds.width, 100);
    }

    /**
     * Test: Constructor rejects null/undefined bounds
     */
    testConstructorRejectsNullBounds() {
        this.assertThrows(
            () => new TestPanel('Test', null),
            'bounds must be an object'
        );

        this.assertThrows(
            () => new TestPanel('Test', undefined),
            'bounds must be an object'
        );
    }

    /**
     * Test: Constructor rejects bounds with missing properties
     */
    testConstructorRejectsMissingProperties() {
        this.assertThrows(
            () => new TestPanel('Test', { x: 0, y: 0, width: 100 }),
            'bounds.height must be a finite number'
        );

        this.assertThrows(
            () => new TestPanel('Test', { x: 0, y: 0, height: 100 }),
            'bounds.width must be a finite number'
        );
    }

    /**
     * Test: Constructor rejects non-numeric bounds
     */
    testConstructorRejectsNonNumericBounds() {
        this.assertThrows(
            () => new TestPanel('Test', {
                x: '0', y: 0, width: 100, height: 100
            }),
            'bounds.x must be a finite number'
        );

        this.assertThrows(
            () => new TestPanel('Test', {
                x: 0, y: NaN, width: 100, height: 100
            }),
            'bounds.y must be a finite number'
        );

        this.assertThrows(
            () => new TestPanel('Test', {
                x: 0, y: 0, width: Infinity, height: 100
            }),
            'bounds.width must be a finite number'
        );
    }

    /**
     * Test: Constructor rejects zero or negative dimensions
     */
    testConstructorRejectsInvalidDimensions() {
        this.assertThrows(
            () => new TestPanel('Test', {
                x: 0, y: 0, width: 0, height: 100
            }),
            'bounds.width and bounds.height must be positive'
        );

        this.assertThrows(
            () => new TestPanel('Test', {
                x: 0, y: 0, width: 100, height: -10
            }),
            'bounds.width and bounds.height must be positive'
        );
    }

    /**
     * Test: Base Panel class throws on render()
     */
    testBaseClassRenderThrows() {
        const panel = new Panel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        this.assertThrows(
            () => panel.render(null, null, 0),
            'render() method must be implemented by subclass'
        );
    }

    /**
     * Test: Subclass can implement render()
     */
    testSubclassCanImplementRender() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        const ctx = {};
        const simulation = {};
        const time = 42;

        // Should not throw
        panel.render(ctx, simulation, time);

        this.assert(panel.renderCalled, 'render() should have been called');
        this.assertEqual(panel.lastRenderArgs.ctx, ctx);
        this.assertEqual(panel.lastRenderArgs.simulation, simulation);
        this.assertEqual(panel.lastRenderArgs.time, time);
    }

    /**
     * Test: canvasToLocal converts coordinates correctly
     */
    testCanvasToLocal() {
        const panel = new TestPanel('Test', {
            x: 100, y: 50, width: 200, height: 300
        });

        // Test top-left corner
        let local = panel.canvasToLocal(100, 50);
        this.assertEqual(local.x, 0);
        this.assertEqual(local.y, 0);

        // Test bottom-right corner
        local = panel.canvasToLocal(300, 350);
        this.assertEqual(local.x, 200);
        this.assertEqual(local.y, 300);

        // Test middle point
        local = panel.canvasToLocal(200, 200);
        this.assertEqual(local.x, 100);
        this.assertEqual(local.y, 150);

        // Test point outside panel
        local = panel.canvasToLocal(0, 0);
        this.assertEqual(local.x, -100);
        this.assertEqual(local.y, -50);
    }

    /**
     * Test: localToCanvas converts coordinates correctly
     */
    testLocalToCanvas() {
        const panel = new TestPanel('Test', {
            x: 100, y: 50, width: 200, height: 300
        });

        // Test origin
        let canvas = panel.localToCanvas(0, 0);
        this.assertEqual(canvas.x, 100);
        this.assertEqual(canvas.y, 50);

        // Test dimensions
        canvas = panel.localToCanvas(200, 300);
        this.assertEqual(canvas.x, 300);
        this.assertEqual(canvas.y, 350);

        // Test middle point
        canvas = panel.localToCanvas(100, 150);
        this.assertEqual(canvas.x, 200);
        this.assertEqual(canvas.y, 200);

        // Test negative coordinates
        canvas = panel.localToCanvas(-50, -25);
        this.assertEqual(canvas.x, 50);
        this.assertEqual(canvas.y, 25);
    }

    /**
     * Test: Coordinate conversion round-trip
     */
    testCoordinateConversionRoundTrip() {
        const panel = new TestPanel('Test', {
            x: 100, y: 50, width: 200, height: 300
        });

        // Test multiple points
        const testPoints = [
            [150, 100],
            [200, 200],
            [250, 300],
            [100, 50]
        ];

        for (const [canvasX, canvasY] of testPoints) {
            const local = panel.canvasToLocal(canvasX, canvasY);
            const canvas = panel.localToCanvas(local.x, local.y);

            this.assertEqual(canvas.x, canvasX,
                `Round-trip failed for canvas point (${canvasX}, ${canvasY})`);
            this.assertEqual(canvas.y, canvasY,
                `Round-trip failed for canvas point (${canvasX}, ${canvasY})`);
        }
    }

    /**
     * Test: containsPoint detects points inside bounds
     */
    testContainsPointInside() {
        const panel = new TestPanel('Test', {
            x: 100, y: 50, width: 200, height: 300
        });

        // Test corners (inside)
        this.assert(panel.containsPoint(100, 50), 'Top-left corner');
        this.assert(panel.containsPoint(100, 349), 'Bottom-left inside');
        this.assert(panel.containsPoint(299, 50), 'Top-right inside');

        // Test center
        this.assert(panel.containsPoint(200, 200), 'Center point');
    }

    /**
     * Test: containsPoint detects points outside bounds
     */
    testContainsPointOutside() {
        const panel = new TestPanel('Test', {
            x: 100, y: 50, width: 200, height: 300
        });

        // Test outside left
        this.assert(!panel.containsPoint(99, 200), 'Outside left');

        // Test outside right (at or beyond right edge)
        this.assert(!panel.containsPoint(300, 200), 'At right edge');
        this.assert(!panel.containsPoint(301, 200), 'Outside right');

        // Test outside top
        this.assert(!panel.containsPoint(200, 49), 'Outside top');

        // Test outside bottom (at or beyond bottom edge)
        this.assert(!panel.containsPoint(200, 350), 'At bottom edge');
        this.assert(!panel.containsPoint(200, 351), 'Outside bottom');

        // Test far outside
        this.assert(!panel.containsPoint(0, 0), 'Far outside');
        this.assert(!panel.containsPoint(1000, 1000), 'Far outside');
    }

    /**
     * Test: handleMouseMove returns null by default
     */
    testHandleMouseMoveDefaultNull() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        const result = panel.handleMouseMove(50, 50, {});
        this.assertEqual(result, null, 'Default handleMouseMove should return null');
    }

    /**
     * Test: handleClick returns false by default
     */
    testHandleClickDefaultFalse() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        const result = panel.handleClick(50, 50, {});
        this.assertEqual(result, false, 'Default handleClick should return false');
    }

    /**
     * Test: Subclass can override handleMouseMove
     */
    testSubclassCanOverrideHandleMouseMove() {
        class CustomPanel extends TestPanel {
            handleMouseMove(canvasX, canvasY, simulation) {
                return new TooltipInfo(
                    { x: canvasX, y: canvasY },
                    canvasX, canvasY
                );
            }
        }

        const panel = new CustomPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        const result = panel.handleMouseMove(50, 75, {});
        this.assert(result instanceof TooltipInfo, 'Should return TooltipInfo');
        this.assertEqual(result.data.x, 50);
        this.assertEqual(result.data.y, 75);
        this.assertEqual(result.canvasX, 50);
        this.assertEqual(result.canvasY, 75);
    }

    /**
     * Test: Subclass can override handleClick
     */
    testSubclassCanOverrideHandleClick() {
        class CustomPanel extends TestPanel {
            constructor(name, bounds) {
                super(name, bounds);
                this.lastClickPos = null;
            }

            handleClick(canvasX, canvasY, simulation) {
                this.lastClickPos = { canvasX, canvasY };
                return true;
            }
        }

        const panel = new CustomPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        const result = panel.handleClick(25, 75, {});
        this.assertEqual(result, true, 'Should return true');
        this.assertEqual(panel.lastClickPos.canvasX, 25);
        this.assertEqual(panel.lastClickPos.canvasY, 75);
    }

    /**
     * Test: updateBounds updates the bounds
     */
    testUpdateBounds() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        panel.updateBounds({ x: 50, y: 75, width: 200, height: 300 });

        this.assertEqual(panel.bounds.x, 50);
        this.assertEqual(panel.bounds.y, 75);
        this.assertEqual(panel.bounds.width, 200);
        this.assertEqual(panel.bounds.height, 300);
    }

    /**
     * Test: updateBounds validates new bounds
     */
    testUpdateBoundsValidates() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        // Should reject invalid bounds
        this.assertThrows(
            () => panel.updateBounds({ x: 0, y: 0, width: -10, height: 100 }),
            'bounds.width and bounds.height must be positive'
        );

        // Original bounds should be unchanged after failed update
        this.assertEqual(panel.bounds.width, 100);
        this.assertEqual(panel.bounds.height, 100);
    }

    /**
     * Test: updateBounds copies bounds (no external mutation)
     */
    testUpdateBoundsCopies() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        const newBounds = { x: 50, y: 50, width: 200, height: 200 };
        panel.updateBounds(newBounds);

        // Mutate original bounds
        newBounds.x = 999;

        // Panel bounds should be unchanged
        this.assertEqual(panel.bounds.x, 50);
    }

    /**
     * Test: toString returns descriptive string
     */
    testToString() {
        const panel = new TestPanel('MyPanel', {
            x: 10, y: 20, width: 100, height: 200
        });

        const str = panel.toString();
        this.assert(str.includes('MyPanel'), 'Should include panel name');
        this.assert(str.includes('10'), 'Should include x coordinate');
        this.assert(str.includes('20'), 'Should include y coordinate');
        this.assert(str.includes('100'), 'Should include width');
        this.assert(str.includes('200'), 'Should include height');
    }

    /**
     * Test: Panel handles fractional coordinates
     */
    testFractionalCoordinates() {
        const panel = new TestPanel('Test', {
            x: 10.5, y: 20.7, width: 100.3, height: 200.9
        });

        const local = panel.canvasToLocal(50.8, 100.3);
        this.assertEqual(local.x, 50.8 - 10.5);
        this.assertEqual(local.y, 100.3 - 20.7);

        const canvas = panel.localToCanvas(40.2, 60.4);
        this.assertEqual(canvas.x, 40.2 + 10.5);
        this.assertEqual(canvas.y, 60.4 + 20.7);
    }

    /**
     * Test: Bounds at origin work correctly
     */
    testBoundsAtOrigin() {
        const panel = new TestPanel('Test', {
            x: 0, y: 0, width: 100, height: 100
        });

        // Canvas and local coordinates should be identical
        const local = panel.canvasToLocal(50, 50);
        this.assertEqual(local.x, 50);
        this.assertEqual(local.y, 50);

        const canvas = panel.localToCanvas(25, 75);
        this.assertEqual(canvas.x, 25);
        this.assertEqual(canvas.y, 75);
    }

    /**
     * Run all tests
     */
    runAll() {
        console.log('Running Panel Base Class Tests...\n');

        // Constructor tests
        this.runTest('Constructor accepts valid bounds',
            () => this.testConstructorValidBounds());
        this.runTest('Constructor copies bounds',
            () => this.testConstructorCopiesBounds());
        this.runTest('Constructor rejects null bounds',
            () => this.testConstructorRejectsNullBounds());
        this.runTest('Constructor rejects missing properties',
            () => this.testConstructorRejectsMissingProperties());
        this.runTest('Constructor rejects non-numeric bounds',
            () => this.testConstructorRejectsNonNumericBounds());
        this.runTest('Constructor rejects invalid dimensions',
            () => this.testConstructorRejectsInvalidDimensions());

        // Abstract method tests
        this.runTest('Base class render() throws error',
            () => this.testBaseClassRenderThrows());
        this.runTest('Subclass can implement render()',
            () => this.testSubclassCanImplementRender());

        // Coordinate conversion tests
        this.runTest('canvasToLocal converts correctly',
            () => this.testCanvasToLocal());
        this.runTest('localToCanvas converts correctly',
            () => this.testLocalToCanvas());
        this.runTest('Coordinate conversion round-trip',
            () => this.testCoordinateConversionRoundTrip());

        // Bounds checking tests
        this.runTest('containsPoint detects inside points',
            () => this.testContainsPointInside());
        this.runTest('containsPoint detects outside points',
            () => this.testContainsPointOutside());

        // Mouse event tests
        this.runTest('handleMouseMove returns null by default',
            () => this.testHandleMouseMoveDefaultNull());
        this.runTest('handleClick returns false by default',
            () => this.testHandleClickDefaultFalse());
        this.runTest('Subclass can override handleMouseMove',
            () => this.testSubclassCanOverrideHandleMouseMove());
        this.runTest('Subclass can override handleClick',
            () => this.testSubclassCanOverrideHandleClick());

        // updateBounds tests
        this.runTest('updateBounds updates the bounds',
            () => this.testUpdateBounds());
        this.runTest('updateBounds validates new bounds',
            () => this.testUpdateBoundsValidates());
        this.runTest('updateBounds copies bounds',
            () => this.testUpdateBoundsCopies());

        // Utility tests
        this.runTest('toString returns descriptive string',
            () => this.testToString());
        this.runTest('Panel handles fractional coordinates',
            () => this.testFractionalCoordinates());
        this.runTest('Bounds at origin work correctly',
            () => this.testBoundsAtOrigin());

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log(`Test Results: ${this.passed} passed, ${this.failed} failed`);
        console.log('='.repeat(60));

        if (this.failed === 0) {
            console.log('✓ All tests passed!');
        } else {
            console.log(`✗ ${this.failed} test(s) failed`);
        }

        return this.failed === 0;
    }
}

// Run tests if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
    const tests = new PanelBaseTests();
    const success = tests.runAll();
    process.exit(success ? 0 : 1);
}

export { PanelBaseTests };
