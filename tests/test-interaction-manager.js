/**
 * @file test-interaction-manager.js
 * @description Unit tests for the InteractionManager class.
 *
 * Tests cover:
 * - Constructor validation
 * - Event listener setup and cleanup
 * - Mouse event handling (move, leave, click)
 * - Touch event handling (start, move, end)
 * - Panel hit testing and delegation
 * - Hover state management
 * - Tooltip management
 * - Callback invocation
 * - Coordinate conversion
 * - Edge cases (multiple panels, overlapping panels, no panels)
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 */

import { InteractionManager } from '../js/visualization/core/InteractionManager.js';

/**
 * Mock Panel class for testing.
 * Implements the Panel interface with configurable behavior.
 */
class MockPanel {
    constructor(name, bounds, config = {}) {
        this.name = name;
        this.bounds = bounds;
        this.config = config;

        // Track method calls for testing
        this.calls = {
            handleMouseMove: [],
            handleClick: [],
            containsPoint: []
        };
    }

    containsPoint(canvasX, canvasY) {
        this.calls.containsPoint.push({ canvasX, canvasY });

        return (
            canvasX >= this.bounds.x &&
            canvasX < this.bounds.x + this.bounds.width &&
            canvasY >= this.bounds.y &&
            canvasY < this.bounds.y + this.bounds.height
        );
    }

    handleMouseMove(canvasX, canvasY, simulation) {
        this.calls.handleMouseMove.push({ canvasX, canvasY, simulation });

        // Return configured tooltip or null
        if (this.config.tooltip) {
            return {
                text: this.config.tooltip,
                x: canvasX + 10,
                y: canvasY + 10
            };
        }
        return null;
    }

    handleClick(canvasX, canvasY, simulation) {
        this.calls.handleClick.push({ canvasX, canvasY, simulation });

        // Return configured click handling result
        return this.config.handlesClick !== false; // Default to true
    }

    resetCallTracking() {
        this.calls.handleMouseMove = [];
        this.calls.handleClick = [];
        this.calls.containsPoint = [];
    }
}

/**
 * Mock canvas element for testing.
 */
class MockCanvas {
    constructor(width = 800, height = 600) {
        this.width = width;
        this.height = height;
        this._listeners = new Map();

        // Mock getBoundingClientRect
        this._boundingRect = {
            left: 0,
            top: 0,
            width: width,
            height: height,
            right: width,
            bottom: height
        };
    }

    getBoundingClientRect() {
        return { ...this._boundingRect };
    }

    addEventListener(event, handler, options) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push({ handler, options });
    }

    removeEventListener(event, handler) {
        if (this._listeners.has(event)) {
            const listeners = this._listeners.get(event);
            const index = listeners.findIndex(l => l.handler === handler);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Simulate firing an event
    _fireEvent(eventType, event) {
        if (this._listeners.has(eventType)) {
            for (const { handler } of this._listeners.get(eventType)) {
                handler(event);
            }
        }
    }

    // Check if event listener is attached
    _hasListener(eventType, handler) {
        if (!this._listeners.has(eventType)) return false;
        return this._listeners.get(eventType).some(l => l.handler === handler);
    }

    // Get count of listeners for an event type
    _getListenerCount(eventType) {
        return this._listeners.has(eventType) ? this._listeners.get(eventType).length : 0;
    }
}

/**
 * Mock mouse event creator
 */
function createMouseEvent(type, clientX, clientY) {
    return {
        type,
        clientX,
        clientY,
        preventDefault: () => {}
    };
}

/**
 * Mock touch event creator
 */
function createTouchEvent(type, clientX, clientY) {
    const touch = { clientX, clientY };
    const event = {
        type,
        preventDefault: () => {},
        touches: type === 'touchend' ? [] : [touch],
        changedTouches: [touch]
    };
    return event;
}

/**
 * Test suite runner
 */
class TestSuite {
    constructor() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, errors: [] };
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('Running InteractionManager Tests...\n');

        for (const { name, fn } of this.tests) {
            try {
                await fn();
                console.log(`✓ ${name}`);
                this.results.passed++;
            } catch (error) {
                console.error(`✗ ${name}`);
                console.error(`  Error: ${error.message}`);
                if (error.stack) {
                    console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
                }
                this.results.failed++;
                this.results.errors.push({ test: name, error });
            }
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Results: ${this.results.passed} passed, ${this.results.failed} failed`);
        console.log(`${'='.repeat(60)}\n`);

        return this.results;
    }
}

/**
 * Assertion helpers
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

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message || 'Expected non-null value');
    }
}

function assertNull(value, message) {
    if (value !== null && value !== undefined) {
        throw new Error(message || `Expected null, got ${value}`);
    }
}

function assertThrows(fn, message) {
    let threw = false;
    try {
        fn();
    } catch (e) {
        threw = true;
    }
    if (!threw) {
        throw new Error(message || 'Expected function to throw');
    }
}

// ============================================================================
// Test Suite
// ============================================================================

const suite = new TestSuite();

// ----------------------------------------------------------------------------
// Constructor Tests
// ----------------------------------------------------------------------------

suite.test('Constructor: should throw if canvas is null', () => {
    assertThrows(() => {
        new InteractionManager(null, {}, { getSimulation: () => {} });
    }, 'Should throw when canvas is null');
});

suite.test('Constructor: should throw if getSimulation callback is missing', () => {
    const canvas = new MockCanvas();
    assertThrows(() => {
        new InteractionManager(canvas, {}, {});
    }, 'Should throw when getSimulation is missing');
});

suite.test('Constructor: should accept Map of panels', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panelsMap = new Map([['panel1', panel1]]);

    const manager = new InteractionManager(canvas, panelsMap, {
        getSimulation: () => ({})
    });

    assertNotNull(manager);
    manager.cleanup();
});

suite.test('Constructor: should accept object of panels', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panelsObj = { panel1 };

    const manager = new InteractionManager(canvas, panelsObj, {
        getSimulation: () => ({})
    });

    assertNotNull(manager);
    manager.cleanup();
});

suite.test('Constructor: should filter out null panels', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panelsObj = { panel1, panel2: null, panel3: undefined };

    const manager = new InteractionManager(canvas, panelsObj, {
        getSimulation: () => ({})
    });

    assertNotNull(manager);
    manager.cleanup();
});

// ----------------------------------------------------------------------------
// Event Listener Setup Tests
// ----------------------------------------------------------------------------

suite.test('Setup: should attach mouse event listeners', () => {
    const canvas = new MockCanvas();
    const manager = new InteractionManager(canvas, {}, {
        getSimulation: () => ({})
    });

    assert(canvas._getListenerCount('mousemove') === 1, 'Should attach mousemove listener');
    assert(canvas._getListenerCount('mouseleave') === 1, 'Should attach mouseleave listener');
    assert(canvas._getListenerCount('click') === 1, 'Should attach click listener');

    manager.cleanup();
});

suite.test('Setup: should attach touch event listeners', () => {
    const canvas = new MockCanvas();
    const manager = new InteractionManager(canvas, {}, {
        getSimulation: () => ({})
    });

    assert(canvas._getListenerCount('touchstart') === 1, 'Should attach touchstart listener');
    assert(canvas._getListenerCount('touchmove') === 1, 'Should attach touchmove listener');
    assert(canvas._getListenerCount('touchend') === 1, 'Should attach touchend listener');

    manager.cleanup();
});

suite.test('Cleanup: should remove all event listeners', () => {
    const canvas = new MockCanvas();
    const manager = new InteractionManager(canvas, {}, {
        getSimulation: () => ({})
    });

    manager.cleanup();

    assertEqual(canvas._getListenerCount('mousemove'), 0, 'Should remove mousemove listener');
    assertEqual(canvas._getListenerCount('mouseleave'), 0, 'Should remove mouseleave listener');
    assertEqual(canvas._getListenerCount('click'), 0, 'Should remove click listener');
    assertEqual(canvas._getListenerCount('touchstart'), 0, 'Should remove touchstart listener');
    assertEqual(canvas._getListenerCount('touchmove'), 0, 'Should remove touchmove listener');
    assertEqual(canvas._getListenerCount('touchend'), 0, 'Should remove touchend listener');
});

// ----------------------------------------------------------------------------
// Mouse Event Handling Tests
// ----------------------------------------------------------------------------

suite.test('MouseMove: should find and hover correct panel', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panel2 = new MockPanel('panel2', { x: 100, y: 0, width: 100, height: 100 });

    let hoveredPanel = null;
    const manager = new InteractionManager(canvas, { panel1, panel2 }, {
        getSimulation: () => ({}),
        onHoverChange: (panel) => { hoveredPanel = panel; }
    });

    // Hover over panel1
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));
    assertEqual(hoveredPanel, panel1, 'Should hover panel1');

    // Hover over panel2
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 150, 50));
    assertEqual(hoveredPanel, panel2, 'Should hover panel2');

    manager.cleanup();
});

suite.test('MouseMove: should call panel handleMouseMove', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({ test: 'sim' })
    });

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));

    assertEqual(panel.calls.handleMouseMove.length, 1, 'Should call handleMouseMove once');
    assertEqual(panel.calls.handleMouseMove[0].canvasX, 50, 'Should pass correct X');
    assertEqual(panel.calls.handleMouseMove[0].canvasY, 50, 'Should pass correct Y');
    assertNotNull(panel.calls.handleMouseMove[0].simulation, 'Should pass simulation');

    manager.cleanup();
});

suite.test('MouseMove: should update tooltip from panel', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel',
        { x: 0, y: 0, width: 100, height: 100 },
        { tooltip: 'Test tooltip' }
    );

    let currentTooltip = null;
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({}),
        onTooltipChange: (tooltip) => { currentTooltip = tooltip; }
    });

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));

    assertNotNull(currentTooltip, 'Should have tooltip');
    assertEqual(currentTooltip.text, 'Test tooltip', 'Should have correct tooltip text');

    manager.cleanup();
});

suite.test('MouseLeave: should clear hover state and tooltip', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel',
        { x: 0, y: 0, width: 100, height: 100 },
        { tooltip: 'Test tooltip' }
    );

    let hoveredPanel = 'not-null';
    let currentTooltip = 'not-null';
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; },
        onTooltipChange: (t) => { currentTooltip = t; }
    });

    // First hover over panel
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));
    assertNotNull(hoveredPanel, 'Should have hovered panel');
    assertNotNull(currentTooltip, 'Should have tooltip');

    // Then leave canvas
    canvas._fireEvent('mouseleave', createMouseEvent('mouseleave', 0, 0));
    assertNull(hoveredPanel, 'Should clear hovered panel');
    assertNull(currentTooltip, 'Should clear tooltip');

    manager.cleanup();
});

suite.test('Click: should delegate to panel and invoke callback', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    let clickedPanel = null;
    let clickX = -1, clickY = -1;
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({ test: 'sim' }),
        onPanelClick: (p, x, y) => {
            clickedPanel = p;
            clickX = x;
            clickY = y;
        }
    });

    canvas._fireEvent('click', createMouseEvent('click', 50, 50));

    assertEqual(panel.calls.handleClick.length, 1, 'Should call panel handleClick');
    assertEqual(clickedPanel, panel, 'Should invoke callback with correct panel');
    assertEqual(clickX, 50, 'Should pass correct X to callback');
    assertEqual(clickY, 50, 'Should pass correct Y to callback');

    manager.cleanup();
});

suite.test('Click: should not invoke callback if panel does not handle click', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel',
        { x: 0, y: 0, width: 100, height: 100 },
        { handlesClick: false }
    );

    let callbackInvoked = false;
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({}),
        onPanelClick: () => { callbackInvoked = true; }
    });

    canvas._fireEvent('click', createMouseEvent('click', 50, 50));

    assertEqual(callbackInvoked, false, 'Should not invoke callback');

    manager.cleanup();
});

// ----------------------------------------------------------------------------
// Touch Event Handling Tests
// ----------------------------------------------------------------------------

suite.test('TouchStart: should simulate mousemove', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    let hoveredPanel = null;
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; }
    });

    canvas._fireEvent('touchstart', createTouchEvent('touchstart', 50, 50));

    assertEqual(hoveredPanel, panel, 'Should hover panel on touchstart');

    manager.cleanup();
});

suite.test('TouchMove: should update hover state', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panel2 = new MockPanel('panel2', { x: 100, y: 0, width: 100, height: 100 });

    let hoveredPanel = null;
    const manager = new InteractionManager(canvas, { panel1, panel2 }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; }
    });

    canvas._fireEvent('touchmove', createTouchEvent('touchmove', 50, 50));
    assertEqual(hoveredPanel, panel1, 'Should hover panel1');

    canvas._fireEvent('touchmove', createTouchEvent('touchmove', 150, 50));
    assertEqual(hoveredPanel, panel2, 'Should hover panel2');

    manager.cleanup();
});

suite.test('TouchEnd: should trigger click and clear hover', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    let hoveredPanel = 'not-null';
    let clickedPanel = null;
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; },
        onPanelClick: (p) => { clickedPanel = p; }
    });

    // Start touch
    canvas._fireEvent('touchstart', createTouchEvent('touchstart', 50, 50));
    assertNotNull(hoveredPanel, 'Should have hovered panel');

    // End touch
    canvas._fireEvent('touchend', createTouchEvent('touchend', 50, 50));
    assertEqual(clickedPanel, panel, 'Should trigger click');
    assertNull(hoveredPanel, 'Should clear hover state');

    manager.cleanup();
});

// ----------------------------------------------------------------------------
// Panel Hit Testing Tests
// ----------------------------------------------------------------------------

suite.test('HitTest: should handle no panels', () => {
    const canvas = new MockCanvas();

    let hoveredPanel = 'not-null';
    const manager = new InteractionManager(canvas, {}, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; }
    });

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));
    // Callback not called because state stays null -> null (no change)
    // This is correct behavior
    assertEqual(manager.getCurrentHoverPanel(), null, 'Should have no hover panel');

    manager.cleanup();
});

suite.test('HitTest: should handle overlapping panels (first match wins)', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panel2 = new MockPanel('panel2', { x: 0, y: 0, width: 100, height: 100 });

    let hoveredPanel = null;
    const manager = new InteractionManager(canvas, { panel1, panel2 }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; }
    });

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));

    // panel1 comes first in object, should be selected
    assertEqual(hoveredPanel, panel1, 'Should select first matching panel');

    manager.cleanup();
});

suite.test('HitTest: should handle point outside all panels', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    let hoveredPanel = 'not-null';
    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; }
    });

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 200, 200));
    // Callback not called because state stays null -> null (no change)
    // This is correct behavior - no panel is at (200, 200)
    assertEqual(manager.getCurrentHoverPanel(), null, 'Should have no hover panel outside bounds');

    manager.cleanup();
});

// ----------------------------------------------------------------------------
// Coordinate Conversion Tests
// ----------------------------------------------------------------------------

suite.test('Coordinates: should handle canvas offset', () => {
    const canvas = new MockCanvas();
    canvas._boundingRect.left = 100;
    canvas._boundingRect.top = 50;

    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({})
    });

    // Mouse at viewport (150, 100) = canvas (50, 50) after offset
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 150, 100));

    assertEqual(panel.calls.handleMouseMove.length, 1, 'Should call handleMouseMove');
    assertEqual(panel.calls.handleMouseMove[0].canvasX, 50, 'Should convert X correctly');
    assertEqual(panel.calls.handleMouseMove[0].canvasY, 50, 'Should convert Y correctly');

    manager.cleanup();
});

// ----------------------------------------------------------------------------
// State Management Tests
// ----------------------------------------------------------------------------

suite.test('State: getCurrentTooltip should return current tooltip', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel',
        { x: 0, y: 0, width: 100, height: 100 },
        { tooltip: 'Test' }
    );

    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({})
    });

    assertNull(manager.getCurrentTooltip(), 'Should start with null tooltip');

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));

    const tooltip = manager.getCurrentTooltip();
    assertNotNull(tooltip, 'Should have tooltip after hover');
    assertEqual(tooltip.text, 'Test', 'Should return correct tooltip');

    manager.cleanup();
});

suite.test('State: getCurrentHoverPanel should return current panel', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({})
    });

    assertNull(manager.getCurrentHoverPanel(), 'Should start with null hover');

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));

    assertEqual(manager.getCurrentHoverPanel(), panel, 'Should return hovered panel');

    manager.cleanup();
});

suite.test('State: updatePanels should clear hover state', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panel2 = new MockPanel('panel2', { x: 100, y: 0, width: 100, height: 100 });

    let hoveredPanel = null;
    const manager = new InteractionManager(canvas, { panel1 }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoveredPanel = p; }
    });

    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));
    assertEqual(hoveredPanel, panel1, 'Should hover panel1');

    manager.updatePanels({ panel2 });
    assertNull(hoveredPanel, 'Should clear hover after updatePanels');

    manager.cleanup();
});

// ----------------------------------------------------------------------------
// Edge Case Tests
// ----------------------------------------------------------------------------

suite.test('EdgeCase: rapid mouse movements should track correctly', () => {
    const canvas = new MockCanvas();
    const panel1 = new MockPanel('panel1', { x: 0, y: 0, width: 100, height: 100 });
    const panel2 = new MockPanel('panel2', { x: 100, y: 0, width: 100, height: 100 });

    let hoverChanges = [];
    const manager = new InteractionManager(canvas, { panel1, panel2 }, {
        getSimulation: () => ({}),
        onHoverChange: (p) => { hoverChanges.push(p); }
    });

    // Rapid movements
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 51, 50));
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 150, 50));
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 151, 50));

    // Should only notify on actual panel changes
    // Initial: panel1, same panel (no change), panel2, same panel (no change)
    assertEqual(hoverChanges.length, 2, 'Should only notify on panel changes');
    assertEqual(hoverChanges[0], panel1, 'First change to panel1');
    assertEqual(hoverChanges[1], panel2, 'Second change to panel2');

    manager.cleanup();
});

suite.test('EdgeCase: should not crash with null simulation', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => null
    });

    // Should not throw
    canvas._fireEvent('mousemove', createMouseEvent('mousemove', 50, 50));
    canvas._fireEvent('click', createMouseEvent('click', 50, 50));

    manager.cleanup();
});

suite.test('EdgeCase: multiple touch points should use first touch', () => {
    const canvas = new MockCanvas();
    const panel = new MockPanel('panel', { x: 0, y: 0, width: 100, height: 100 });

    const manager = new InteractionManager(canvas, { panel }, {
        getSimulation: () => ({})
    });

    // Multi-touch event (use first touch only)
    const multiTouchEvent = {
        type: 'touchmove',
        preventDefault: () => {},
        touches: [
            { clientX: 50, clientY: 50 },
            { clientX: 150, clientY: 150 }
        ],
        changedTouches: [
            { clientX: 50, clientY: 50 },
            { clientX: 150, clientY: 150 }
        ]
    };

    canvas._fireEvent('touchmove', multiTouchEvent);

    // Should use first touch (50, 50)
    assertEqual(panel.calls.handleMouseMove.length, 1, 'Should process touch');
    assertEqual(panel.calls.handleMouseMove[0].canvasX, 50, 'Should use first touch X');
    assertEqual(panel.calls.handleMouseMove[0].canvasY, 50, 'Should use first touch Y');

    manager.cleanup();
});

// ============================================================================
// Run Tests
// ============================================================================

if (typeof document !== 'undefined') {
    // Browser environment
    document.addEventListener('DOMContentLoaded', async () => {
        const results = await suite.run();

        // Display results in page if available
        const resultsDiv = document.getElementById('test-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <h2>InteractionManager Test Results</h2>
                <p><strong>Passed:</strong> ${results.passed}</p>
                <p><strong>Failed:</strong> ${results.failed}</p>
                ${results.errors.length > 0 ? `
                    <h3>Errors:</h3>
                    <ul>
                        ${results.errors.map(e => `
                            <li><strong>${e.test}:</strong> ${e.error.message}</li>
                        `).join('')}
                    </ul>
                ` : ''}
            `;
        }
    });
} else {
    // Node.js environment
    suite.run().then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    });
}

export { suite };
