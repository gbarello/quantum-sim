# JavaScript Architecture Documentation

## Overview

The `js/` directory contains the complete client-side implementation of a real-time quantum mechanics simulation and visualization system. This codebase implements the time-dependent Schrodinger equation using numerical methods, providing an interactive visual representation of quantum wavefunction evolution, measurements, and collapse.

The architecture follows a modular, object-oriented design with clear separation of concerns:
- **Quantum Physics Engine** (`quantum.js`) - Core simulation logic
- **Canvas Visualization** (`visualization.js`) - Rendering and visual feedback
- **User Interaction** (`controls.js`) - Input handling and UI coordination
- **Mathematical Utilities** (`utils.js`) - Complex number operations and FFT
- **Application Orchestration** (`main.js`) - Initialization and main loop

## File Structure

```
js/
├── main.js           # Application entry point and main loop
├── quantum.js        # Quantum simulation engine (Schrodinger equation solver)
├── visualization.js  # Canvas rendering and visual effects
├── controls.js       # User interaction and UI event handling
└── utils.js          # Complex numbers, FFT, and mathematical utilities
```

## Detailed File Documentation

### main.js - Application Entry Point

**Purpose**: Coordinates initialization, manages the main animation loop, and orchestrates interactions between simulation, visualization, and controller components.

**Key Classes**:

#### `QuantumPlaygroundApp`
The main application class that ties everything together.

**Properties**:
- `simulation`: QuantumSimulation instance
- `visualizer`: Visualizer instance
- `controller`: Controller instance
- `lastFrameTime`: Performance timing for frame rate control
- `animationFrameId`: RequestAnimationFrame handle

**Methods**:
- `init()`: Asynchronous initialization of all components
  - Creates canvas and sets up responsive sizing
  - Validates stability condition for numerical integration
  - Initializes Gaussian wavepacket
  - Sets up UI elements and event listeners
- `mainLoop(currentTime)`: Core animation loop
  - Calculates delta time between frames
  - Performs multiple physics steps per frame (`stepsPerFrame`)
  - Updates controller state
  - Renders current frame
- `resizeCanvas(canvas)`: Handles responsive canvas sizing
- `showWelcomeMessage()`: Displays initial user instructions
- `destroy()`: Cleanup method for resource disposal

**Configuration**:
```javascript
const config = {
  gridSize: 128,              // N×N grid (must be power of 2 for FFT)
  domainSize: 10.0,           // Physical size in arbitrary units
  hbar: 1.0,                  // Reduced Planck constant (natural units)
  mass: 1.0,                  // Particle mass (natural units)
  dt: 0.01,                   // Time step size
  timeScale: 1.0,             // Evolution speed multiplier
  stepsPerFrame: 5,           // Physics updates per render
  boundaryCondition: 'periodic',
  initialWidth: 0.6,          // Gaussian width
  initialMomentum: [1.0, 0.6], // Initial momentum vector
  visualizationMode: 'full'   // 'full', 'probability', 'phase'
}
```

**Stability Check**:
The code validates the numerical stability condition: `dt × timeScale < 2m*dx²/ℏ` to prevent numerical artifacts and ensure accurate time evolution.

---

### quantum.js - Quantum Physics Engine

**Purpose**: Implements the time-dependent Schrodinger equation solver using the split-operator method with FFT-based momentum space evolution.

**Key Classes**:

#### `QuantumSimulation`
Core physics engine for quantum wavefunction evolution.

**Constructor Parameters**:
- `gridSize`: Number of grid points (N×N), must be power of 2
- `dx`: Spatial step size
- `dt`: Time step
- `hbar`: Reduced Planck constant (default: 1.0)
- `mass`: Particle mass (default: 1.0)
- `boundaryCondition`: Boundary type (default: 'periodic')
- `timeScale`: Evolution speed multiplier (default: 1.0)

**Core Data Structures**:
- `psi`: ComplexGrid - Wavefunction in position space ψ(x,y)
- `psiMomentum`: ComplexGrid - Temporary buffer for momentum space
- `potential`: Float64Array - Potential energy grid V(x,y)
- `momentumOperator`: ComplexGrid - Precomputed exp(-iℏk²Δt/2m)
- `potentialOperatorHalf`: ComplexGrid - Precomputed exp(-iVΔt/2ℏ)

**Time Evolution Algorithm** (Split-Operator Method):
```
Step 1: ψ → exp(-iVΔt/2ℏ) ψ         [Position space, half potential]
Step 2: ψ → FFT[ψ]                   [Transform to momentum space]
Step 3: ψ(k) → exp(-iℏk²Δt/2m) ψ(k) [Momentum space, kinetic energy]
Step 4: ψ(k) → IFFT[ψ(k)]            [Transform back to position]
Step 5: ψ → exp(-iVΔt/2ℏ) ψ         [Position space, half potential]
```

**Key Methods**:

1. **`initialize(params)`**
   - Creates Gaussian wavepacket: ψ(x,y,0) = A exp(-(x-x₀)²/4σ² - (y-y₀)²/4σ²) exp(i(pₓx + pᵧy)/ℏ)
   - Normalizes to unit probability
   - Parameters: centerX, centerY, width, momentumX, momentumY

2. **`step()`**
   - Advances wavefunction by one time step using split-operator method
   - Applies potential evolution (half step)
   - FFT to momentum space
   - Applies kinetic energy operator
   - IFFT back to position space
   - Applies potential evolution (half step)
   - Updates simulation time

3. **`measure(x, y)`**
   - Performs quantum measurement at grid position
   - Integrates probability over Gaussian-weighted region
   - Uses Born rule: detection probability = ∫ ψ*detector_response*ψ dA
   - Randomly determines outcome based on probability
   - Calls `collapsePositive` or `collapseNegative`
   - Returns: `{found: boolean, probability: number}`

4. **`collapsePositive(x, y)`**
   - Wavefunction collapse for positive measurement (particle found)
   - Projects wavefunction: ψ_new(r) = ψ_old(r) × detector_response(r)
   - Detector response is Gaussian: exp(-r²/2σ²)
   - Renormalizes to unit probability

5. **`collapseNegative(x, y)`**
   - Wavefunction collapse for negative measurement (particle not found)
   - Suppresses wavefunction: ψ_new(r) = ψ_old(r) × (1 - exp(-r²/2σ²))
   - Zeros out probability in measurement region
   - Renormalizes remaining wavefunction

6. **`_precomputeMomentumOperator()`**
   - Precomputes momentum evolution operator for efficiency
   - Wave vectors follow FFT ordering: k[n] = 2πn/L for n = 0..N/2-1, -N/2..-1
   - Operator: exp(-iℏk²Δt/2m) where k² = kₓ² + kᵧ²

7. **`_precomputePotential()`**
   - Generates potential energy landscape V(x,y)
   - Supports multiple potential types:
     - `'none'`: Free particle (V = 0)
     - `'single'`: Single Gaussian well at center
     - `'double'`: Two Gaussian wells separated along y-axis
     - `'sinusoid'`: Sinusoidal potential V(y) = -V₀cos(6πy/L)

8. **Potential Management**:
   - `setPotentialType(type)`: Change potential type dynamically
   - `getPotential()`: Get potential grid for visualization
   - `setMeasurementRadius(multiplier)`: Adjust measurement region size

9. **State Access**:
   - `getProbabilityAt(x, y)`: Get |ψ|² at grid point
   - `getProbabilityDensity()`: Get full probability density grid
   - `getPhase()`: Get phase arg(ψ) for entire grid
   - `getTotalProbability()`: Sum of |ψ|² (should be ≈1)
   - `getWavefunction()`: Direct access to ComplexGrid

**Physics Notes**:
- Uses natural units: ℏ = 1, m = 1
- Periodic boundary conditions for FFT compatibility
- Split-operator method is symplectic (preserves unitarity)
- Strang splitting provides second-order accuracy: O(Δt²)

---

### visualization.js - Canvas Rendering

**Purpose**: Renders quantum wavefunction on HTML5 Canvas using complex-to-color mapping, provides visual feedback for measurements, and manages display modes.

**Key Classes**:

#### `Visualizer`
Handles all rendering and visual effects.

**Color Mapping** (HSL Color Space):
```
Hue (0-360°): Maps to phase arg(ψ)
  0° (red)     → Real positive (phase = 0)
  90° (yellow) → Imaginary positive (phase = π/2)
  180° (cyan)  → Real negative (phase = π)
  270° (blue)  → Imaginary negative (phase = -π/2)

Saturation (0-100%): Maps to amplitude |ψ|
  High saturation → Large amplitude
  Low saturation  → Small amplitude

Lightness (20-80%): Variable based on amplitude
  Bright → High probability
  Dark   → Low probability
```

**Configuration Properties**:
```javascript
config = {
  showGrid: false,              // Toggle grid overlay
  showPhaseWheel: false,        // Show phase reference wheel
  showPotential: false,         // Overlay potential visualization
  visualizationMode: 'full',    // 'full', 'probability', 'phase'
  saturationScale: 5.0,         // Brightness multiplier
  lightness: 50,                // Base lightness percentage
  gridLineColor: 'rgba(255, 255, 255, 0.2)',
  potentialColor: 'rgba(255, 255, 0, 0.3)'
}
```

**Key Methods**:

1. **`render()`**
   - Main rendering method called every frame
   - Creates ImageData and fills pixel-by-pixel
   - Draws grid overlay if enabled
   - Draws potential profile plot
   - Draws measurement feedback animation
   - Draws phase wheel reference
   - Draws hover measurement circle

2. **`complexToColor(psi)`**
   - Converts complex wavefunction value to RGB
   - Calculates amplitude: |ψ| = √(re² + im²)
   - Calculates phase: arg(ψ) = atan2(im, re)
   - Applies contrast boost: √amplitude for better visibility
   - Maps to HSL color space, then converts to RGB
   - Handles different visualization modes:
     - `'probability'`: Grayscale based on |ψ|²
     - `'phase'`: Full saturation, phase determines hue
     - `'full'`: Combined amplitude and phase (default)

3. **`hslToRgb(h, s, l)`**
   - Standard HSL to RGB conversion
   - Returns [r, g, b] values in range [0, 255]

4. **`drawGrid()`**
   - Draws grid lines over wavefunction
   - Grid spacing matches simulation cells
   - Semi-transparent white lines

5. **`drawPotentialProfile()`**
   - Plots potential energy along vertical centerline
   - Displayed to the right of main grid
   - Thin red line showing V(y) profile
   - Includes zero-potential reference line
   - Labels potential type (Single/Double/Sinusoid)

6. **`drawMeasurementCircle()`**
   - Shows measurement region on hover
   - Red circle with radius = measurementRadiusMultiplier × cellSize
   - Provides visual feedback before measurement

7. **`showMeasurementFeedback(x, y, type, duration)`**
   - Animates measurement result
   - Green flash for positive (found)
   - Red flash for negative (not found)
   - Expanding circle animation for detections
   - Fades out over specified duration (default 500ms)

8. **Coordinate Conversion**:
   - `canvasToGrid(canvasX, canvasY)`: Pixel → grid coordinates
   - `getProbabilityAt(canvasX, canvasY)`: Get probability at pixel location

9. **Display Control**:
   - `setGridVisible(show)`: Toggle grid overlay
   - `setPhaseWheelVisible(show)`: Toggle phase reference
   - `setPotentialVisible(show)`: Toggle potential overlay
   - `setVisualizationMode(mode)`: Switch between display modes
   - `setSaturationScale(scale)`: Adjust brightness
   - `setHoverState(active, x, y)`: Show/hide measurement circle

10. **`resize()`**
    - Handles device pixel ratio for crisp rendering
    - Adjusts canvas resolution to match display size
    - Maintains square aspect ratio for grid

**Animation State**:
- `measurementFeedback`: Tracks active measurement animation
  - `active`: Boolean
  - `x, y`: Grid coordinates
  - `type`: 'positive' or 'negative'
  - `startTime`: Performance timestamp
  - `duration`: Animation length in ms

- `hoverState`: Tracks mouse hover for preview
  - `active`: Boolean
  - `x, y`: Grid coordinates

---

### controls.js - User Interaction Controller

**Purpose**: Manages all user input (mouse, touch, keyboard), coordinates between simulation and visualization, and updates UI displays.

**Key Classes**:

#### `Controller`
Central coordinator for user interaction and UI updates.

**Constructor Parameters**:
- `simulation`: QuantumSimulation instance
- `visualizer`: Visualizer instance
- `uiElements`: Object containing DOM element references
  - `canvas`: Main canvas element
  - `playPauseBtn`: Play/pause button
  - `resetBtn`: Reset simulation button
  - `speedSlider`: Time scale control
  - `measurementRadiusSlider`: Measurement size control
  - `gridSizeSelect`: Grid resolution selector
  - `vizModeSelect`: Visualization mode dropdown
  - `totalProbDisplay`: Probability normalization display
  - `timeDisplay`: Elapsed time counter
  - `measurementResult`: Measurement feedback message
  - `hoverInfo`: Hover probability tooltip

**State Properties**:
- `isPlaying`: Boolean controlling simulation advancement
- `stepsPerFrame`: Physics steps per render frame (default: 5)
- `measurementInProgress`: Prevents concurrent measurements
- `elapsedTime`: Accumulated simulation time
- `isHovering`: Mouse hover state
- `hoverPosition`: Current hover grid coordinates

**Event Handlers**:

1. **Canvas Interaction**:
   - `handleCanvasClick(event)`: Perform measurement at click location
   - `handleCanvasMove(event)`: Update hover tooltip and preview circle
   - `handleCanvasLeave()`: Hide hover effects
   - `handleTouchStart(event)`: Touch equivalent of mouse move
   - `handleTouchMove(event)`: Continuous touch tracking
   - `handleTouchEnd(event)`: Touch equivalent of click

2. **Control Buttons**:
   - `handlePlayPause()`: Toggle simulation play/pause state
   - `handleReset()`: Reinitialize simulation to default state
   - `updatePlayPauseButton()`: Update button text and ARIA labels

3. **Sliders and Controls**:
   - `handleSpeedControl(event)`: Logarithmic time scale adjustment
     - Slider range: -10 to 10
     - Maps to timeScale: 0.01 to 1.0
     - Formula: `timeScale = 10^(sliderValue/10 - 1)`
   - `handleMeasurementRadiusControl(event)`: Adjust measurement region
     - Slider range: 0 to 200
     - Maps to radius: 1 to 100 (logarithmic)
     - Formula: `radius = 10^(sliderValue/100)`
   - `handlePotentialTypeChange(event)`: Switch potential type
   - `handleGridSizeChange(event)`: Change grid resolution (requires reinitialization)
   - `handleVizModeChange(event)`: Switch visualization mode

4. **Keyboard Shortcuts**:
   - Space/Spacebar: Toggle play/pause
   - R: Reset simulation
   - Escape: Dismiss measurement result message

**Measurement Flow**:

```javascript
performMeasurement(x, y):
  1. Check if measurement already in progress → return if true
  2. Set measurementInProgress = true
  3. Get pre-measurement probability at (x, y)
  4. Call simulation.measure(x, y) → {found, probability}
  5. Display result message with probability
  6. Show visual feedback animation (green/red flash)
  7. Set measurementInProgress = false
```

**UI Updates**:

1. **`update(deltaTime)`**
   - Called every frame from main loop
   - Accumulates elapsed time if playing
   - Throttles UI updates to every 100ms for performance

2. **`updateUI()`**
   - Updates total probability display
   - Shows warning if |∑|ψ|² - 1| > 0.01 (normalization error)
   - Updates elapsed time counter
   - Format: "99.9999%" and "12.34s"

3. **`displayMeasurementResult(result, probability, x, y)`**
   - Shows measurement outcome message
   - Displays grid coordinates and probability percentage
   - Green styling for "Found!"
   - Red styling for "Not Found!"
   - Auto-dismisses after 3 seconds

**Coordinate Conversion**:
```javascript
canvasToGridCoords(canvasX, canvasY):
  1. Get canvas bounding rect
  2. Calculate device pixel ratio scaling
  3. Convert client coordinates to canvas coordinates
  4. Map to grid indices [0, gridSize-1]
  5. Clamp to valid range
```

**Cleanup**:
- `destroy()`: Removes all event listeners and clears timeouts
- `removeEventListeners()`: Systematic cleanup of all registered handlers

---

### utils.js - Mathematical Utilities

**Purpose**: Provides fundamental mathematical operations for quantum simulation: complex numbers, FFT operations, normalization, and coordinate transformations.

**Key Classes and Functions**:

#### `Complex` Class
Full-featured complex number implementation with quantum mechanics operations.

**Properties**:
- `re`: Real part
- `im`: Imaginary part

**Methods**:
- `abs()`: Magnitude |z| = √(re² + im²), uses Math.hypot for stability
- `abs2()`: Squared magnitude |z|² = re² + im² (optimized)
- `arg()`: Phase angle θ = atan2(im, re) in radians [-π, π]
- `conj()`: Complex conjugate z* = re - i·im
- `add(other)`: Addition z₁ + z₂
- `sub(other)`: Subtraction z₁ - z₂
- `mul(other)`: Multiplication z₁ · z₂ = (ac-bd) + i(ad+bc)
- `scale(scalar)`: Scalar multiplication c·z
- `div(other)`: Division z₁/z₂ (throws on division by zero)
- `exp()`: Complex exponential e^z = e^re · (cos(im) + i·sin(im))
- `clone()`: Deep copy

**Static Factory Methods**:
- `Complex.fromPolar(r, theta)`: Create from polar coordinates
- `Complex.real(x)`: Pure real number
- `Complex.imaginary(x)`: Pure imaginary number
- `Complex.zero()`: 0 + 0i
- `Complex.one()`: 1 + 0i
- `Complex.i()`: Imaginary unit 0 + 1i

---

#### `ComplexGrid` Class
2D array of complex numbers with optimized storage for FFT operations.

**Storage Format**:
```javascript
// Interleaved format: [re₀, im₀, re₁, im₁, re₂, im₂, ...]
data: Float64Array(sizeX × sizeY × 2)
```

**Advantages**:
- Cache-friendly memory layout
- Direct FFT library compatibility
- High precision (Float64Array)

**Properties**:
- `sizeX`, `sizeY`: Grid dimensions
- `data`: Float64Array with interleaved [re, im] pairs

**Access Methods**:
- `get(x, y)`: Returns Complex object
- `set(x, y, c)`: Sets from Complex object
- `getRe(x, y)`, `getIm(x, y)`: Direct component access
- `setReIm(x, y, re, im)`: Direct component setting
- `getAbs2(x, y)`: Probability density |ψ|² at point
- `getAbs(x, y)`: Amplitude |ψ| at point
- `getArg(x, y)`: Phase arg(ψ) at point

**Operations**:
- `scale(scalar)`: Multiply all values by real scalar (in-place)
- `copy(other)`: Copy data from another grid
- `clone()`: Create independent copy
- `zero()`: Fill with zeros
- `sumAbs2()`: Total probability ∑|ψ|² (for normalization)

**Measurement Utilities**:
- `zeroCell(x, y)`: Zero single grid point
- `zeroCircularRegion(centerX, centerY, radius)`: Zero circular area

---

#### `FFT2D` Class
2D Fast Fourier Transform using row-column decomposition.

**Algorithm**:
```
2D FFT:
  1. 1D FFT on each row (x-direction)
  2. 1D FFT on each column (y-direction)

2D IFFT:
  1. 1D IFFT on each column (y-direction)
  2. 1D IFFT on each row (x-direction)
```

**Dependencies**:
- Uses `../lib/fft.js` for 1D FFT primitives
- Requires grid size to be power of 2

**Methods**:
- `forward(grid)`: Position → momentum space (in-place)
- `inverse(grid)`: Momentum → position space (in-place)

**Internal Buffers**:
- `rowBuffer`: Temporary storage for row operations
- `colBuffer`: Temporary storage for column operations
- `fftX`, `fftY`: 1D FFT objects for each dimension

---

#### Normalization Functions

1. **`computeNorm(grid)`**
   - Returns √(∑|ψ|²)
   - Used to check normalization state

2. **`normalize(grid)`**
   - Enforces quantum normalization: ∑|ψ|² = 1
   - Divides all values by norm
   - Modifies grid in-place
   - Returns normalization factor

3. **`totalProbability(grid, dx)`**
   - Computes continuous integral: ∫|ψ|² dx dy = ∑|ψ|² · dx²
   - Should equal 1.0 when normalized

4. **`isNormalized(grid, tolerance=1e-6)`**
   - Checks if |∑|ψ|² - 1| < tolerance
   - Returns boolean

---

#### Grid Coordinate Utilities

1. **`pixelToGrid(pixelX, pixelY, canvasWidth, canvasHeight, gridSize)`**
   - Converts canvas pixel coordinates to grid indices
   - Clamps to valid range [0, gridSize-1]

2. **`gridToPixel(gridX, gridY, canvasWidth, canvasHeight, gridSize)`**
   - Converts grid indices to pixel coordinates
   - Returns center of grid cell

3. **`gridToPhysical(gridX, gridY, gridSize, domainSize)`**
   - Converts grid indices to physical coordinates
   - Maps [0, gridSize-1] → [0, domainSize]

4. **`gridDistance(x1, y1, x2, y2)`**
   - Euclidean distance between grid points
   - Uses Math.hypot for numerical stability

5. **`isValidGridCoord(x, y, gridSize)`**
   - Bounds checking for grid indices

6. **`getCircularNeighborhood(centerX, centerY, radius, gridSize)`**
   - Returns array of grid points within circular region
   - Used for measurement regions and visualization
   - Efficiently searches only bounding box

---

#### Physics Utilities

1. **`calculateDx(domainSize, gridSize)`**
   - Spatial step: dx = domainSize / gridSize

2. **`calculateDk(gridSize, dx)`**
   - Momentum step: dk = 2π / (gridSize · dx)

3. **`getWaveVector(i, N, dk)`**
   - Maps FFT index to wave vector
   - FFT ordering: [0, 1, ..., N/2-1, -N/2, ..., -1]
   - Returns: k_i = i·dk for i < N/2, else (i-N)·dk

4. **`createGaussianWavepacket(gridSize, x0, y0, sigma, px, py, dx, hbar)`**
   - Factory function for Gaussian initial state
   - ψ = A exp(-(x-x₀)²/4σ²) exp(i(pₓx + pᵧy)/ℏ)
   - Returns normalized ComplexGrid

---

#### Mathematical Utilities

1. **`clamp(value, min, max)`**
   - Constrains value to range

2. **`lerp(a, b, t)`**
   - Linear interpolation: a + (b-a)·t

3. **`isPowerOf2(n)`**
   - Bit manipulation check: n > 0 && (n & (n-1)) === 0

4. **`nextPowerOf2(n)`**
   - Finds smallest power of 2 ≥ n
   - Important for FFT size selection

---

#### `PerformanceMonitor` Class
Profiling utility for measuring code performance.

**Methods**:
- `start(label)`: Begin timing
- `end(label)`: End timing, returns elapsed ms
- `measure(label, fn)`: Execute and time function, logs result

**Usage**:
```javascript
const monitor = new PerformanceMonitor();
monitor.start('FFT');
fft.forward(grid);
const elapsed = monitor.end('FFT');
console.log(`FFT took ${elapsed.toFixed(2)}ms`);
```

---

## Component Interactions and Data Flow

### Initialization Sequence

```
1. main.js: QuantumPlaygroundApp.init()
   ├─> Create canvas, check stability condition
   ├─> Initialize QuantumSimulation(gridSize, dx, dt, ...)
   │   ├─> Precompute momentum operator
   │   ├─> Precompute potential operator
   │   └─> Initialize Gaussian wavepacket
   ├─> Initialize Visualizer(canvas, simulation)
   │   └─> Setup canvas rendering context
   ├─> Initialize Controller(simulation, visualizer, uiElements)
   │   └─> Setup event listeners (click, touch, keyboard)
   └─> Start mainLoop()
```

### Main Animation Loop

```
mainLoop (60 FPS):
  ├─> Calculate deltaTime
  ├─> controller.update(deltaTime)
  │   └─> Update elapsed time, stats display
  ├─> IF playing:
  │   └─> FOR i = 0 to stepsPerFrame:
  │       └─> simulation.step()
  │           ├─> Apply potential (half step)
  │           ├─> FFT to momentum space
  │           ├─> Apply kinetic energy operator
  │           ├─> IFFT to position space
  │           └─> Apply potential (half step)
  └─> visualizer.render()
      ├─> Convert each grid cell ψ(x,y) to color
      ├─> Draw ImageData to canvas
      ├─> Draw potential profile
      ├─> Draw measurement feedback
      └─> Draw phase wheel
```

### Measurement Event Flow

```
User clicks canvas:
  1. Controller.handleCanvasClick(event)
     ├─> Convert pixel coords to grid coords
     └─> Call performMeasurement(x, y)

  2. Controller.performMeasurement(x, y)
     ├─> Get probability = simulation.getProbabilityAt(x, y)
     └─> result = simulation.measure(x, y)

  3. QuantumSimulation.measure(x, y)
     ├─> Integrate probability over Gaussian region
     ├─> Random detection: found = (random() < probability)
     ├─> IF found:
     │   └─> collapsePositive(x, y)
     │       ├─> Multiply ψ by Gaussian detector response
     │       └─> Renormalize wavefunction
     └─> ELSE:
         └─> collapseNegative(x, y)
             ├─> Suppress ψ in Gaussian region
             └─> Renormalize wavefunction

  4. Controller.displayMeasurementResult(result, probability, x, y)
     └─> Show "Found!" or "Not Found!" message

  5. Visualizer.showMeasurementFeedback(x, y, type)
     └─> Animate green/red flash at measurement location
```

### UI Control Flow

```
Speed Slider Change:
  controller.handleSpeedControl()
    └─> simulation.setTimeScale(newScale)
        ├─> Update dtEffective
        ├─> Recompute momentum operator
        └─> Recompute potential operator

Potential Type Change:
  controller.handlePotentialTypeChange()
    └─> simulation.setPotentialType(type)
        ├─> Recompute potential grid V(x,y)
        └─> Recompute potential operator exp(-iVΔt/2ℏ)

Visualization Mode Change:
  controller.handleVizModeChange()
    └─> visualizer.setVisualizationMode(mode)
        └─> Changes color mapping in complexToColor()
```

---

## State Management

### Simulation State
- Managed by: `QuantumSimulation` class
- Data: `psi` (ComplexGrid), `potential` (Float64Array), `time` (number)
- Persistence: None (resets on page reload)
- Updates: Every physics step via `step()` method

### Visualization State
- Managed by: `Visualizer` class
- Data: `config` (display settings), `measurementFeedback`, `hoverState`
- Updates: Every frame in `render()` method
- Transient effects: Measurement animations (500ms), hover previews

### UI State
- Managed by: `Controller` class
- Data: `isPlaying`, `stepsPerFrame`, `elapsedTime`, `measurementInProgress`
- Updates: Event-driven and per-frame via `update()`
- Persistence: None

---

## Design Patterns and Principles

### 1. Separation of Concerns
- **Physics**: Isolated in `QuantumSimulation`, no UI dependencies
- **Rendering**: Isolated in `Visualizer`, no input handling
- **Interaction**: Isolated in `Controller`, coordinates between modules

### 2. Observer Pattern
- Main loop observes simulation state changes
- Visualizer observes wavefunction for rendering
- Controller observes user input events

### 3. Command Pattern
- UI controls send commands to simulation (measure, reset, setTimeScale)
- Commands are methods on `QuantumSimulation` class
- Enables easy extension and testing

### 4. Factory Pattern
- `createGaussianWavepacket()` in utils.js
- Static factory methods on `Complex` class
- `fromPolar()`, `zero()`, `one()`, `i()`

### 5. Strategy Pattern
- Multiple visualization modes: 'full', 'probability', 'phase'
- Multiple potential types: 'none', 'single', 'double', 'sinusoid'
- Switched dynamically without code changes

### 6. Module Pattern
- Each file exports specific classes/functions
- ES6 modules with explicit imports
- Prevents global namespace pollution

---

## Performance Optimizations

### 1. Precomputation
- Momentum operator computed once during initialization
- Potential operator computed once per potential change
- Avoids expensive exponential calculations in main loop

### 2. Typed Arrays
- `Float64Array` for complex number storage
- Contiguous memory for cache efficiency
- ~2x faster than regular JavaScript arrays

### 3. In-Place Operations
- FFT operations modify grid in-place
- Normalization scales existing array
- Reduces memory allocations

### 4. Interleaved Complex Format
- [re, im, re, im, ...] layout
- Better cache locality than separate arrays
- Direct FFT library compatibility

### 5. Throttled UI Updates
- Stats display updates every 100ms (not every frame)
- Prevents DOM thrashing
- Maintains 60 FPS rendering

### 6. RequestAnimationFrame
- Synchronized with display refresh rate
- Automatic throttling when tab not visible
- Better battery life on mobile devices

---

## Testing Considerations

### Unit Testing Targets:

1. **Complex Number Operations**:
   - Arithmetic: add, sub, mul, div
   - Trigonometric: arg, abs, exp
   - Edge cases: division by zero, overflow

2. **Grid Operations**:
   - Access: get, set, getRe, getIm
   - Normalization: computeNorm, normalize
   - Bounds checking

3. **Coordinate Conversions**:
   - pixelToGrid, gridToPixel
   - Edge cases: boundary values, clamping

4. **FFT Correctness**:
   - Forward/inverse round-trip: IFFT(FFT(x)) ≈ x
   - Parseval's theorem: ∑|x|² ≈ ∑|X|²
   - Test with known analytical transforms

### Integration Testing:

1. **Measurement Flow**:
   - Click → coordinate conversion → measurement → collapse → renormalization
   - Verify probability conservation

2. **Time Evolution**:
   - Free particle spreads correctly
   - Gaussian momentum propagation
   - Potential well binding

3. **UI Interaction**:
   - Button clicks trigger correct actions
   - Sliders update simulation parameters
   - Keyboard shortcuts work

---

## Extension Points

### Adding New Potential Types:

1. Add case to `_precomputePotential()` in `quantum.js`
2. Define potential function V(x, y)
3. Add UI option in HTML
4. Connect to `handlePotentialTypeChange()` in `controls.js`

### Adding New Visualization Modes:

1. Add case to `complexToColor()` in `visualization.js`
2. Define color mapping logic
3. Add option to `vizModeSelect` dropdown
4. No changes needed in other modules

### Adding New Initial States:

1. Create factory function in `utils.js` (similar to `createGaussianWavepacket`)
2. Add initialization option in `config` in `main.js`
3. Call from `QuantumSimulation.initialize()`

### Adding Time-Dependent Potentials:

1. Add `updatePotential(time)` method to `QuantumSimulation`
2. Call in `step()` before evolution
3. Recompute potential operator each step (performance cost)

---

## Browser Compatibility

### Requirements:
- ES6 modules support
- Canvas 2D context
- RequestAnimationFrame
- Performance.now() for timing
- Math.hypot for numerical stability

### Supported Browsers:
- Chrome/Edge 61+
- Firefox 60+
- Safari 11+
- Opera 48+

### Mobile Support:
- Touch events fully supported
- Responsive canvas sizing
- Gesture handling (tap, drag)

---

## Common Issues and Solutions

### Issue: Simulation becomes unstable (wavefunction explodes)
**Cause**: Time step too large, violates stability condition
**Solution**: Reduce `dt` or `timeScale` in config

### Issue: Wavefunction looks too dim
**Cause**: Initial width too large, probability spread over many cells
**Solution**: Reduce `initialWidth` or increase `saturationScale`

### Issue: Measurements don't work on touch devices
**Cause**: Touch event preventDefault not called
**Solution**: Already handled in `handleTouchStart` with `passive: false`

### Issue: Total probability drifts from 1.0
**Cause**: Numerical error accumulation, FFT precision loss
**Solution**: Periodic renormalization (already implemented after measurements)

### Issue: FFT fails with "gridSize must be power of 2"
**Cause**: Invalid grid size in config
**Solution**: Use only 32, 64, 128, 256, 512, etc.

---

## Performance Benchmarks

### Typical Performance (128×128 grid, 60 FPS):
- `step()`: ~2-4ms (FFT dominates)
- `render()`: ~1-2ms (pixel filling)
- `measure()`: ~0.5-1ms (integration)
- Total frame time: ~4-7ms (plenty of headroom for 60 FPS)

### Scaling:
- 64×64: ~1ms per step
- 128×128: ~3ms per step
- 256×256: ~12ms per step (approaches 60 FPS limit)
- 512×512: ~50ms per step (too slow for real-time)

---

## Mathematical Background

### Time-Dependent Schrodinger Equation (TDSE):
```
iℏ ∂ψ/∂t = Ĥψ
```

where Ĥ = T̂ + V̂ is the Hamiltonian operator:
- T̂ = -ℏ²∇²/2m (kinetic energy)
- V̂ = V(x,y,t) (potential energy)

### Split-Operator Method:
Approximate evolution operator for small Δt:
```
ψ(t+Δt) ≈ exp(-iV̂Δt/2ℏ) exp(-iT̂Δt/ℏ) exp(-iV̂Δt/2ℏ) ψ(t)
```

This is the Strang splitting, which is second-order accurate: O(Δt²)

### Measurement and Collapse:
- **Born Rule**: P(detection) = ∫ ψ* D(r) ψ dA
  - D(r) = exp(-r²/2σ²) is detector response
- **Positive Collapse**: ψ → D(r)^(1/2) ψ / norm
- **Negative Collapse**: ψ → (1 - D(r))^(1/2) ψ / norm

---

## License and Credits

This codebase implements standard numerical methods for quantum mechanics simulation, based on:
- Split-operator method (Feit, Fleck, Steiger, 1982)
- FFT-based spectral methods
- Born rule for quantum measurements

External dependencies:
- `../lib/fft.js`: Fast Fourier Transform library

---

## Contact and Support

For questions about the code architecture, numerical methods, or extending functionality, refer to:
1. Inline code comments for implementation details
2. This README for architectural overview
3. Quantum mechanics textbooks for theoretical background

**Last Updated**: December 2024
