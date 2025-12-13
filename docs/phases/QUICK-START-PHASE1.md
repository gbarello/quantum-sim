# Phase 1 Quick Start Guide

## What Was Done

Phase 1 extracted layout logic from `visualization.js` into a dedicated `CanvasLayout` class. This provides a clean foundation for the panel-based architecture.

## Key Files

| File | Purpose |
|------|---------|
| `js/visualization/core/CanvasLayout.js` | Core layout class |
| `tests/test-canvas-layout.html` | Run unit tests |
| `tests/test-canvas-layout-visual.html` | Visual demo |
| `js/visualization/README.md` | Full documentation |
| `PHASE1-COMPLETE.md` | Detailed summary |

## Quick Test

```bash
# Start local server
python -m http.server 8000

# Open in browser:
# http://localhost:8000/tests/test-canvas-layout.html
# http://localhost:8000/tests/test-canvas-layout-visual.html
```

## Basic Usage

```javascript
import { CanvasLayout } from './js/visualization/core/CanvasLayout.js';

// Create layout manager
const layout = new CanvasLayout(800, 600, {
  showPlot: true,
  showPhaseWheel: false
});

// Get panel bounds
const panels = layout.calculateLayout();
// Returns: { wavefunction, potentialPlot, phaseWheel }

// Test which panel was clicked
const hit = layout.hitTest(mouseX, mouseY);
if (hit) {
  console.log(hit.panel); // 'wavefunction', 'potentialPlot', or 'phaseWheel'
}
```

## API Summary

### Constructor
```javascript
new CanvasLayout(width, height, config)
```

### Methods
- `calculateLayout()` - Get all panel bounds
- `hitTest(x, y)` - Which panel contains point?
- `updateDimensions(w, h)` - Resize canvas
- `updateConfig(config)` - Toggle panels
- `getWavefunctionBounds()` - Quick access to grid
- `getPotentialPlotBounds()` - Quick access to plot
- `getPhaseWheelBounds()` - Quick access to wheel

## Layout Rules

1. **Wavefunction Grid**: Square, size = canvas height
2. **Potential Plot**: Remaining horizontal space
3. **Phase Wheel**: Overlaid in top-right corner

## What's Next?

**Phase 2**: Create panel base classes
- `BasePanel` abstract class
- `WavefunctionPanel`
- `PotentialPlotPanel`
- `PhaseWheelPanel`

## Status

✅ Phase 1 Complete
- No existing code modified
- All tests passing
- Fully documented
- Ready for Phase 2

## Questions?

Read the full documentation:
- `js/visualization/README.md` - Module overview
- `PHASE1-COMPLETE.md` - Detailed summary
- JSDoc comments in `CanvasLayout.js` - API reference
