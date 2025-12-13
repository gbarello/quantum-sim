# VisualizerV2 Quick Start Guide

## Installation

No installation needed - VisualizerV2 is already part of the project.

## Basic Usage

### 1. Import

```javascript
import { VisualizerV2 } from './visualization/VisualizerV2.js';
import { QuantumSimulation } from './quantum.js';
```

### 2. Create Instances

```javascript
// Create simulation
const simulation = new QuantumSimulation({
  gridSize: 128,
  domainSize: 10.0,
  dt: 0.01
});

// Get canvas
const canvas = document.getElementById('myCanvas');

// Create visualizer
const visualizer = new VisualizerV2(canvas, simulation);
```

### 3. Render Loop

```javascript
function animate() {
  simulation.step();
  visualizer.render();
  requestAnimationFrame(animate);
}

animate();
```

That's it! You now have a working quantum visualization.

## With Configuration

```javascript
const visualizer = new VisualizerV2(canvas, simulation, {
  visualizationMode: 'full',      // 'full', 'probability', 'phase'
  saturationScale: 5.0,           // Amplitude scaling
  showGrid: false,                // Grid overlay
  showPhaseWheel: false,          // Phase reference
  showPotentialPlot: true         // Potential plot (default: true)
});
```

## Common Operations

### Change Visualization Mode

```javascript
visualizer.setVisualizationMode('probability');  // or 'full', 'phase'
```

### Toggle Overlays

```javascript
visualizer.setGridVisible(true);
visualizer.setPhaseWheelVisible(true);
```

### Adjust Amplitude Scaling

```javascript
visualizer.setSaturationScale(10.0);  // Higher = more vivid colors
```

### Show Measurement Feedback

```javascript
// After measurement
const result = simulation.measure(x, y);
visualizer.showMeasurementFeedback(
  x, y,
  result.found ? 'positive' : 'negative'
);
```

### Handle Hover

```javascript
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const gridCoords = visualizer.canvasToGrid(x, y);
  if (gridCoords) {
    visualizer.setHoverState(true, gridCoords.x, gridCoords.y);
  }
});

canvas.addEventListener('mouseleave', () => {
  visualizer.setHoverState(false);
});
```

### Handle Resize

```javascript
window.addEventListener('resize', () => {
  visualizer.resize();
});
```

## Complete Example

```javascript
import { VisualizerV2 } from './visualization/VisualizerV2.js';
import { QuantumSimulation } from './quantum.js';

class App {
  constructor() {
    // Setup
    this.canvas = document.getElementById('canvas');
    this.simulation = new QuantumSimulation({ gridSize: 128 });
    this.visualizer = new VisualizerV2(this.canvas, this.simulation, {
      visualizationMode: 'full',
      saturationScale: 5.0
    });

    // Event listeners
    this.setupEvents();

    // Start
    this.animate();
  }

  setupEvents() {
    // Click to measure
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = this.visualizer.canvasToGrid(x, y);

      if (coords) {
        const result = this.simulation.measure(coords.x, coords.y);
        this.visualizer.showMeasurementFeedback(
          coords.x, coords.y,
          result.found ? 'positive' : 'negative'
        );
      }
    });

    // Hover for preview
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = this.visualizer.canvasToGrid(x, y);

      if (coords) {
        this.visualizer.setHoverState(true, coords.x, coords.y);
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.visualizer.setHoverState(false);
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.visualizer.resize();
    });

    // UI controls
    document.getElementById('vizMode').addEventListener('change', (e) => {
      this.visualizer.setVisualizationMode(e.target.value);
    });

    document.getElementById('gridToggle').addEventListener('change', (e) => {
      this.visualizer.setGridVisible(e.target.checked);
    });
  }

  animate() {
    this.simulation.step();
    this.visualizer.render();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize
const app = new App();
```

## Migration from Original Visualizer

### Before (Original Visualizer)

```javascript
import { Visualizer } from './visualization.js';

const visualizer = new Visualizer(canvas, simulation);
visualizer.setVisualizationMode('full');
visualizer.setGridVisible(false);
```

### After (VisualizerV2)

**Option 1**: Change import only

```javascript
import { VisualizerV2 as Visualizer } from './visualization/VisualizerV2.js';

// Everything else stays the same!
const visualizer = new Visualizer(canvas, simulation);
visualizer.setVisualizationMode('full');
visualizer.setGridVisible(false);
```

**Option 2**: Use constructor config

```javascript
import { VisualizerV2 } from './visualization/VisualizerV2.js';

const visualizer = new VisualizerV2(canvas, simulation, {
  visualizationMode: 'full',
  showGrid: false
});
```

Both work identically!

## Testing Your Setup

### 1. Visual Test

Open `index-v2.html` in browser. You should see:
- Wavefunction visualization (colored grid)
- Smooth animation
- Click to measure
- Hover to see preview circle

### 2. Comparison Test

Open `tests/compare-visualizers.html`. You should see:
- Two canvases side-by-side (original vs V2)
- Identical rendering
- Green "Identical" status

### 3. Unit Tests

Open `tests/test-visualizer-v2.html`. You should see:
- All tests passing (green checkmarks)
- No failed tests

## Troubleshooting

### Nothing renders

**Check:**
- Canvas element exists in HTML
- Simulation is initialized
- `render()` is being called each frame
- No errors in console

### Colors look wrong

**Check:**
- `saturationScale` is set correctly (default: 5.0)
- Visualization mode is correct ('full', 'probability', 'phase')
- Wavefunction is not all zeros

### Performance issues

**Check:**
- Grid size is reasonable (128-256 for smooth performance)
- Not recreating visualizer every frame
- Using `requestAnimationFrame` for animation loop

### Hover circle not showing

**Check:**
- `setHoverState(true, x, y)` is being called
- Coordinates are in grid space (not canvas space)
- Measurement radius is set: `setMeasurementRadius(radius)`

## API Reference Summary

### Constructor
```javascript
new VisualizerV2(canvas, simulation, config?)
```

### Rendering
```javascript
render()                 // Render current state
resize()                 // Update canvas size
```

### Configuration
```javascript
setVisualizationMode(mode)     // 'full', 'probability', 'phase'
setSaturationScale(scale)      // Number (default: 5.0)
setGridVisible(visible)        // Boolean
setPhaseWheelVisible(visible)  // Boolean
setPotentialVisible(visible)   // Boolean
```

### Measurement Feedback
```javascript
showMeasurementFeedback(x, y, type, duration?)
setHoverState(active, x?, y?)
setMeasurementRadius(radius)
```

### Coordinate Conversion
```javascript
canvasToGrid(canvasX, canvasY)      // Returns {x, y} or null
getProbabilityAt(canvasX, canvasY)  // Returns number
```

### Cleanup
```javascript
dispose()  // Clean up resources
```

## Next Steps

- Read `docs/VISUALIZER_V2_INTEGRATION.md` for detailed migration guide
- Read `js/visualization/README.md` for architecture details
- Check `docs/VISUALIZER_V2_SUMMARY.md` for complete overview
- Run tests to verify your setup

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the integration documentation
3. Run the comparison tool to verify rendering
4. Check console for errors

---

**Version**: 1.0.0
**Last Updated**: 2025-12-13
