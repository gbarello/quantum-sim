# Quantum Particle Playground - Codebase Overview for AI Assistants

This document provides a comprehensive overview of the Quantum Particle Playground codebase, designed to help AI assistants (like Claude) quickly understand the project structure, components, and how they interact.

## Quick Summary

**Quantum Particle Playground** is an interactive web-based quantum mechanics simulator that visualizes the time-dependent Schrödinger equation in 2D. Users can observe wavefunction evolution, perform quantum measurements, and explore quantum phenomena like wave-particle duality and the Born rule.

**Technology Stack:**
- Pure vanilla JavaScript (ES6 modules)
- HTML5 Canvas for rendering
- No external frameworks or build tools
- Custom FFT implementation for spectral methods

**Physics Implementation:**
- Split-operator method with FFT-based time evolution
- Accurate numerical solution of the Schrödinger equation
- Quantum measurement with Born rule and wavefunction collapse
- Periodic boundary conditions

---

## Project Structure

```
quantum-play/
│
├── index.html                    # Entry point - HTML structure
├── styles.css                    # Complete styling (mobile-first responsive)
├── README.md                     # User-facing documentation
├── CLAUDE.md                     # This file - AI assistant guide
│
├── js/                           # Main application code (ES6 modules)
│   ├── README.md                 # Detailed JS architecture documentation
│   ├── main.js                   # App coordinator & initialization
│   ├── quantum.js                # Physics engine (Schrödinger solver)
│   ├── visualization.js          # Canvas rendering & display
│   ├── controls/                # Modular control system
│   │   ├── ControlsManager.js   # Top-level UI coordinator
│   │   ├── TabManager.js        # Tab-based panel manager
│   │   ├── ControlPanel.js      # Control grouping container
│   │   ├── BaseControl.js       # Abstract base class for controls
│   │   ├── ControlRegistry.js   # Control type registry/factory
│   │   ├── defaultConfig.js     # Default control configuration
│   │   └── types/               # Concrete control implementations
│   │       ├── ButtonControl.js
│   │       ├── SliderControl.js
│   │       ├── RadioControl.js
│   │       ├── SelectControl.js
│   │       ├── DisplayControl.js
│   │       ├── CanvasControl.js
│   │       └── TextInputControl.js
│   └── utils.js                  # Complex numbers, grids, utilities
│
├── lib/                          # External libraries
│   ├── README.md                 # Library documentation
│   └── fft.js                    # Fast Fourier Transform (Cooley-Tukey)
│
├── tests/                        # Test scripts and validation
│   ├── README.md                 # Test documentation
│   ├── test-quantum.js           # Core quantum tests
│   ├── test-integrated-measurement.js
│   ├── measurement-artifact-test.js
│   ├── boundary-check.js
│   ├── validate.js               # System validation
│   ├── example-usage.js          # API usage examples
│   └── test-utils.html           # Browser-based test runner
│
└── docs/                         # Technical documentation
    ├── README.md                 # Documentation index
    ├── ROOT_ARCHITECTURE.md      # High-level architecture overview
    ├── QUANTUM-ENGINE-README.md  # Quantum engine details
    ├── UTILITIES_README.md       # Utility function docs
    ├── BOUNDARY_CONDITIONS.md    # Boundary condition implementation
    ├── BUILD_SUMMARY.md          # Build process notes
    └── design/
        └── initial-design.md     # Original design document
```

---

## Core Components

### 1. Application Coordinator (`js/main.js`)

**Purpose:** Main entry point that initializes and coordinates all components.

**Key Class:** `QuantumPlaygroundApp`
- Initializes simulation, visualizer, and controller
- Manages the animation loop (requestAnimationFrame)
- Handles canvas setup and responsive sizing
- Configuration management (grid size, time step, physical parameters)

**Important Configuration:**
```javascript
{
  gridSize: 128,              // Must be power of 2 for FFT
  domainSize: 10.0,           // Physical domain size
  dt: 0.01,                   // Time step
  timeScale: 1.0,             // Speed multiplier
  stepsPerFrame: 5,           // Physics updates per render
  boundaryCondition: 'periodic'
}
```

**Stability Check:** Validates `dt × timeScale < 2m*dx²/ℏ` to prevent numerical instability.

---

### 2. Quantum Physics Engine (`js/quantum.js`)

**Purpose:** Implements the time-dependent Schrödinger equation solver.

**Key Class:** `QuantumSimulation`

**Physics Method:** Split-operator method with FFT
```
ψ(t + Δt) = exp(-iV̂Δt/2ℏ) · FFT⁻¹[exp(-iT̂Δt/ℏ) · FFT[exp(-iV̂Δt/2ℏ) · ψ(t)]]
```

**Key Responsibilities:**
- Wavefunction storage and evolution
- Potential energy calculation (including potential wells)
- Quantum measurement implementation (Born rule)
- Wavefunction collapse mechanics
- Normalization preservation

**Data Structures:**
- `psi`: ComplexGrid - wavefunction in position space
- `psiMomentum`: ComplexGrid - wavefunction in momentum space
- `potential`: Float64Array - potential energy landscape

**Potential Wells Supported:**
- Gaussian barriers
- Square wells/barriers
- Harmonic oscillator potentials
- Double-well potentials

---

### 3. Visualization Layer (`js/visualization/`)

**Purpose:** Modular panel-based rendering architecture for quantum state visualization.

**Key Class:** `VisualizerV2` (aliased as `Visualizer` in main.js)

**Architecture:**
- **Panel-based design:** Each visual element is an independent panel
- **Separation of concerns:** Layout, rendering, and interaction are decoupled
- **Extensible:** Easy to add new visualization panels
- **Modular:** 348-line coordinator manages specialized panel components

**Visualization Modes:**
- **Full (Complex):** Phase → Hue, Amplitude → Brightness (default)
- **Probability:** Shows |ψ|² as grayscale intensity
- **Phase:** Shows arg(ψ) as hue only

**Complex-to-Color Mapping:**
- Uses HSL color space
- Phase (argument of complex number) → Hue (0-360°)
- Amplitude (magnitude) → Lightness
- Optimized rendering with ImageData

**Core Components:**
- `VisualizerV2.js` - Main coordinator (manages panels)
- `core/CanvasLayout.js` - Layout management and spatial calculations
- `core/Panel.js` - Abstract base class for all panels
- `core/InteractionManager.js` - Event handling framework
- `core/TooltipInfo.js` - Tooltip data structure

**Panel Types:**
- `WavefunctionPanel` - Main quantum state visualization (390 lines)
- `PotentialPlotPanel` - Side plot showing potential energy (298 lines)
- `GridOverlayPanel` - Optional grid overlay (153 lines)
- `PhaseWheelPanel` - Color reference legend (192 lines)
- `MeasurementFeedbackPanel` - Measurement animation feedback (238 lines)
- `MeasurementCirclePanel` - Hover preview circle (185 lines)

**Benefits:**
- 52% reduction in coordinator complexity vs original monolithic design
- Focused, testable modules (~200-400 lines each)
- Easy to extend with new visualizations
- High performance rendering

**Documentation:**
- `docs/VISUALIZER_V2_SUMMARY.md` - Complete architecture guide
- `docs/VISUALIZER_V2_INTEGRATION.md` - Migration guide
- `js/visualization/VISUALIZER_V2_QUICK_START.md` - Quick start
- `js/visualization/README.md` - Developer guide

---

### 4. Controls System (`js/controls/`)

**Purpose:** Modular, extensible UI framework for managing user interactions and control panels.

**Architecture:** Component-based system with declarative configuration

**Key Components:**

#### `ControlsManager` (Top-level coordinator)
- Initializes and manages all control panels and tabs
- Handles inter-control communication
- Provides global control access via `getControl(id)`
- Manages tab switching and panel visibility
- Coordinates with simulation and visualization systems

#### `TabManager` (Tab-based navigation)
- Manages multiple control panels as tabs
- Handles tab switching UI
- Organizes controls into logical groups:
  - **Initial Conditions:** Position, momentum, packet size, reset
  - **Simulation:** Play/pause, speed, time display
  - **Measurement:** Mode buttons, measurement radius
  - **Potential:** Potential type, strength controls
  - **Visualization:** Display mode, grid toggle, phase wheel
  - **Statistics:** Probability display, performance metrics

#### `ControlPanel` (Container for related controls)
- Groups related controls together
- Handles panel-level show/hide
- Manages control lifecycle within panel
- Renders controls in declared order

#### `BaseControl` (Abstract base class)
- Lifecycle: render(), update(), destroy()
- Event system: emit(), on(), off()
- State management: enable(), disable(), show(), hide()
- Value interface: getValue(), setValue()

#### `ControlRegistry` (Factory and registry)
- Registers control types (slider, button, radio, etc.)
- Creates controls from declarative config
- Validates control configurations
- Provides type safety and error handling

**Control Types Available:**
- **ButtonControl**: Action buttons (play, pause, reset)
- **SliderControl**: Numeric range inputs (speed, measurement radius)
- **RadioControl**: Multiple choice selection (potential types)
- **SelectControl**: Dropdown menus (grid size)
- **DisplayControl**: Read-only value display (time, probability)
- **CanvasControl**: Interactive canvas widgets (position/momentum selectors)
- **TextInputControl**: Text input fields

**Configuration-Driven:**
Controls are defined declaratively in `defaultConfig.js`:
```javascript
{
  type: 'slider',
  id: 'speed',
  label: 'Speed',
  min: 0.1,
  max: 5.0,
  defaultValue: 1.0,
  onChange: (value) => { /* handler */ }
}
```

**Benefits:**
- Easy to add new controls without modifying core code
- Tab-based organization keeps UI clean and organized
- Type-safe control creation with validation
- Consistent styling and behavior across all controls
- Simplified testing via isolated components

**Documentation:**
The controls system uses minimal external documentation - just one `README.md` providing architectural overview. Implementation details are documented in the code itself via JSDoc comments and clear naming. This keeps documentation maintainable and ensures it stays in sync with the code.

---

### 5. Mathematical Utilities (`js/utils.js`)

**Purpose:** Provides foundational mathematical operations.

**Key Classes:**

#### `Complex`
- Represents complex numbers with real and imaginary parts
- Operations: add, multiply, conjugate, magnitude, phase
- Efficient performance for intensive calculations

#### `ComplexGrid`
- 2D grid of complex numbers
- Underlying storage: Float64Array (interleaved [re, im, re, im, ...])
- Methods: get, set, normalization, scaling
- Memory-efficient representation

#### `FFT2D`
- 2D Fast Fourier Transform
- Uses row-column decomposition: FFT(rows) then FFT(columns)
- Wraps the `lib/fft.js` implementation
- Forward and inverse transforms

**Additional Utilities:**
- Coordinate conversion (canvas ↔ grid ↔ physical)
- Gaussian function generators
- Array manipulation utilities
- Performance measurement tools

---

### 6. FFT Library (`lib/fft.js`)

**Purpose:** High-performance 1D FFT implementation.

**Algorithm:** Cooley-Tukey radix-2 decimation-in-time
- O(N log N) complexity
- Precomputed twiddle factors
- Precomputed bit-reversal table
- In-place and out-of-place transforms
- Float64Array for numerical precision

**Why Custom Implementation:**
- Zero external dependencies
- Optimized for quantum simulation workload
- Controlled numerical precision
- Educational transparency

**Performance:** 256×256 2D FFT in ~1ms on modern hardware

---

## Data Flow Architecture

### Initialization Flow

```
index.html loads
    ↓
main.js imports modules (quantum, visualization, ControlsManager, utils)
    ↓
QuantumPlaygroundApp.init() called
    ↓
├─→ Canvas creation and sizing
├─→ QuantumSimulation initialization
│   └─→ Create wavefunction grids (ComplexGrid)
│   └─→ Initialize FFT instances
│   └─→ Set up Gaussian wavepacket
├─→ Visualizer initialization
│   └─→ Create ImageData buffer
│   └─→ Set visualization mode
└─→ ControlsManager initialization
    └─→ Register control types in ControlRegistry
    └─→ Create control panels from config
    └─→ Initialize TabManager with panels
    └─→ Bind event handlers and callbacks
    └─→ Render controls to DOM
    ↓
mainLoop() starts (requestAnimationFrame)
```

### Animation Loop

```
mainLoop(currentTime)
    ↓
Calculate deltaTime
    ↓
For each physics step (stepsPerFrame):
    ├─→ QuantumSimulation.step()
    │   ├─→ Apply potential (half step)
    │   ├─→ FFT to momentum space
    │   ├─→ Apply kinetic energy
    │   ├─→ Inverse FFT to position space
    │   ├─→ Apply potential (half step)
    │   └─→ Update time
    ↓
ControlsManager.update()
    └─→ Update display controls (time, probability, stats)
    ↓
Visualizer.render()
    ├─→ Read wavefunction data
    ├─→ Map complex values to colors
    ├─→ Draw to ImageData
    ├─→ putImageData to canvas
    ├─→ Draw potential overlay
    └─→ Draw measurement indicators
    ↓
requestAnimationFrame(mainLoop)
```

### Measurement Flow

```
User clicks on canvas
    ↓
ControlsManager receives click event via canvas interaction handler
    ↓
Convert canvas coords → grid coords
    ↓
QuantumSimulation.measure(x, y)
    ├─→ Calculate probability distribution |ψ(x,y)|²
    ├─→ Sample from distribution (Born rule)
    ├─→ Create new localized Gaussian at measured position
    ├─→ Replace wavefunction (collapse)
    └─→ Renormalize
    ↓
Visualizer shows measurement result
    ↓
ControlsManager updates display controls with measurement info
```

---

## Key Algorithms

### Split-Operator Time Evolution

The core physics algorithm that solves the Schrödinger equation:

```
iℏ ∂ψ/∂t = Ĥψ = (T̂ + V̂)ψ
```

**Why it works:**
- Kinetic energy (T̂) is diagonal in momentum space
- Potential energy (V̂) is diagonal in position space
- Split the evolution: exp(-iĤΔt/ℏ) ≈ exp(-iVΔt/2ℏ) exp(-iTΔt/ℏ) exp(-iVΔt/2ℏ)

**Implementation:**
1. Multiply ψ by exp(-iVΔt/2ℏ) in position space
2. FFT to momentum space
3. Multiply by exp(-iTΔt/ℏ) in momentum space
4. Inverse FFT to position space
5. Multiply by exp(-iVΔt/2ℏ) in position space

**Accuracy:** 2nd-order accurate in Δt (error ~ O(Δt²))

### Quantum Measurement (Born Rule)

**Theory:** Probability of measuring position (x,y) is P(x,y) = |ψ(x,y)|²

**Implementation:**
1. Calculate probability distribution: P[i,j] = |ψ[i,j]|²
2. Normalize: Σ P[i,j] = 1
3. Sample from distribution (weighted random selection)
4. Collapse wavefunction to Gaussian centered at measured position
5. Renormalize collapsed state

### Complex-to-Color Mapping

**Goal:** Visualize complex wavefunction ψ(x,y) = r·exp(iθ)

**Mapping:**
- Hue = phase angle θ (in degrees, 0-360°)
- Lightness = amplitude r (normalized)
- Saturation = 100% (full color)

**Color Wheel:**
- Red: phase = 0° (positive real)
- Yellow: phase = 60°
- Green: phase = 120°
- Cyan: phase = 180° (negative real)
- Blue: phase = 240°
- Magenta: phase = 300°

This creates an intuitive visual where:
- Brightness shows "how much" wavefunction
- Color shows "which way" it's pointing in complex plane

---

## Important Concepts for AI Assistants

### 1. Grid Indexing

The codebase uses multiple coordinate systems:

- **Canvas coordinates:** (canvasX, canvasY) - pixel coordinates
- **Grid indices:** (i, j) where i,j ∈ [0, gridSize-1]
- **Physical coordinates:** (x, y) where x,y ∈ [0, domainSize]

Utilities in `utils.js` provide conversion functions.

### 2. Complex Number Storage

Complex arrays are stored as interleaved Float64Arrays:
```
[re₀, im₀, re₁, im₁, re₂, im₂, ...]
```

Access via:
- `array[2*index]` = real part
- `array[2*index + 1]` = imaginary part

This format is cache-friendly and matches FFT expectations.

### 3. FFT Requirements

- Grid size MUST be a power of 2 (e.g., 64, 128, 256, 512)
- This is enforced in configuration validation
- Non-power-of-2 sizes will fail FFT operations

### 4. Numerical Stability

The code includes stability checks:
- Time step validation: `dt × timeScale < 2m*dx²/ℏ`
- Normalization checks: `∫|ψ|² dx dy = 1`
- Periodic boundary conditions prevent edge effects

### 5. Performance Considerations

- FFT is the computational bottleneck (O(N² log N) for 2D)
- Multiple physics steps per frame amortizes rendering cost
- ImageData operations are optimized for minimal allocations
- Float64Array used throughout for numerical precision

---

## Common Tasks for AI Assistants

### Adding a New Potential Well Type

1. Add potential function to `QuantumSimulation` in `quantum.js`
2. Update `addPotential()` or create specialized method
3. Add new option to potential type RadioControl in `controls/defaultConfig.js`
4. Test with `tests/boundary-check.js` or `tests/test-quantum.js`

### Changing Visualization

1. Modify color mapping in `Visualizer.render()` in `visualization.js`
2. Update visualization mode RadioControl in `controls/defaultConfig.js`
3. Test across different wavefunctions

### Modifying Physics Parameters

1. Update default config in `main.js`
2. Ensure stability condition is still satisfied
3. Consider adding new controls in `controls/defaultConfig.js`
4. Validate with `tests/validate.js`

### Adding New Measurements

1. Extend `measure()` method in `QuantumSimulation` (`quantum.js`)
2. Add UI trigger button/control in `controls/defaultConfig.js`
3. Update visualization to show results (`visualization.js`)
4. Test with `tests/test-integrated-measurement.js`

### Performance Optimization

Key areas:
- FFT implementation (`lib/fft.js`) - already highly optimized
- Complex number operations (`utils.js`) - minimize object allocation
- Canvas rendering (`visualization.js`) - minimize putImageData calls
- Physics loop (`quantum.js`) - consider SIMD operations

---

## Architecture Patterns

### Model-View-Controller (MVC)

- **Model:** `QuantumSimulation` (quantum.js) - physics state and logic
- **View:** `Visualizer` (visualization/) - rendering and display
- **Controller:** `ControlsManager` (controls/) - user input and coordination

### Observer Pattern (Implicit)

- Components communicate through direct method calls
- State changes trigger updates: simulation → visualization → UI
- No formal event system, but follows observer principles

### Strategy Pattern

- Visualization modes (full/probability/phase) use strategy pattern
- Different rendering strategies based on mode selection
- Easy to extend with new visualization types

### Module Pattern

- ES6 modules provide encapsulation
- Each file exports specific classes/functions
- Dependency injection via imports

---

## Testing Strategy

### Unit Tests
- `test-quantum.js`: Core physics validation
- `boundary-check.js`: Boundary condition tests
- Individual component tests

### Integration Tests
- `test-integrated-measurement.js`: End-to-end measurement flow
- `measurement-artifact-test.js`: Cross-component validation

### Validation Scripts
- `validate.js`: Overall system integrity
- Configuration validation
- Numerical stability checks

### Example Code
- `example-usage.js`: API demonstration
- Shows proper usage patterns
- Useful for learning the API

### Browser Tests
- `test-utils.html`: Interactive test runner
- Visual debugging tools
- Performance profiling

---

## File Size and Complexity

| File/Directory | Lines | Complexity | Purpose |
|----------------|-------|------------|---------|
| `js/main.js` | ~300 | Low | Simple orchestration |
| `js/quantum.js` | ~750 | High | Complex physics algorithms |
| `js/visualization/` | ~1,900 | Medium | Modular panel-based rendering (7 files) |
| `js/controls/` | ~2,500 | Medium | Modular control system (15+ files) |
| `js/utils.js` | ~900 | Medium | Math utilities and grids |
| `lib/fft.js` | ~320 | High | Optimized FFT algorithm |

**Total Application Code:** ~6,700 lines

---

## External Dependencies

**None!** This project has zero external dependencies:
- No npm packages
- No build tools
- No frameworks
- Pure vanilla JavaScript

**Benefits:**
- Simple deployment (static file hosting)
- No dependency management
- Educational transparency
- Full control over performance

---

## Browser Compatibility

**Required Features:**
- ES6+ JavaScript (modules, classes, arrow functions)
- HTML5 Canvas and 2D context
- Float64Array and typed arrays
- requestAnimationFrame
- CSS Grid and Flexbox

**Tested Browsers:**
- Chrome/Edge 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Mobile browsers (iOS Safari, Chrome Mobile) ✓

---

## Performance Characteristics

**Typical Performance (128×128 grid):**
- Single FFT: ~0.1ms
- Full physics step: ~0.5ms
- 5 physics steps: ~2.5ms
- Rendering: ~1-2ms
- **Total frame time: ~4-5ms → 200+ FPS possible**

**Scaling:**
- O(N² log N) for FFT operations
- O(N²) for potential and visualization
- 256×256 grid: ~15-20ms per frame → 60 FPS achievable
- 512×512 grid: ~60-80ms per frame → 15-20 FPS

**Memory Usage:**
- Each ComplexGrid: 2 × gridSize² × 8 bytes
- 128×128: ~256 KB per grid
- ~1-2 MB total application memory footprint

---

## Known Limitations

1. **Grid Size:** Must be power of 2 (FFT requirement)
2. **Boundary Conditions:** Only periodic boundaries fully implemented
3. **Dimensionality:** 2D only (3D would be computationally expensive)
4. **Particle Count:** Single particle simulation only
5. **Relativistic Effects:** Non-relativistic Schrödinger equation
6. **Spin:** Spinless particle (scalar wavefunction)

---

## Future Enhancement Opportunities

### Physics Extensions
- Multiple particles (multi-particle wavefunctions)
- Spin-1/2 particles (spinor wavefunctions)
- Time-dependent potentials
- Absorbing boundary conditions
- 3D simulation (computationally intensive)

### Visualization Enhancements
- 3D surface plots of probability density
- Momentum space visualization
- Energy eigenstate decomposition
- Trajectory tracking for wavepackets

### Interaction Features
- Drawable potential wells (freehand drawing)
- Potential well editor with presets
- Multiple measurement modes (momentum, energy)
- Replay and recording features

### Performance Optimizations
- WebGL acceleration for rendering
- WebAssembly for FFT (10-100× speedup)
- SIMD operations for complex math
- Multi-threading with Web Workers

### Educational Features
- Step-by-step tutorial mode
- Quantum phenomena demonstrations
- Parameter sensitivity exploration
- Export data for analysis

---

## Documentation Map

For detailed information on specific components:

1. **High-level architecture:** See `docs/ROOT_ARCHITECTURE.md`
2. **JavaScript implementation:** See `js/README.md`
3. **Mathematical libraries:** See `lib/README.md`
4. **Quantum engine details:** See `docs/QUANTUM-ENGINE-README.md`
5. **Utility functions:** See `docs/UTILITIES_README.md`
6. **Testing:** See `tests/README.md`
7. **Original design:** See `docs/design/initial-design.md`

---

## Quick Reference for Common Operations

### Resetting the Simulation with Custom Initial Conditions

**Via UI (User):**
1. Click position selector canvas to set starting position
2. Click momentum selector canvas to set starting momentum
3. Adjust packet size slider to set wavepacket width
4. Click Reset button to apply changes

**Programmatically:**
```javascript
// Access initial condition controls and set values
const posControl = app.controlsManager.getControl('position-selector');
const momControl = app.controlsManager.getControl('momentum-selector');
const sizeControl = app.controlsManager.getControl('packet-size');

posControl.setValue({ x: 0.5, y: 0.5 });  // Normalized 0-1
momControl.setValue({ x: 0.6, y: 0.4 });  // Normalized 0-1
sizeControl.setValue(1.2);  // Multiplier

// Trigger reset
app.controlsManager.handleReset();

// Or directly initialize simulation
app.simulation.initialize({
  centerX: 64,      // Grid coordinates
  centerY: 64,
  width: 0.6,       // Physical width
  momentumX: 1.0,   // Physical momentum
  momentumY: 0.6
});
```

### Adding a Potential Well
```javascript
app.simulation.addGaussianPotential(x, y, strength, width);
```

### Performing a Measurement
```javascript
const result = app.simulation.measure(x, y);
// result = { found: boolean, probability: number }
```

### Changing Visualization Mode
```javascript
app.visualizer.setVisualizationMode('probability'); // or 'full', 'phase'
```

### Pausing/Resuming
```javascript
app.controlsManager.togglePlayPause();
```

---

## Glossary of Key Terms

- **Wavefunction (ψ):** Complex-valued function describing quantum state
- **Born Rule:** Probability = |ψ|² (magnitude squared)
- **FFT:** Fast Fourier Transform - algorithm for position ↔ momentum space
- **Split-Operator:** Numerical method for time evolution
- **Collapse:** Sudden change of wavefunction upon measurement
- **Periodic Boundaries:** Wavefunction wraps around domain edges
- **Grid Size:** Number of discrete points in each dimension (N×N)
- **Time Step (dt):** Discrete time increment for numerical integration
- **Domain Size:** Physical extent of simulation space
- **Complex Number:** Number with real and imaginary parts (re + i·im)

---

## Contact and Contribution

This is an educational project demonstrating quantum mechanics principles through interactive simulation. The codebase is designed to be readable, well-documented, and extensible.

For questions, improvements, or extensions, refer to the detailed documentation in the `docs/` directory and component-specific READMEs.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-12
**Total Documentation:** ~6,000 lines across all docs
