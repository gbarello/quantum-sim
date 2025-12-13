# Visualization Panels

This directory contains specialized panel implementations for the Quantum Playground visualization system.

## Overview

Each panel is a self-contained component that:
- Extends the `Panel` base class
- Manages its own rendering logic
- Handles coordinate conversions
- Responds to mouse events
- Provides tooltips when appropriate

## Architecture

```
panels/
├── WavefunctionPanel.js          - Core wavefunction rendering
├── PotentialPlotPanel.js         - Potential energy profile plot
├── GridOverlayPanel.js           - Grid line overlay
├── MeasurementFeedbackPanel.js   - Measurement animation feedback
├── MeasurementCirclePanel.js     - Hover measurement indicator
├── PhaseWheelPanel.js            - Phase wheel color legend
└── index.js                      - Barrel exports for all panels
```

## WavefunctionPanel

**Status:** ✅ Complete and tested
**File:** `WavefunctionPanel.js`
**Lines:** 408

The main wavefunction visualization panel that renders the complex-valued quantum wavefunction ψ(x,y) using a sophisticated color mapping scheme.

### Features

- **Complex-to-color mapping**: Phase → hue, amplitude → saturation/lightness
- **Three visualization modes**:
  - Full: Complete complex visualization (default)
  - Probability: Grayscale |ψ|² display
  - Phase: Phase-only with full saturation
- **Performance optimized**: ImageData manipulation for fast rendering
- **Mouse interaction**: Probability tooltips on hover
- **Configurable**: Adjustable saturation scale and visualization mode

### Usage Example

```javascript
import { WavefunctionPanel } from './js/visualization/panels/WavefunctionPanel.js';

// Create panel
const panel = new WavefunctionPanel(
    { x: 0, y: 0, width: 512, height: 512 },
    {
        visualizationMode: 'full',
        saturationScale: 5.0
    }
);

// Render to canvas
const ctx = canvas.getContext('2d');
panel.render(ctx, simulation, time);

// Handle mouse hover
canvas.addEventListener('mousemove', (e) => {
    const tooltip = panel.handleMouseMove(e.clientX, e.clientY, simulation);
    if (tooltip) {
        console.log(tooltip.data.text); // "P = 0.25%"
    }
});

// Update configuration
panel.setVisualizationMode('probability');
panel.setSaturationScale(8.0);
```

### Color Mapping

The panel uses HSL color space for intuitive phase visualization:

| Phase | Angle | Color | Meaning |
|-------|-------|-------|---------|
| 0° | 0 | Red | Real positive |
| 90° | π/2 | Yellow | Imaginary positive |
| 180° | π | Cyan | Real negative |
| 270° | 3π/2 | Blue | Imaginary negative |

Amplitude controls both saturation and lightness:
- High amplitude → bright, saturated colors
- Low amplitude → dark, desaturated colors

### Algorithm

```
For each grid cell (gx, gy):
    1. Get ψ(gx, gy) = {re, im}
    2. Calculate amplitude = √(re² + im²)
    3. Calculate phase = atan2(im, re)
    4. Convert phase to hue (0-360°)
    5. Apply amplitude boost: √amplitude
    6. Calculate saturation from boosted amplitude
    7. Calculate lightness from boosted amplitude
    8. Convert HSL to RGB
    9. Fill all canvas pixels in that cell
```

### Performance

Rendering performance (approximate):

| Grid Size | Panel Size | Time |
|-----------|------------|------|
| 64×64     | 512×512    | 0.5 ms |
| 128×128   | 512×512    | 1.5 ms |
| 256×256   | 512×512    | 5.0 ms |

Performance scales as O(N²) where N is the grid size.

### API Reference

#### Constructor

```javascript
new WavefunctionPanel(bounds, config)
```

**Parameters:**
- `bounds` (Object): Panel position and size
  - `x` (number): Left edge in canvas coordinates
  - `y` (number): Top edge in canvas coordinates
  - `width` (number): Panel width in pixels
  - `height` (number): Panel height in pixels
- `config` (Object): Configuration options
  - `visualizationMode` (string): 'full', 'probability', or 'phase' (default: 'full')
  - `saturationScale` (number): Saturation multiplier (default: 5.0)

#### Methods

##### `render(ctx, simulation, time)`

Renders the wavefunction to the canvas.

**Parameters:**
- `ctx` (CanvasRenderingContext2D): Canvas context
- `simulation` (QuantumSimulation): Simulation instance
- `time` (number): Current time (unused)

**Returns:** `void`

##### `canvasToGrid(canvasX, canvasY, gridSize)`

Converts canvas coordinates to grid indices.

**Parameters:**
- `canvasX` (number): X coordinate in canvas space
- `canvasY` (number): Y coordinate in canvas space
- `gridSize` (number): Size of the simulation grid

**Returns:** `{x, y}` - Grid coordinates

##### `handleMouseMove(canvasX, canvasY, simulation)`

Handles mouse move events and returns tooltip information.

**Parameters:**
- `canvasX` (number): X coordinate in canvas space
- `canvasY` (number): Y coordinate in canvas space
- `simulation` (QuantumSimulation): Simulation instance

**Returns:** `TooltipInfo|null` - Tooltip data or null

##### `setVisualizationMode(mode)`

Sets the visualization mode.

**Parameters:**
- `mode` (string): 'full', 'probability', or 'phase'

**Returns:** `void`

##### `setSaturationScale(scale)`

Sets the saturation scale multiplier.

**Parameters:**
- `scale` (number): Saturation multiplier (typically 1.0 to 10.0)

**Returns:** `void`

##### `getHoverGridCoords()`

Gets the current hover position in grid coordinates.

**Returns:** `{x, y}|null` - Grid coordinates or null if not hovering

### Testing

The WavefunctionPanel has comprehensive test coverage:

#### Unit Tests

**File:** `/tests/test-wavefunction-panel.js`

12 test cases covering:
- Construction and configuration
- Coordinate conversions
- Color mapping (HSL to RGB)
- Complex to color conversion
- All visualization modes
- Rendering to ImageData
- Mouse interaction
- Configuration updates

**Run tests:**
```bash
open tests/test-wavefunction-visual.html
```

#### Visual Comparison

**File:** `/tests/compare-rendering.html`

Pixel-perfect comparison against the original Visualizer:
- Side-by-side rendering
- Difference map (amplified)
- Detailed pixel analysis
- Performance metrics

**Run comparison:**
```bash
open tests/compare-rendering.html
```

**Expected result:**
- 100% identical pixels
- Max difference: 0
- Difference canvas: completely black

### Implementation Details

#### ImageData Rendering

The panel uses direct ImageData manipulation for performance:

```javascript
const imageData = ctx.createImageData(width, height);
const data = imageData.data; // Uint8ClampedArray

// For each pixel at (px, py):
const pixelIdx = (py * width + px) * 4;
data[pixelIdx]     = r; // Red
data[pixelIdx + 1] = g; // Green
data[pixelIdx + 2] = b; // Blue
data[pixelIdx + 3] = 255; // Alpha

ctx.putImageData(imageData, x, y);
```

#### Cell-Based Rendering

To match the grid-based simulation, rendering is cell-based:

```javascript
const cellSize = panelWidth / gridSize;

for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
        // Get color for this cell
        const color = complexToColor(psi.get(gx, gy));

        // Fill all pixels in this cell
        const startX = Math.floor(gx * cellSize);
        const startY = Math.floor(gy * cellSize);
        const endX = Math.floor((gx + 1) * cellSize);
        const endY = Math.floor((gy + 1) * cellSize);

        for (let py = startY; py < endY; py++) {
            for (let px = startX; px < endX; px++) {
                setPixel(px, py, color);
            }
        }
    }
}
```

This ensures:
- Sharp cell boundaries
- Consistent coloring within cells
- Accurate grid representation

#### Amplitude Boost

To improve visibility of dim regions, amplitude is boosted using a square root:

```javascript
const amplitude = Math.sqrt(re * re + im * im);
const boostedAmplitude = Math.sqrt(amplitude);
```

This compresses the dynamic range:
- Dim regions (amplitude ≈ 0) become brighter
- Bright regions (amplitude ≈ 1) remain bright
- Overall contrast is improved

### Coordinate Systems

The panel works with three coordinate systems:

1. **Canvas coordinates**: Absolute pixel positions on the canvas
   - Origin: Top-left of canvas
   - Range: [0, canvasWidth) × [0, canvasHeight)

2. **Local coordinates**: Relative to panel's top-left corner
   - Origin: Top-left of panel
   - Range: [0, panelWidth) × [0, panelHeight)

3. **Grid coordinates**: Indices into the simulation grid
   - Origin: Top-left of grid
   - Range: [0, gridSize) × [0, gridSize)

Conversion methods:
- `canvasToLocal()`: Canvas → Local (inherited from Panel)
- `canvasToGrid()`: Canvas → Grid (implemented)

### Configuration

#### Visualization Modes

**Full Complex (default)**
- Shows both phase and amplitude
- Phase → hue, amplitude → saturation/lightness
- Best for seeing complete quantum state

**Probability**
- Grayscale |ψ|² display
- Gamma correction for visibility
- Best for probability density analysis

**Phase**
- Phase-only with full saturation
- Amplitude only affects lightness
- Best for phase patterns

#### Saturation Scale

Controls color intensity:
- **Low (1.0-3.0)**: Subtle colors, more realistic
- **Medium (4.0-6.0)**: Good balance (default: 5.0)
- **High (7.0-10.0)**: Vivid colors, high contrast

Adjust based on:
- Wavefunction amplitude distribution
- Display characteristics
- Personal preference

### Limitations

Current limitations:

1. **Square panels only**: Width must equal height
2. **Grid size must be power of 2**: Required by FFT (simulation constraint)
3. **No caching**: Re-renders every frame even if unchanged
4. **No WebGL**: Uses CPU-based ImageData (could be 10-100× faster with GPU)

These limitations are acceptable for the current implementation and may be addressed in future versions.

### Future Enhancements

Potential improvements:

1. **Caching**: Only re-render when wavefunction changes
2. **WebGL acceleration**: Use shaders for color mapping
3. **Progressive rendering**: Render at lower resolution while animating
4. **Multiple color schemes**: Alternative phase-to-hue mappings
5. **Anti-aliasing**: Smooth cell boundaries
6. **Region of interest**: Only render visible portion

### Dependencies

Required imports:
```javascript
import { Panel } from '../core/Panel.js';
import { TooltipInfo } from '../core/TooltipInfo.js';
```

Required simulation interface:
```javascript
simulation.gridSize        // number (power of 2)
simulation.psi             // ComplexGrid
simulation.getProbabilityAt(x, y)  // function
```

### Related Files

- **Base class**: `js/visualization/core/Panel.js`
- **Tests**: `tests/test-wavefunction-panel.js`
- **Visual test**: `tests/test-wavefunction-visual.html`
- **Comparison**: `tests/compare-rendering.html`
- **Documentation**: `docs/PHASE3_WAVEFUNCTION_PANEL.md`

---

## PotentialPlotPanel

**Status:** ✅ Complete and tested
**File:** `PotentialPlotPanel.js`
**Lines:** 289

The potential energy profile visualization panel that renders the potential V(x,y) as a line plot showing the profile along the vertical centerline of the simulation grid.

### Features

- **Line plot visualization**: Red line showing potential profile
- **Automatic normalization**: Scales to fit panel bounds
- **Zero reference line**: Dashed white line when V=0 is in range
- **Labeled display**: Shows potential type and axis label
- **Mouse interaction**: Tooltip showing potential value at Y position
- **Edge case handling**: No potential, zero range, constant potentials
- **Transparent background**: Integrates with canvas background

### Usage Example

```javascript
import { PotentialPlotPanel } from './js/visualization/panels/PotentialPlotPanel.js';

// Create panel (typically narrow vertical strip)
const panel = new PotentialPlotPanel({
    x: 512,      // Right of main wavefunction panel
    y: 0,
    width: 100,  // Narrow strip
    height: 512
});

// Render to canvas
const ctx = canvas.getContext('2d');
panel.render(ctx, simulation, time);

// Handle mouse hover
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    if (panel.containsPoint(canvasX, canvasY)) {
        const tooltip = panel.handleMouseMove(canvasX, canvasY, simulation);
        if (tooltip) {
            console.log(tooltip.data.V); // "2.50"
        }
    }
});
```

### Rendering Algorithm

```
1. Check if potential exists (skip if potentialType === 'none')
2. Extract potential values along vertical centerline:
   - centerX = floor(gridSize / 2)
   - For each gy: profile[gy] = potential[gy * gridSize + centerX]
3. Find min/max for normalization (handle zero range)
4. Calculate plot area with padding (max(5px, 10% of width))
5. Draw red line through normalized points:
   - normalized = 1 - ((V - minV) / (maxV - minV))  [flipped]
   - x = bounds.x + padding + normalized * plotAreaWidth
   - y = bounds.y + (gy / (gridSize - 1)) * plotHeight
6. Draw zero reference line if minV <= 0 <= maxV
7. Draw label showing potential type
8. Draw axis label "V(x)"
```

### Coordinate Flipping

The normalization uses `1 - ...` to flip the coordinate:
- **Positive potentials** (barriers): Extend left
- **Negative potentials** (wells): Extend right

This matches physical intuition about attractive potentials being "deeper".

### Performance

Rendering performance (approximate):

| Grid Size | Panel Size | Time |
|-----------|------------|------|
| 64×64     | 100×512    | <0.1 ms |
| 128×128   | 100×512    | <0.2 ms |
| 256×256   | 100×512    | <0.5 ms |

Performance scales as O(N) where N is the grid size (single centerline scan).

### API Reference

#### Constructor

```javascript
new PotentialPlotPanel(bounds)
```

**Parameters:**
- `bounds` (Object): Panel position and size
  - `x` (number): Left edge in canvas coordinates
  - `y` (number): Top edge in canvas coordinates
  - `width` (number): Panel width in pixels
  - `height` (number): Panel height in pixels

#### Methods

##### `render(ctx, simulation, time)`

Renders the potential profile to the canvas.

**Parameters:**
- `ctx` (CanvasRenderingContext2D): Canvas context
- `simulation` (QuantumSimulation): Simulation instance
- `time` (number): Current time (unused)

**Returns:** `void`

**Note:** Returns early if `simulation.potentialType === 'none'`

##### `handleMouseMove(canvasX, canvasY, simulation)`

Handles mouse move events and returns tooltip with potential value.

**Parameters:**
- `canvasX` (number): X coordinate in canvas space
- `canvasY` (number): Y coordinate in canvas space
- `simulation` (QuantumSimulation): Simulation instance

**Returns:** `TooltipInfo|null` - Tooltip with V value or null

**Tooltip format:**
```javascript
{
    data: { V: "2.50" },  // Formatted to 2 decimal places
    canvasX: x + 10,      // Offset from cursor
    canvasY: y + 10
}
```

##### `updateBounds(newBounds)`

Updates panel bounds and clears cached data.

**Parameters:**
- `newBounds` (Object): New panel bounds

**Returns:** `void`

**Note:** Clears `_cachedProfile`, `_cachedRange`, and `_cachedPotentialType`

### Testing

The PotentialPlotPanel has comprehensive test coverage:

#### Unit Tests

**File:** `/tests/test-potential-panel.js`

16 test cases covering:
- Construction and bounds validation
- Point containment checking
- Coordinate conversion
- Rendering with no potential
- Rendering different potential types (Gaussian, well, harmonic, double, constant)
- Mouse interaction and tooltips
- Bounds updates and cache clearing
- Label formatting
- Profile extraction along centerline
- Different grid sizes (32, 64, 128, 256)

**Run tests:**
```bash
node --input-type=module -e "import { runTests } from './tests/test-potential-panel.js'; runTests();"
```

**Expected result:**
```
=== PotentialPlotPanel Unit Tests ===
✓ All tests passed!
Passed: 16
Failed: 0
```

#### Visual Test

**File:** `/tests/test-potential-visual.html`

Interactive test tool featuring:
- Side-by-side display of 4 different potential types
- Comparison with original Visualizer output
- Live tooltips on hover
- Performance metrics
- Grid size selector
- Unit test runner

**Run visual test:**
```bash
open tests/test-potential-visual.html
```

### Implementation Details

#### Caching Strategy

The panel caches data for efficient tooltips:

```javascript
this._cachedProfile = potentialProfile;  // Array of V values
this._cachedRange = { min: minV, max: maxV };
this._cachedPotentialType = potentialType;
```

Cache is invalidated when:
- Bounds change (`updateBounds()`)
- Potential type becomes 'none'

#### Edge Cases

**No Potential:**
```javascript
if (!potentialType || potentialType === 'none') {
    // Clear cache and return early
    return;
}
```

**Zero Range (constant potential):**
```javascript
if (Math.abs(maxV - minV) < 1e-10) {
    minV -= 1;
    maxV += 1;
}
```

**Zero Reference Line:**
```javascript
if (minV <= 0 && maxV >= 0) {
    // Draw dashed white line at V=0
    const zeroX = bounds.x + padding + (1 - (0 - minV) / (maxV - minV)) * plotAreaWidth;
    ctx.setLineDash([5, 5]);
    // ...
}
```

#### Styling

- **Profile line**: `rgba(255, 0, 0, 0.9)`, lineWidth 2
- **Zero line**: `rgba(255, 255, 255, 0.5)`, lineWidth 1, dashed [5, 5]
- **Label**: `rgba(255, 255, 255, 0.8)`, font '10px sans-serif'
- **Axis label**: `rgba(255, 255, 255, 0.8)`, font '8px sans-serif'
- **Background**: Transparent

### Coordinate Systems

The panel works with two main coordinate systems:

1. **Canvas coordinates**: Absolute pixel positions
   - Used for rendering and mouse events
   - Origin: Top-left of canvas

2. **Grid coordinates**: Simulation grid indices
   - Used for data access
   - Origin: Top-left of grid (0, 0)
   - Range: [0, gridSize)

**Y-coordinate mapping:**
```javascript
// Canvas Y → Grid Y
const yFraction = (canvasY - bounds.y) / bounds.height;  // 0 to 1
const gridY = Math.floor(yFraction * gridSize);

// Grid Y → Canvas Y
const canvasY = bounds.y + (gridY / (gridSize - 1)) * bounds.height;
```

### Limitations

Current limitations:

1. **Centerline only**: Extracts profile from vertical centerline (x = gridSize/2)
2. **No horizontal profiles**: Only vertical orientation supported
3. **No pan/zoom**: Fixed view of full potential range
4. **No axis ticks**: No numerical scale markers
5. **Minimal labeling**: Only type and axis label

These limitations are acceptable for the current visualization needs and may be addressed in future versions if required.

### Future Enhancements

Potential improvements:

1. **Multiple profiles**: Show profiles at different X positions
2. **Horizontal orientation**: Support horizontal potential plots
3. **Axis ticks and labels**: Show numerical scale
4. **Interactive profile selection**: Click to change profile position
5. **Multi-dimensional slicing**: Show 2D potential as contour plot
6. **Export data**: Save profile data to CSV
7. **Color-coded regions**: Highlight wells vs. barriers

### Dependencies

Required imports:
```javascript
import { Panel } from '../core/Panel.js';
import { TooltipInfo } from '../core/TooltipInfo.js';
```

Required simulation interface:
```javascript
simulation.gridSize         // number (power of 2)
simulation.potentialType    // string ('none', 'single', 'double', 'sinusoid')
simulation.getPotential()   // Float64Array (gridSize × gridSize)
```

### Compatibility

The PotentialPlotPanel rendering is **pixel-perfect identical** to the original `Visualizer.drawPotentialProfile()` method (lines 330-426 in `visualization.js`).

**Verified equivalences:**
- ✓ Centerline extraction algorithm
- ✓ Min/max normalization with zero-range handling
- ✓ Coordinate flipping (`1 - normalized`)
- ✓ Padding calculation
- ✓ Line color and thickness
- ✓ Zero reference line rendering
- ✓ Label positioning and formatting
- ✓ Transparent background

### Related Files

- **Base class**: `js/visualization/core/Panel.js`
- **Tests**: `tests/test-potential-panel.js`
- **Visual test**: `tests/test-potential-visual.html`
- **Documentation**: `tests/PHASE4_IMPLEMENTATION_SUMMARY.md`

---

## GridOverlayPanel

**Status:** ✅ Complete and tested (Phase 5)
**File:** `GridOverlayPanel.js`
**Lines:** 153

A decorative overlay panel that draws grid lines over the wavefunction visualization to help users identify positions and understand the discrete simulation grid.

### Features

- **Configurable appearance**: Adjustable line color and width
- **Grid-aligned**: Lines align perfectly with simulation grid cells
- **Semi-transparent**: Does not obscure underlying wavefunction
- **Independent rendering**: Can be shown/hidden without affecting other panels

### Usage Example

```javascript
import { GridOverlayPanel } from './js/visualization/panels/GridOverlayPanel.js';

const panel = new GridOverlayPanel(
    { x: 0, y: 0, width: 512, height: 512 },
    128,  // gridSize
    { lineColor: 'rgba(255, 255, 255, 0.2)', lineWidth: 1 }
);

// Render
panel.render(ctx, simulation, time);

// Update configuration
panel.setLineColor('rgba(0, 255, 0, 0.3)');
panel.setLineWidth(2);
panel.setGridSize(256);
```

### API Reference

- `constructor(bounds, gridSize, config)`: Create grid overlay
- `render(ctx, simulation, time)`: Draw grid lines
- `setGridSize(newGridSize)`: Update grid size
- `setLineColor(color)`: Update line color
- `setLineWidth(width)`: Update line width

---

## MeasurementFeedbackPanel

**Status:** ✅ Complete and tested (Phase 5)
**File:** `MeasurementFeedbackPanel.js`
**Lines:** 238

An animated overlay panel that provides visual feedback after quantum measurements. Shows fading colored highlights and expanding circles to indicate measurement outcomes.

### Features

- **Two feedback types**:
  - Positive (particle found): Green highlight with expanding circle
  - Negative (not found): Red flash
- **Smooth animations**: Time-based fading using performance.now()
- **Configurable duration**: Adjustable animation length (default 500ms)
- **Automatic cleanup**: Animation deactivates when complete

### Usage Example

```javascript
import { MeasurementFeedbackPanel } from './js/visualization/panels/MeasurementFeedbackPanel.js';

const panel = new MeasurementFeedbackPanel(
    { x: 0, y: 0, width: 512, height: 512 },
    128  // gridSize
);

// Trigger positive feedback
panel.showFeedback(64, 64, 'positive', 500);

// Trigger negative feedback
panel.showFeedback(32, 96, 'negative', 500);

// Check if active
if (panel.isActive()) {
    // Animation still running
}

// Render (typically in animation loop)
function animate() {
    panel.render(ctx, simulation, performance.now());
    requestAnimationFrame(animate);
}
```

### API Reference

- `constructor(bounds, gridSize)`: Create feedback panel
- `showFeedback(gridX, gridY, type, duration)`: Start animation
- `clearFeedback()`: Stop animation immediately
- `isActive()`: Check if animation is running
- `render(ctx, simulation, time)`: Render feedback
- `setGridSize(newGridSize)`: Update grid size

---

## MeasurementCirclePanel

**Status:** ✅ Complete and tested (Phase 5)
**File:** `MeasurementCirclePanel.js`
**Lines:** 185

An overlay panel that shows a red circle indicating the measurement radius when hovering over the wavefunction. Provides visual feedback about spatial extent before measurement.

### Features

- **Mouse-following indicator**: Circle follows grid position
- **Radius visualization**: Shows measurement area extent
- **Auto-hide**: Disappears when mouse leaves canvas
- **Configurable radius**: Adjusts based on simulation settings

### Usage Example

```javascript
import { MeasurementCirclePanel } from './js/visualization/panels/MeasurementCirclePanel.js';

const panel = new MeasurementCirclePanel(
    { x: 0, y: 0, width: 512, height: 512 },
    128  // gridSize
);

// Update on mouse move
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cellSize = 512 / 128;
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    panel.setHoverState(true, gridX, gridY);
});

// Hide on mouse leave
canvas.addEventListener('mouseleave', () => {
    panel.setHoverState(false);
});

// Render (typically in animation loop)
function animate() {
    panel.render(ctx, simulation, performance.now());
    requestAnimationFrame(animate);
}
```

### API Reference

- `constructor(bounds, gridSize)`: Create circle panel
- `setHoverState(active, gridX, gridY)`: Update hover position
- `getHoverState()`: Get current state
- `isActive()`: Check if hovering
- `render(ctx, simulation, time)`: Render circle
- `setGridSize(newGridSize)`: Update grid size

---

## PhaseWheelPanel

**Status:** ✅ Complete and tested (Phase 5)
**File:** `PhaseWheelPanel.js`
**Lines:** 192

A reference panel displaying a color wheel legend that shows how complex phase values map to colors in the wavefunction visualization.

### Features

- **Full HSL color wheel**: 360° of hues displayed
- **Labeled key angles**: Re+, Im+, Re-, Im- markers
- **White border**: Clear visual separation
- **Smooth gradients**: Each degree rendered separately

### Usage Example

```javascript
import { PhaseWheelPanel } from './js/visualization/panels/PhaseWheelPanel.js';

const panel = new PhaseWheelPanel({
    x: 700,    // Typically positioned in corner
    y: 20,
    width: 80,
    height: 80
});

// Render
panel.render(ctx, simulation, time);
```

### Color Mapping

| Phase | Angle | Color | Label |
|-------|-------|-------|-------|
| 0° | 0 | Red | Re+ |
| 90° | π/2 | Yellow | Im+ |
| 180° | π | Cyan | Re- |
| 270° | 3π/2 | Blue | Im- |

### API Reference

- `constructor(bounds)`: Create phase wheel
- `render(ctx, simulation, time)`: Draw wheel and labels
- `hslToRgb(h, s, l)`: Convert HSL to RGB (utility)

---

## Testing

All overlay panels have comprehensive test coverage:

### Unit Tests

**File:** `tests/test-overlay-panels.js`

- GridOverlayPanel: 6 test cases
- MeasurementFeedbackPanel: 7 test cases
- MeasurementCirclePanel: 6 test cases
- PhaseWheelPanel: 4 test cases
- Integration tests: 3 test cases

**Total:** 26 automated test cases

**Run tests:**
```bash
open tests/test-overlay-panels-visual.html
# Click "Run Unit Tests" button
```

### Visual Tests

**File:** `tests/test-overlay-panels-visual.html`

Interactive visual test tool featuring:
- Individual panel demonstrations
- Interactive controls for each panel
- All panels combined view
- Real-time animations
- Hover interactions
- Unit test runner integration

**Run visual tests:**
```bash
open tests/test-overlay-panels-visual.html
```

### Test Coverage

Each panel includes tests for:
- ✓ Constructor initialization
- ✓ Configuration options
- ✓ Rendering behavior
- ✓ State management
- ✓ Bounds updates
- ✓ Grid size changes
- ✓ Edge cases
- ✓ Integration with other panels

---

## Contributing

When adding a new panel:

1. **Extend Panel base class**
2. **Implement render() method**
3. **Add coordinate conversion if needed**
4. **Implement mouse handlers if interactive**
5. **Write comprehensive tests**
6. **Create visual verification tool**
7. **Document API and usage**
8. **Update this README**

### Panel Template

```javascript
import { Panel } from '../core/Panel.js';
import { TooltipInfo } from '../core/TooltipInfo.js';

export class MyPanel extends Panel {
    constructor(bounds, config = {}) {
        super('myPanel', bounds);
        this.config = { ...config };
    }

    render(ctx, simulation, time) {
        // Implement rendering logic
    }

    handleMouseMove(canvasX, canvasY, simulation) {
        // Implement mouse interaction
        return null;
    }
}
```

---

## License

Part of the Quantum Playground project.
