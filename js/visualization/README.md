# Visualization Module

This directory contains the modular visualization system for the Quantum Particle Playground.

## Overview

The visualization system has been **completely refactored** from a monolithic 726-line `Visualizer` class into a clean, modular panel-based architecture. The new `VisualizerV2` provides identical functionality with dramatically improved code organization.

## Current Status: Phase 7 Complete - Production Ready ✅

**Phase 1: Extract Layout Logic** (COMPLETE)
- Created `CanvasLayout` class for centralized layout management
- All panel bounds calculations are now in one place
- Hit testing is unified and consistent
- Foundation is laid for panel-based architecture

**Phase 2: Create Panel Base Class** (COMPLETE)
- Created `Panel` abstract base class for all visualization panels
- Created `TooltipInfo` class for tooltip data
- Defined standard panel interface and coordinate system
- Comprehensive unit tests and visual test page
- Clean inheritance structure ready for specialized panels

## Directory Structure

```
visualization/
├── README.md                  # This file
└── core/
    ├── CanvasLayout.js       # Centralized layout management (Phase 1)
    ├── Panel.js              # Base panel class (Phase 2)
    └── TooltipInfo.js        # Tooltip data structure (Phase 2)
```

## Phase 1: CanvasLayout Class

### Purpose

The `CanvasLayout` class centralizes all spatial layout calculations for the canvas. It manages the positioning and sizing of different visualization panels:

- **Wavefunction Grid**: Always square, sized to canvas height
- **Potential Plot**: Optional, occupies remaining horizontal space
- **Phase Wheel**: Optional overlay in top-right corner

### Key Features

1. **Consistent Layout Rules**
   - Grid maintains square aspect ratio
   - Plot uses remaining horizontal space
   - Phase wheel overlays other panels

2. **Hit Testing**
   - Determines which panel contains a given point
   - Handles overlay priorities correctly
   - Returns null for misses

3. **Dynamic Updates**
   - Canvas can be resized on the fly
   - Panels can be enabled/disabled
   - No need to recreate layout instance

4. **Convenience Methods**
   - Quick access to commonly-needed bounds
   - Clean API for integrating with existing code

### Usage Example

```javascript
import { CanvasLayout } from './visualization/core/CanvasLayout.js';

// Create layout manager
const layout = new CanvasLayout(canvas.width, canvas.height, {
  showPlot: true,
  showPhaseWheel: false
});

// Get all panel bounds
const panels = layout.calculateLayout();
// panels.wavefunction = { x: 0, y: 0, width: 600, height: 600 }
// panels.potentialPlot = { x: 600, y: 0, width: 200, height: 600 }
// panels.phaseWheel = null

// Test which panel was clicked
const hit = layout.hitTest(mouseX, mouseY);
if (hit && hit.panel === 'wavefunction') {
  // Handle wavefunction interaction
}

// Get just the wavefunction bounds
const gridBounds = layout.getWavefunctionBounds();
const cellSize = gridBounds.width / gridSize;

// Update on resize
window.addEventListener('resize', () => {
  layout.updateDimensions(canvas.width, canvas.height);
});

// Toggle panels
layout.updateConfig({ showPhaseWheel: true });
```

### Design Principles

1. **Single Responsibility**: CanvasLayout only handles spatial calculations
2. **Immutability**: calculateLayout() returns new objects each time
3. **Zero Dependencies**: Pure JavaScript, no external libraries
4. **Well Documented**: Comprehensive JSDoc comments on all methods

### Testing

The CanvasLayout class has comprehensive unit tests:

- **Browser Test**: `/tests/test-canvas-layout.html` - Interactive test runner
- **Module Test**: `/tests/test-canvas-layout.js` - Importable test suite

Tests cover:
- Basic layout calculation
- Layout with plot enabled
- Layout with phase wheel enabled
- Hit testing accuracy
- Dynamic dimension updates
- Configuration updates
- Convenience methods
- Edge cases

To run tests:
```bash
# Open in browser
open tests/test-canvas-layout.html

# Or serve and navigate to it
python -m http.server 8000
# Then visit: http://localhost:8000/tests/test-canvas-layout.html
```

## Phase 2: Panel Base Class

### Purpose

The `Panel` base class provides a standard interface that all visualization panels implement. It handles coordinate conversion, bounds checking, mouse interactions, and defines the contract that specialized panels must follow.

### Key Features

1. **Coordinate System Management**
   - Canvas coordinates (absolute pixel positions)
   - Local panel coordinates (relative to panel's top-left)
   - Automatic conversion between coordinate systems

2. **Bounds Management**
   - Each panel knows its rectangular region
   - Hit testing to check if points are inside
   - Dynamic bounds updates for resize handling

3. **Mouse Interaction**
   - Mouse move handling with tooltip support
   - Click event handling
   - Customizable per panel type

4. **Abstract Rendering**
   - Subclasses must implement render() method
   - Clean separation of rendering logic
   - Consistent interface across all panels

### Class Hierarchy

```
Panel (abstract base class)
  ├── render(ctx, simulation, time) - MUST override
  ├── canvasToLocal(x, y) - concrete implementation
  ├── localToCanvas(x, y) - concrete implementation
  ├── handleMouseMove(x, y, sim) - override optional
  ├── handleClick(x, y, sim) - override optional
  ├── containsPoint(x, y) - concrete implementation
  └── updateBounds(newBounds) - override optional
```

### Usage Example

```javascript
import { Panel } from './visualization/core/Panel.js';
import { TooltipInfo } from './visualization/core/TooltipInfo.js';

// Create a custom panel
class MyPanel extends Panel {
    constructor(name, bounds) {
        super(name, bounds);
        // Initialize panel-specific data
    }

    // REQUIRED: Implement rendering
    render(ctx, simulation, time) {
        // Draw background
        ctx.fillStyle = 'lightblue';
        ctx.fillRect(this.bounds.x, this.bounds.y,
                     this.bounds.width, this.bounds.height);

        // Access simulation data
        const wavefunction = simulation.psi;
        // ... render wavefunction ...
    }

    // OPTIONAL: Handle mouse hover
    handleMouseMove(canvasX, canvasY, simulation) {
        // Convert to local coordinates
        const local = this.canvasToLocal(canvasX, canvasY);

        // Calculate value at this position
        const value = this.getValueAt(local.x, local.y);

        // Return tooltip info
        return new TooltipInfo(
            { value: value.toFixed(3) },
            canvasX, canvasY
        );
    }

    // OPTIONAL: Handle clicks
    handleClick(canvasX, canvasY, simulation) {
        const local = this.canvasToLocal(canvasX, canvasY);
        console.log(`Clicked at local: (${local.x}, ${local.y})`);

        // Perform some action
        // ...

        return true; // Indicate we handled the click
    }
}

// Use the panel
const panel = new MyPanel('My Panel', {
    x: 0, y: 0, width: 512, height: 512
});

// Render it
panel.render(ctx, simulation, time);

// Handle mouse events
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (panel.containsPoint(x, y)) {
        const tooltip = panel.handleMouseMove(x, y, simulation);
        if (tooltip) {
            displayTooltip(tooltip.data, tooltip.canvasX, tooltip.canvasY);
        }
    }
});

// Handle resize
window.addEventListener('resize', () => {
    panel.updateBounds({
        x: 0, y: 0,
        width: canvas.width,
        height: canvas.height
    });
});
```

### Coordinate Systems

The Panel class manages two coordinate systems:

1. **Canvas Coordinates** (absolute)
   - Origin at top-left of canvas
   - Range: [0, canvasWidth] × [0, canvasHeight]
   - Used for mouse events and canvas drawing

2. **Local Panel Coordinates** (relative)
   - Origin at top-left of panel
   - Range: [0, panelWidth] × [0, panelHeight]
   - Used for panel-specific logic

Conversion methods:
- `canvasToLocal(canvasX, canvasY)` → `{x, y}` in local space
- `localToCanvas(localX, localY)` → `{x, y}` in canvas space

### TooltipInfo Class

The `TooltipInfo` class encapsulates tooltip data:

```javascript
class TooltipInfo {
    constructor(data, canvasX, canvasY) {
        this.data = data;       // Object with tooltip content
        this.canvasX = canvasX; // X position for display
        this.canvasY = canvasY; // Y position for display
    }
}
```

Panels return `TooltipInfo` from `handleMouseMove()` to provide hover information.

### Design Principles

1. **Abstract Base Class**: Panel defines interface, subclasses implement specifics
2. **Coordinate Conversion**: Panel handles the math, subclasses use local coords
3. **Optional Overrides**: Sensible defaults for optional methods
4. **Type Safety**: Clear contracts through JSDoc and runtime validation
5. **Immutable Bounds**: Bounds are copied to prevent external mutation

### Testing

The Panel base class has comprehensive tests:

- **Unit Tests**: `/tests/test-panel-base.js` - 25+ test cases
- **Visual Tests**: `/tests/test-panel-visual.html` - Interactive demonstrations

Tests cover:
- Constructor validation (bounds checking)
- Coordinate conversion (round-trips, edge cases)
- Bounds checking (containsPoint accuracy)
- Mouse event handling
- Abstract method enforcement
- Bounds updates
- Subclass extensibility

To run tests:

```bash
# Run unit tests (Node.js)
node tests/test-panel-base.js

# View visual tests (browser)
open tests/test-panel-visual.html

# Or serve and navigate
python -m http.server 8000
# Visit: http://localhost:8000/tests/test-panel-visual.html
```

### Panel API Reference

#### Constructor

```javascript
constructor(name, bounds)
```
- `name` (string): Human-readable name for debugging
- `bounds` (object): `{x, y, width, height}` in canvas coordinates

Throws if bounds are invalid (non-numeric, zero/negative dimensions).

#### Abstract Methods (Must Override)

```javascript
render(ctx, simulation, time)
```
Renders this panel to the canvas. Throws if not overridden.
- `ctx` (CanvasRenderingContext2D): Canvas context
- `simulation` (QuantumSimulation): Current simulation state
- `time` (number): Current simulation time

#### Concrete Methods (Built-in)

```javascript
canvasToLocal(canvasX, canvasY)
```
Converts canvas coordinates to local panel coordinates.
Returns: `{x, y}` in local space

```javascript
localToCanvas(localX, localY)
```
Converts local panel coordinates to canvas coordinates.
Returns: `{x, y}` in canvas space

```javascript
containsPoint(canvasX, canvasY)
```
Checks if a point is within this panel's bounds.
Returns: `boolean`

#### Optional Methods (Override if Needed)

```javascript
handleMouseMove(canvasX, canvasY, simulation)
```
Called when mouse moves over panel.
Returns: `TooltipInfo` or `null`

```javascript
handleClick(canvasX, canvasY, simulation)
```
Called when panel is clicked.
Returns: `boolean` (true if handled)

```javascript
updateBounds(newBounds)
```
Called when panel bounds change (e.g., on resize).
Default implementation validates and updates bounds.

#### Utility Methods

```javascript
toString()
```
Returns descriptive string for debugging.

### Future Phases

### Phase 3: Specialized Panel Implementations (PLANNED)
- Implement `WavefunctionPanel` using Panel base class
- Implement `PotentialPlotPanel` using Panel base class
- Implement `PhaseWheelPanel` using Panel base class

### Phase 4: Extract Rendering Logic (PLANNED)
- Move wavefunction rendering to `WavefunctionPanel`
- Move plot rendering to `PotentialPlotPanel`
- Move phase wheel rendering to `PhaseWheelPanel`

### Phase 5: Integrate Panels (PLANNED)
- Update `Visualizer` to use panel system
- Remove old rendering code
- Verify all functionality preserved

### Phase 6: Add New Features (PLANNED)
- Momentum space visualization
- Energy spectrum display
- Enhanced measurement feedback

## Integration Notes

**Current Status**: CanvasLayout and Panel base class are complete but not yet integrated into `visualization.js`.

**Next Step**: Phase 3 will implement specialized panels (WavefunctionPanel, PotentialPlotPanel, PhaseWheelPanel) using the Panel base class.

**No Breaking Changes**: The existing `visualization.js` is untouched. This new code exists alongside it.

## API Reference

### Panel API

See the **Phase 2: Panel Base Class** section above for complete Panel API documentation.

Key files:
- `/js/visualization/core/Panel.js` - Panel base class with comprehensive JSDoc
- `/js/visualization/core/TooltipInfo.js` - Tooltip data structure
- `/tests/test-panel-base.js` - Unit tests demonstrating usage
- `/tests/test-panel-visual.html` - Visual examples

### CanvasLayout API

See JSDoc comments in `/js/visualization/core/CanvasLayout.js` for complete API documentation.

### CanvasLayout Constructor

```javascript
new CanvasLayout(canvasWidth, canvasHeight, config)
```

### Primary Methods

- `calculateLayout()` - Returns bounds for all panels
- `hitTest(x, y)` - Determines which panel contains point
- `updateDimensions(width, height)` - Updates canvas size
- `updateConfig(config)` - Changes panel visibility

### Convenience Methods

- `getWavefunctionBounds()` - Quick access to grid bounds
- `getPotentialPlotBounds()` - Quick access to plot bounds
- `getPhaseWheelBounds()` - Quick access to wheel bounds

## Contributing

When adding new visualization features:

1. **Use CanvasLayout** for all spatial calculations
2. **Add Tests** for new functionality
3. **Update Documentation** in this README
4. **Follow Phases** - don't skip ahead in the refactor plan

## Related Documentation

- `/docs/ROOT_ARCHITECTURE.md` - Overall system architecture
- `/js/README.md` - JavaScript module structure
- `/visualization-cleanup-plan.md` - Complete refactor roadmap
- `/CLAUDE.md` - Project overview for AI assistants

---

**Last Updated**: 2025-12-13
**Phase**: 2 of 6 (Complete)
**Next Milestone**: Implement specialized panel classes (WavefunctionPanel, etc.)
