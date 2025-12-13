# InteractionManager Integration Guide

## Overview

The `InteractionManager` class centralizes all canvas mouse and touch interaction logic that was previously split between `Controller` and `Visualizer`. This document explains how to integrate it into the existing codebase.

## Architecture

### Before InteractionManager

```
┌─────────────┐
│  Controller │──┐
│             │  │
│ - Canvas    │  │ Duplicate coordinate
│   events    │  │ conversion logic
│ - Coordinate│  │
│   conversion│  │
└─────────────┘  │
                 ▼
┌─────────────┐  ┌──────────────┐
│  Visualizer │──│   Quantum    │
│             │  │  Simulation  │
│ - Hover     │  │              │
│   state     │  │              │
│ - Coordinate│  │              │
│   conversion│  │              │
└─────────────┘  └──────────────┘
```

**Problems:**
- Duplicate coordinate conversion in Controller and Visualizer
- Tight coupling between Controller and Visualizer
- Unclear ownership of interaction state
- Difficult to test interaction logic in isolation

### After InteractionManager

```
┌─────────────┐
│  Controller │
│             │
│ - Button    │
│   events    │
│ - Keyboard  │
│   shortcuts │
│ - Business  │
│   logic     │
└──────┬──────┘
       │ Callbacks
       ▼
┌──────────────────┐
│ Interaction      │
│ Manager          │
│                  │
│ - Canvas events  │
│ - Coordinate     │
│   conversion     │
│ - Panel hit test │
│ - Event delegate │
└────┬────┬────────┘
     │    │
     │    └──────────────┐
     ▼                   ▼
┌─────────────┐    ┌──────────────┐
│   Panels    │    │   Quantum    │
│             │    │  Simulation  │
│ - Rendering │    │              │
│ - Local     │    │              │
│   coords    │    │              │
│ - Tooltips  │    │              │
└─────────────┘    └──────────────┘
```

**Benefits:**
- Single source of truth for canvas interactions
- Clean separation of concerns
- Easy to test interaction logic
- Panels handle their own coordinate systems
- No coupling between Controller and Visualizer

## Class Interface

### Constructor

```javascript
new InteractionManager(canvas, panels, callbacks)
```

**Parameters:**

- `canvas` (HTMLCanvasElement) - The canvas element to attach listeners to
- `panels` (Map<string, Panel> | Object) - Map or object of panel instances
- `callbacks` (Object) - Callback functions for coordination:
  - `getSimulation()` - Returns current QuantumSimulation instance
  - `onHoverChange(panel)` - Called when hover panel changes
  - `onTooltipChange(tooltip)` - Called when tooltip changes
  - `onPanelClick(panel, x, y)` - Called when a panel handles a click

### Public Methods

- `getCurrentTooltip()` - Returns current TooltipInfo or null
- `getCurrentHoverPanel()` - Returns currently hovered Panel or null
- `updatePanels(panels)` - Updates the panels being managed
- `cleanup()` - Removes event listeners (call before destroying)

## Integration Steps

### Step 1: Import InteractionManager

In `js/controls.js`:

```javascript
import { InteractionManager } from './visualization/core/InteractionManager.js';
```

### Step 2: Create InteractionManager in Controller

In the `Controller` constructor, after creating the visualizer:

```javascript
constructor(simulation, visualizer, uiElements) {
    // ... existing constructor code ...

    // Create InteractionManager
    this.interactionManager = new InteractionManager(
        this.ui.canvas,
        visualizer.panels, // Assumes visualizer exposes its panels
        {
            getSimulation: () => this.simulation,
            onHoverChange: this.handleHoverChange.bind(this),
            onTooltipChange: this.handleTooltipChange.bind(this),
            onPanelClick: this.handlePanelClick.bind(this)
        }
    );

    // ... rest of constructor ...
}
```

### Step 3: Implement Callback Methods

Add these methods to the `Controller` class:

```javascript
/**
 * Handle hover panel change
 * @param {Panel|null} panel - The newly hovered panel, or null
 */
handleHoverChange(panel) {
    // Update visualizer hover state if needed
    if (this.visualizer && this.visualizer.setHoverPanel) {
        this.visualizer.setHoverPanel(panel);
    }

    // Update any UI elements that depend on hover state
    // For example, highlight the panel name in the UI
}

/**
 * Handle tooltip change
 * @param {TooltipInfo|null} tooltip - The new tooltip, or null
 */
handleTooltipChange(tooltip) {
    if (!this.ui.hoverProbability) return;

    if (tooltip) {
        // Show tooltip
        this.ui.hoverProbability.textContent = tooltip.text;
        this.ui.hoverProbability.style.left = `${tooltip.x}px`;
        this.ui.hoverProbability.style.top = `${tooltip.y}px`;
        this.ui.hoverProbability.style.display = 'block';
    } else {
        // Hide tooltip
        this.ui.hoverProbability.style.display = 'none';
    }
}

/**
 * Handle panel click
 * @param {Panel} panel - The clicked panel
 * @param {number} canvasX - X coordinate in canvas space
 * @param {number} canvasY - Y coordinate in canvas space
 */
handlePanelClick(panel, canvasX, canvasY) {
    // Route clicks to appropriate handlers based on panel type
    if (panel.name === 'wavefunction') {
        // Convert canvas coords to grid coords using the panel
        const gridCoords = panel.canvasToGrid(canvasX, canvasY);
        this.performMeasurement(gridCoords.x, gridCoords.y);
    }
    // Add handlers for other panel types as needed
}
```

### Step 4: Remove Old Event Listeners

In `setupEventListeners()`, remove the canvas event listeners:

```javascript
setupEventListeners() {
    // REMOVE these lines:
    // this.ui.canvas.addEventListener('click', this.handleCanvasClick);
    // this.ui.canvas.addEventListener('mousemove', this.handleCanvasMove);
    // this.ui.canvas.addEventListener('mouseleave', this.handleCanvasLeave);
    // this.ui.canvas.addEventListener('touchstart', this.handleTouchStart);
    // this.ui.canvas.addEventListener('touchmove', this.handleTouchMove);
    // this.ui.canvas.addEventListener('touchend', this.handleTouchEnd);

    // Keep button, slider, and keyboard event listeners
    if (this.ui.playPauseBtn) {
        this.ui.playPauseBtn.addEventListener('click', this.handlePlayPause);
    }
    // ... etc
}
```

### Step 5: Clean Up in Destructor

Add cleanup to the `destroy()` method:

```javascript
destroy() {
    // Clean up interaction manager
    if (this.interactionManager) {
        this.interactionManager.cleanup();
    }

    // ... existing cleanup code ...
    this.removeEventListeners();

    if (this.measurementResultTimeout) {
        clearTimeout(this.measurementResultTimeout);
    }
}
```

### Step 6: Update Visualizer to Expose Panels

In `js/visualization.js`, the `Visualizer` class needs to expose its panels. This will happen as part of the visualizer refactoring in later phases.

For now, if you're integrating before the full visualizer refactor, you can create a temporary accessor:

```javascript
class Visualizer {
    constructor(canvas, simulation) {
        // ... existing constructor ...

        // Temporary: expose panels for InteractionManager
        // This will be properly implemented in Phase 7
        this.panels = this._createTemporaryPanels();
    }

    _createTemporaryPanels() {
        // Create a main wavefunction panel covering the whole canvas
        // This is a placeholder until full panel system is implemented
        return {
            main: {
                name: 'wavefunction',
                bounds: { x: 0, y: 0, width: this.width, height: this.height },
                containsPoint: (x, y) => true, // Covers whole canvas
                handleMouseMove: (x, y, sim) => {
                    // Generate tooltip showing probability
                    const gridCoords = this.canvasToGrid(x, y);
                    const prob = sim.getProbabilityAt(gridCoords.x, gridCoords.y);
                    return {
                        text: `P = ${(prob * 100).toFixed(2)}%`,
                        x: x + 10,
                        y: y + 10
                    };
                },
                handleClick: (x, y, sim) => {
                    // Return false to let Controller handle the click
                    return false;
                },
                canvasToGrid: this.canvasToGrid.bind(this)
            }
        };
    }
}
```

## Panel Interface Requirements

For panels to work with InteractionManager, they must implement:

### Required Methods

```javascript
class Panel {
    /**
     * Check if a point is within this panel's bounds
     * @param {number} canvasX - X in canvas coordinates
     * @param {number} canvasY - Y in canvas coordinates
     * @returns {boolean} True if point is in bounds
     */
    containsPoint(canvasX, canvasY) {
        return (
            canvasX >= this.bounds.x &&
            canvasX < this.bounds.x + this.bounds.width &&
            canvasY >= this.bounds.y &&
            canvasY < this.bounds.y + this.bounds.height
        );
    }

    /**
     * Handle mouse move over this panel
     * @param {number} canvasX - X in canvas coordinates
     * @param {number} canvasY - Y in canvas coordinates
     * @param {QuantumSimulation} simulation - Current simulation
     * @returns {TooltipInfo|null} Tooltip info or null
     */
    handleMouseMove(canvasX, canvasY, simulation) {
        // Optional: return tooltip info
        return null;
    }

    /**
     * Handle click on this panel
     * @param {number} canvasX - X in canvas coordinates
     * @param {number} canvasY - Y in canvas coordinates
     * @param {QuantumSimulation} simulation - Current simulation
     * @returns {boolean} True if click was handled
     */
    handleClick(canvasX, canvasY, simulation) {
        // Optional: handle click
        return false;
    }

    /**
     * Convert canvas coords to local panel coords
     * @param {number} canvasX - X in canvas coordinates
     * @param {number} canvasY - Y in canvas coordinates
     * @returns {Object} {x, y} in local coordinates
     */
    canvasToLocal(canvasX, canvasY) {
        return {
            x: canvasX - this.bounds.x,
            y: canvasY - this.bounds.y
        };
    }
}
```

### Required Properties

```javascript
class Panel {
    constructor(name, bounds) {
        this.name = 'panel-name'; // String identifier
        this.bounds = { x: 0, y: 0, width: 100, height: 100 }; // Rectangle
    }
}
```

## Testing

### Unit Tests

Run the unit tests:

```bash
node tests/test-interaction-manager.js
```

All tests should pass:
- Constructor validation
- Event listener setup and cleanup
- Mouse event handling
- Touch event handling
- Panel hit testing
- Coordinate conversion
- State management
- Edge cases

### Visual Tests

Open the visual test page in a browser:

```bash
# Open in browser
open tests/test-interaction-visual.html
# or
firefox tests/test-interaction-visual.html
```

Test interactions:
1. Move mouse over different colored panels
2. Observe hover state changes in the info panel
3. Observe tooltips updating
4. Click on panels and see click events logged
5. Test on mobile/touch devices

### Integration Tests

After integration, test:
1. Mouse hover shows measurement circle
2. Mouse hover shows probability tooltip
3. Click performs measurement
4. Touch interactions work on mobile
5. Multiple rapid movements don't cause issues
6. Leaving canvas clears hover state

## Common Issues

### Issue: Callbacks not firing

**Cause:** Callback is not provided or is not a function.

**Solution:** Ensure all callbacks in the callbacks object are functions:

```javascript
callbacks: {
    getSimulation: () => this.simulation,
    onHoverChange: (panel) => { /* handle */ },
    onTooltipChange: (tooltip) => { /* handle */ },
    onPanelClick: (panel, x, y) => { /* handle */ }
}
```

### Issue: Panels not receiving events

**Cause:** Panel bounds are incorrect or containsPoint is not implemented.

**Solution:** Verify panel bounds match canvas coordinates:

```javascript
console.log('Canvas size:', canvas.width, canvas.height);
console.log('Panel bounds:', panel.bounds);
```

### Issue: Coordinate conversion is off

**Cause:** Canvas CSS size differs from canvas pixel size, or getBoundingClientRect offset is wrong.

**Solution:** InteractionManager handles this automatically. Verify canvas setup:

```javascript
// Canvas should have explicit width/height
canvas.width = 600;
canvas.height = 600;
```

### Issue: Memory leaks

**Cause:** InteractionManager.cleanup() not called when destroying.

**Solution:** Always call cleanup in destructor:

```javascript
destroy() {
    if (this.interactionManager) {
        this.interactionManager.cleanup();
    }
}
```

### Issue: Touch events not working

**Cause:** Touch event listeners not properly attached or prevented.

**Solution:** InteractionManager handles this automatically. Verify mobile browser:

```javascript
// Touch events should work automatically
// Test on actual mobile device or using browser DevTools mobile emulation
```

## Performance Considerations

### Panel Hit Testing

InteractionManager checks panels in order until one matches. For many panels:

```javascript
// Optimize panel ordering: put most frequently hovered panels first
const panels = {
    main: mainPanel,      // Most common
    sidebar: sidebarPanel, // Less common
    footer: footerPanel    // Rare
};
```

### Event Throttling

InteractionManager processes every mousemove event. For very high-frequency updates:

```javascript
// Optional: Add throttling in the callback
let lastUpdate = 0;
const throttleMs = 16; // ~60fps

onTooltipChange: (tooltip) => {
    const now = Date.now();
    if (now - lastUpdate < throttleMs) return;
    lastUpdate = now;

    // Update UI
}
```

### Coordinate Conversion

Coordinate conversion is fast (simple arithmetic), but if concerned:

```javascript
// Cache canvas rect if it changes infrequently
// InteractionManager calls getBoundingClientRect on every event
// This is necessary to handle canvas resizing correctly
```

## Migration Checklist

- [ ] Import InteractionManager in Controller
- [ ] Create InteractionManager in Controller constructor
- [ ] Implement handleHoverChange callback
- [ ] Implement handleTooltipChange callback
- [ ] Implement handlePanelClick callback
- [ ] Remove old canvas event listeners from Controller
- [ ] Update Visualizer to expose panels
- [ ] Add cleanup call to Controller.destroy()
- [ ] Run unit tests (all passing)
- [ ] Run visual tests (interactions working)
- [ ] Test on desktop browser
- [ ] Test on mobile browser
- [ ] Test with touch events
- [ ] Verify no memory leaks (cleanup working)

## Next Steps

After integrating InteractionManager:

1. **Phase 7:** Refactor Visualizer to use LayoutManager and PanelRenderer
2. **Phase 8:** Implement additional panels (PotentialPlotPanel, etc.)
3. **Phase 9:** Add advanced interactions (drag-to-draw potentials, etc.)
4. **Phase 10:** Performance optimization (WebGL acceleration, etc.)

## Questions?

See:
- `js/visualization/core/InteractionManager.js` - Full implementation
- `js/visualization/core/Panel.js` - Panel base class
- `tests/test-interaction-manager.js` - Unit tests
- `tests/test-interaction-visual.html` - Visual tests
- `docs/ROOT_ARCHITECTURE.md` - Overall architecture

---

**Document Version:** 1.0
**Last Updated:** 2025-12-13
**Phase:** 6 - InteractionManager Implementation
