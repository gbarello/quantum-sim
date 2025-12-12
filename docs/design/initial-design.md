# Quantum Particle Simulation Game - Design Document

## Overview
A web-based interactive quantum mechanics simulation where users can observe wavefunction evolution and perform measurements on a quantum particle in a 2D grid. The simulation faithfully implements the time-dependent Schrödinger equation for a free particle.

## Physics Foundation

### The Schrödinger Equation
The time-dependent Schrödinger equation governs quantum evolution:
```
iℏ ∂ψ/∂t = Ĥψ
```

For a free particle (no potential), the Hamiltonian is purely kinetic:
```
Ĥ = -ℏ²/(2m) ∇²
```

In 2D:
```
iℏ ∂ψ/∂t = -ℏ²/(2m) (∂²ψ/∂x² + ∂²ψ/∂y²)
```

### Key Properties to Preserve
1. **Unitarity**: Total probability ∫|ψ|² dxdy = 1 must be conserved
2. **Complex-valued wavefunction**: ψ(x,y,t) = |ψ|e^(iφ)
3. **Dispersion**: Free particle wavefunctions spread over time
4. **Superposition**: Linear combinations of states remain valid

## Numerical Implementation

### Grid Discretization
- **Grid size**: N×N configurable (recommend starting with 64×64 or 128×128)
- **Spatial step**: Δx = Δy (square cells)
- **Domain**: Periodic or finite with boundary conditions
- **Wavefunction storage**: Complex array ψ[x][y] at each grid point

### Time Evolution Method
**Split-Operator Method** (preferred for accuracy and efficiency):

1. Split the evolution operator: e^(-iĤt/ℏ) ≈ e^(-iT̂Δt/2ℏ) · e^(-iV̂Δt/ℏ) · e^(-iT̂Δt/2ℏ)
2. For free particle (V=0), only kinetic evolution remains
3. Use FFT to switch between position and momentum space:
   - Position space: ψ(x,y)
   - Momentum space: ψ̃(kx,ky) via 2D FFT
4. Evolution steps:
   - ψ(t+Δt) = FFT⁻¹[e^(-iℏ(kx²+ky²)Δt/2m) · FFT[ψ(t)]]

**Alternative**: Crank-Nicolson method (more stable but slower)

### Initial Condition
**Gaussian wavepacket** centered at grid center:
```
ψ(x,y,0) = A exp(-(x-x₀)²/4σ² - (y-y₀)²/4σ²) exp(i(px·x + py·y)/ℏ)
```

Parameters:
- (x₀, y₀): Center position (grid center)
- σ: Width parameter (controls initial localization, ~3-5 grid cells)
- (px, py): Initial momentum (can be 0 or small to show drift)
- A: Normalization constant

### Boundary Conditions

#### MVP: Periodic Boundaries
**Decision**: Start with periodic boundary conditions
- Wavefunction wraps around edges (torus topology)
- Natural for FFT-based split-operator method
- Simplest implementation
- Good for free particle visualization

**Implementation**:
- FFT inherently assumes periodicity
- No special boundary handling needed
- Grid cells at x=0 and x=N-1 are neighbors (same for y)

#### Future Extensions: Extensible Boundary System
Design the boundary condition handling to be modular and extensible:

```javascript
class BoundaryCondition {
  apply(psi, gridSize)  // Apply boundary condition to wavefunction
}

class PeriodicBC extends BoundaryCondition { ... }    // MVP
class HardWallBC extends BoundaryCondition { ... }    // Future: ψ = 0 at edges
class AbsorbingBC extends BoundaryCondition { ... }   // Future: absorb outgoing waves
```

**Future boundary types**:
- **Hard walls**: ψ = 0 at boundaries (requires modified evolution method)
- **Absorbing**: Dampen amplitude near edges to simulate infinite space
- **Reflective**: Specific reflection coefficients
- **Mixed**: Different conditions on different edges

### Time Step Selection
Critical for stability:
```
Δt < 2mΔx²/ℏ (stability condition)
```

Recommend: Δt = 0.5 × (stability limit)

**Time Scale Parameter**:
- Use `timeScale` multiplier to control evolution speed: `Δt_effective = Δt × timeScale`
- Must ensure: `Δt_effective < 2mΔx²/ℏ` (i.e., `timeScale × Δt` still satisfies stability)
- `timeScale = 1.0` is normal speed, `2.0` is 2× faster, `0.5` is half speed
- Not a UI control in MVP, but configurable as parameter for fine-tuning evolution rate

### Measurement Implementation

#### MVP: Single Grid Square Measurement
When user clicks at grid position (x_click, y_click):

1. **Pre-measurement**: Wavefunction is ψ(x,y)

2. **Calculate measurement probability**:
   - P_found = |ψ(x_click, y_click)|²
   - This is the probability of finding the particle at the clicked grid square

3. **Perform probabilistic measurement**:
   - Generate random number r ∈ [0,1]
   - Compare with P_found

4. **Post-measurement collapse** (two outcomes):

   **A. Positive Result (r < P_found): "Particle found here!"**
   - Collapse to the single clicked grid square
   - **MVP Implementation**: Set all grid squares to zero except clicked square
   - ψ_new(x,y) = ψ(x_click, y_click) if (x,y) = (x_click, y_click), else 0
   - **Renormalize**: ψ_new → ψ_new/√(∑|ψ_new|²)
   - Result: Particle is now localized to one grid square

   **B. Negative Result (r ≥ P_found): "Particle NOT found here!"**
   - **MVP Implementation**: Zero out only the single clicked grid square
   - ψ_new(x,y) = 0 if (x,y) = (x_click, y_click), else ψ(x,y)
   - **Renormalize**: ψ_new → ψ_new/√(∑|ψ_new|²)
   - Physically: We now know the particle is NOT in this specific grid square

5. **Visualization**:
   - Show "Found!" or "Not found!" message
   - Display probability P_found before measurement
   - Highlight single clicked grid square
   - Brief pause to show result
   - Continue evolution from new state

#### Future Enhancement: Variable Measurement Radius
In later versions, add a measurement radius parameter R (in grid cells):

**Positive result with radius R**:
- Collapse wavefunction to Gaussian centered at click position
- ψ_new(x,y) = A exp(-[(x-x_click)²+(y-y_click)²]/2σ_measure²)
- Width σ_measure related to measurement radius
- Represents finite measurement resolution

**Negative result with radius R**:
- Zero out circular region of radius R around click point
- ψ_new(x,y) = 0 if √[(x-x_click)²+(y-y_click)²] ≤ R, else ψ(x,y)
- Alternative: Use smooth window function for gradual cutoff
- Larger R = more information gained, but more destructive

## Visualization

### Color Mapping
**Complex-to-Color encoding** for ψ(x,y) = |ψ|e^(iφ):

- **Hue** (0-360°): Phase φ = arg(ψ)
  - 0° = red: ψ is real positive
  - 90° = yellow: ψ is imaginary positive
  - 180° = cyan: ψ is real negative
  - 270° = blue: ψ is imaginary negative

- **Saturation** (0-100%): Amplitude |ψ|
  - 0%: |ψ| = 0 (white/gray)
  - 100%: |ψ| = max (full color)

- **Lightness** (fixed at 50% or adjust based on |ψ|)

### Alternative Visualization Options
- Toggle to show probability density |ψ|² only (grayscale)
- Phase wheel reference indicator
- Grid overlay
- Normalization indicator (total probability)

### Canvas Rendering
- HTML5 Canvas for main visualization
- Update at ~30-60 FPS (independent of physics timestep)
- Each grid cell maps to canvas pixels (with smoothing optional)

## Technical Architecture

### File Structure
```
quantum-play/
├── index.html           # Main page structure
├── styles.css           # Styling
├── js/
│   ├── quantum.js       # Core physics engine
│   ├── visualization.js # Canvas rendering
│   ├── controls.js      # User interaction
│   └── utils.js         # FFT, complex math utilities
└── lib/
    └── fft.js           # FFT library (or use fft.js npm package)
```

### Core Modules

#### quantum.js - Physics Engine
```javascript
class QuantumSimulation {
  constructor(gridSize, dx, dt, hbar, mass, boundaryCondition = 'periodic', timeScale = 1.0)
  initialize(initialCondition)
  step()                           // Evolve by one timestep (uses dt * timeScale internally)

  // Measurement (MVP: single grid square)
  measure(x, y)                    // Perform measurement, returns {found: bool, probability: float}
  collapsePositive(x, y)           // Collapse to single grid square (particle found)
  collapseNegative(x, y)           // Zero out single grid square (particle NOT found)

  // Future: add radius parameter
  // collapsePositive(x, y, radius)
  // collapseNegative(x, y, radius)

  // Queries
  getProbabilityAt(x, y)           // Get |ψ(x,y)|²
  getProbabilityDensity()          // Get |ψ|² for entire grid
  getPhase()                       // Get arg(ψ) for entire grid
  getTotalProbability()            // Normalization check (should be ~1)

  // Utilities
  renormalize()                    // Explicitly renormalize wavefunction

  // Future: boundary condition methods
  // setBoundaryCondition(type)    // Switch boundary condition type
}
```

#### visualization.js - Rendering
```javascript
class Visualizer {
  constructor(canvas, simulation)
  render()                  // Draw current state
  complexToColor(psi)       // Convert ψ to RGB
  drawGrid()
  drawControls()
}
```

#### controls.js - Interaction
```javascript
class Controller {
  handleClick(x, y)         // Measurement
  handlePausePlay()
  handleReset()
  handleSpeedControl()
}
```

### Libraries/Dependencies
- **FFT**: fft.js or FFTW.js (for 2D transforms)
- **Complex numbers**: Either built-in or simple {re, im} objects
- **No heavy frameworks**: Vanilla JavaScript for learning/transparency

## Website Design and Hosting

### Design Philosophy
Keep it **simple, fast, and focused** on the quantum simulation:
- Clean, minimal UI that doesn't distract from physics
- Responsive layout that works on desktop and tablet
- Fast loading (vanilla JS, no heavy frameworks)
- Accessible controls and clear visual hierarchy

### HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quantum Particle Simulation</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Quantum Particle Playground</h1>
    <p class="subtitle">Observe wavefunction evolution and perform measurements</p>
  </header>

  <main>
    <div class="simulation-container">
      <canvas id="quantum-canvas"></canvas>
      <div class="info-overlay">
        <!-- Probability, measurement result, etc. -->
      </div>
    </div>

    <div class="controls-panel">
      <button id="play-pause">Play/Pause</button>
      <button id="reset">Reset</button>
      <div class="slider-control">
        <label>Speed: <span id="speed-value">1x</span></label>
        <input type="range" id="speed-slider" min="1" max="10" value="5">
      </div>
      <!-- More controls... -->
    </div>

    <div class="info-panel">
      <!-- Instructions, phase wheel reference, etc. -->
    </div>
  </main>

  <footer>
    <details>
      <summary>About this simulation</summary>
      <p>Physics explanation, credits, links...</p>
    </details>
  </footer>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

### CSS Approach
**Mobile-first responsive design**:
```css
/* Key principles:
   - Flexbox/Grid for layout
   - CSS custom properties for theming
   - Mobile-first with media queries
   - Canvas scales to container
*/

:root {
  --primary-color: #2c3e50;
  --accent-color: #3498db;
  --bg-color: #ecf0f1;
  --text-color: #2c3e50;
}

.simulation-container {
  position: relative;
  max-width: 800px;
  margin: 0 auto;
  aspect-ratio: 1; /* Square canvas */
}

#quantum-canvas {
  width: 100%;
  height: 100%;
  border: 2px solid var(--primary-color);
  cursor: crosshair;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  /* Stack controls vertically on mobile */
}
```

### Layout Sections

#### 1. Header
- Title and brief description
- Optional: Link to about/docs

#### 2. Canvas Area (Primary Focus)
- Large, centered canvas element
- Scales responsively (maintain aspect ratio)
- Info overlay for measurement feedback
- Hover tooltip showing probability at cursor position

#### 3. Controls Panel
- Play/Pause, Reset buttons
- Speed slider
- Visualization mode toggles
- Grid size selector (dropdown)
- Initial momentum controls
- Clean, icon-based where possible

#### 4. Info/Legend Panel
- Phase wheel reference (hue → phase mapping)
- Instructions: "Click to measure"
- Real-time stats: Total probability, time elapsed
- Optional: expandable physics explanation

#### 5. Footer
- Collapsible "About" section
- Credits, source code link
- Educational resources

### Visual Design Elements

**Color Scheme**:
- Neutral background (light gray or white)
- Canvas border to frame simulation
- Accent colors for buttons (blue for action, red for reset)
- High contrast for accessibility

**Typography**:
- Clean sans-serif (system fonts: -apple-system, BlinkMacSystemFont, "Segoe UI")
- Large, readable sizes (16px base minimum)
- Clear hierarchy (h1 > h2 > body)

**Interactive Feedback**:
- Button hover states
- Canvas cursor changes (crosshair for measurement)
- Measurement flash/animation
- Smooth transitions (CSS transitions for UI elements)

### Performance Considerations

**Canvas Optimization**:
- Use `requestAnimationFrame` for render loop
- Separate physics timestep from render framerate
- Consider `OffscreenCanvas` for heavy computation (future)
- Limit canvas resolution on mobile devices

**Asset Loading**:
- Inline critical CSS
- Defer/async JavaScript loading
- Minimal external dependencies
- No large images (SVG for icons if needed)

**Mobile Support**:
- Touch-friendly controls (min 44×44px touch targets)
- Canvas touch events for measurement
- Prevent zoom/scroll on canvas
- Simplified UI on small screens
- Consider performance limits (smaller grid on mobile)

### Hosting Options

#### Recommended: Static Site Hosting
The simulation is purely client-side JavaScript, perfect for static hosting:

**GitHub Pages** (Free, easiest):
- Push to GitHub repository
- Enable Pages in settings
- Automatic deployment on push
- Custom domain support
- HTTPS by default
- URL: `username.github.io/quantum-play`

**Netlify** (Free tier):
- Drag-and-drop deployment or Git integration
- Automatic builds
- Custom domains
- Excellent performance
- Built-in CDN

**Vercel** (Free tier):
- Similar to Netlify
- Great performance
- Easy deployment

**Cloudflare Pages** (Free):
- Fast CDN
- Unlimited bandwidth
- Simple deployment

#### File Structure for Deployment
```
quantum-play/
├── index.html
├── styles.css
├── js/
│   ├── main.js
│   ├── quantum.js
│   ├── visualization.js
│   ├── controls.js
│   └── utils.js
├── lib/
│   └── fft.js
└── README.md
```

All files are static - just upload and serve!

### Domain and URL
- Simple, memorable domain (e.g., `quantum-play.dev`, `quantumgame.io`)
- Or use free subdomain from hosting provider
- Consider: quantum-playground, quantum-observer, wave-game, etc.

### Analytics (Optional)
- Lightweight analytics (Plausible, GoatCounter) if desired
- Privacy-focused, no cookies needed
- Track: page views, measurement interactions, avg session time

### Accessibility
- Semantic HTML
- ARIA labels for controls
- Keyboard navigation support (space for play/pause, R for reset, etc.)
- Alt text for any images
- Color contrast compliance (WCAG AA minimum)
- Screen reader friendly (announce measurement results)

### Browser Compatibility
**Target**:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- No IE11 support (use modern JavaScript)

**Required Features**:
- Canvas 2D API (universally supported)
- ES6 modules (widely supported)
- CSS Grid/Flexbox (standard)
- `Math.hypot`, complex math (polyfill if needed)

### Progressive Enhancement
- Core simulation works without JavaScript (show message)
- Fallback for no canvas support (rare, but graceful)
- Print styles (capture canvas state for printing)

## Parameters and Configuration

### Physics Parameters
```javascript
const config = {
  // Grid
  gridSize: 128,           // N×N grid
  domainSize: 10.0,        // Physical size (arbitrary units)

  // Physics constants (can use natural units: ℏ=1, m=1)
  hbar: 1.0,
  mass: 1.0,

  // Time evolution
  dt: 0.01,                // Time step (must satisfy stability: dt < 2m*dx²/ℏ)
  timeScale: 1.0,          // Evolution speed multiplier (1.0 = normal, 2.0 = 2x faster, etc.)
                           // Note: Not a UI control in MVP, but settable as parameter
  stepsPerFrame: 5,        // Physics steps per render

  // Boundary conditions (MVP: periodic only)
  boundaryCondition: 'periodic',  // 'periodic' (MVP), 'hard-wall', 'absorbing' (future)

  // Initial condition
  initialWidth: 1.0,       // σ for Gaussian
  initialPosition: [N/2, N/2],
  initialMomentum: [0, 0], // Can add drift

  // Measurement (MVP: single grid square only)
  // Future: measurementRadius: 1  // Radius in grid cells for collapse/exclusion

  // Visualization
  colorSaturationScale: 1.0,
  showGrid: false,
  showPhaseWheel: true
}
```

### UI Controls (MVP)
- Play/Pause button
- Reset button
- Speed slider (adjust stepsPerFrame - controls render rate, not physics speed)
- Grid size selector (requires reinit)
- Visualization mode toggle (full complex / |ψ|² only / phase only)
- Initial momentum selector (to show directional propagation)

**Note**: `timeScale` parameter (physics evolution speed multiplier) is settable in config but not exposed as UI control in MVP

### Future UI Controls
- Measurement radius slider (1-10 grid cells)
- Measurement mode selector (sharp vs smooth cutoff)
- Time scale slider (adjust physics evolution speed, separate from render rate)
- Boundary condition selector (periodic / hard wall / absorbing)

## User Interaction Flow

### Initial State
1. Page loads
2. Simulation initializes with Gaussian at center
3. Animation starts automatically
4. User sees wavefunction spreading

### Measurement Interaction
1. User clicks on canvas at position (x, y)
2. Calculate and display probability P = |ψ(x,y)|²
3. Pause simulation briefly (optional, for clarity)
4. Highlight measurement region
5. Perform probabilistic measurement:
   - Random determination based on P
   - **If found (probability P)**:
     - Show "Found! (P=X%)" message
     - Collapse wavefunction to clicked position (Gaussian peak)
     - Green highlight/flash
   - **If NOT found (probability 1-P)**:
     - Show "Not Found! (P was X%)" message
     - Remove amplitude from measurement region
     - Renormalize remaining wavefunction
     - Red highlight/flash for "zeroed out" region
6. Resume evolution from new collapsed state
7. User can see consequences of their measurement

### Visual Feedback
- **Pre-measurement**: Show P(x,y) at hover position (tooltip or overlay)
- **During measurement**:
  - Highlight/circle measurement region
  - Display probability percentage
- **Post-measurement positive**: Green flash/highlight at found location
- **Post-measurement negative**: Red region showing where amplitude was removed
- **Continuous display**: Total probability bar (should always be ~100%)
- **Optional**: Histogram of measurement results over multiple trials

## Physics Validation Tests

### Test Cases
1. **Normalization**: ∑|ψ(x,y)|² = 1 at all times (within numerical error ~10⁻⁶)
   - Must hold before AND after measurements (both positive and negative)

2. **Energy conservation**: Free particle energy should remain constant
   - During evolution (no measurements)
   - Note: Measurements change energy (this is physical!)

3. **Dispersion relation**: Verify ω = ℏk²/2m for plane waves

4. **Gaussian spreading**: Compare to analytical solution

5. **Measurement statistics**: Verify Born rule
   - **Positive measurements**: Over many trials at same position, frequency of "found" should match |ψ|²
   - **Negative measurements**: After "not found" at position, P(that position) should be ~0
   - **Conservation**: After negative measurement, remaining wavefunction must still normalize to 1

### Debug Visualizations
- Total probability vs time plot
- Energy vs time plot
- Fourier space visualization (momentum distribution)

## Future Extensions

### Phase 1.5: Enhanced Measurements
- **Variable measurement radius**: User-adjustable R (1-10 grid cells)
  - Positive measurement: Collapse to Gaussian of width ∝ R
  - Negative measurement: Zero out circular region of radius R
  - UI: Radius slider, visual preview circle on hover
- **Measurement statistics display**: Track and visualize Born rule validation
- **Smooth vs sharp cutoff**: Window function options for negative measurements

### Phase 2: Potential Wells & Boundaries
- Add V(x,y) term to Hamiltonian
- Square wells, harmonic oscillators
- Barriers for tunneling demonstrations
- **Alternative boundary conditions**:
  - Hard wall boundaries (ψ = 0 at edges)
  - Absorbing boundaries (dampen near edges)
  - User-selectable boundary condition mode

### Phase 3: Multiple Particles
- 2-particle entanglement
- Bosons vs fermions (symmetry)

### Phase 4: Advanced Features
- Multiple measurement bases (position, momentum)
- Time-reversal visualization
- Expectation value tracking
- Educational tooltips

### Phase 5: Game Mechanics
- Challenges: "Guide the particle to target"
- Puzzle mode: Use measurements strategically
  - Negative measurements can "steer" probability away from regions
  - Positive measurements reset particle position
  - Trade-off between information gain and wavefunction disturbance
- Scoring based on measurement efficiency
- "Quantum Zeno effect": Repeated measurements can freeze evolution
- Measurement budget: Limited number of measurements to reach goal

## Open Questions / Design Decisions

1. **Boundary conditions**:
   - **MVP DECISION**: Periodic boundary conditions (torus topology)
     - Simplest for FFT-based evolution
     - No special boundary handling required
     - Good for free particle visualization
   - **Design for extensibility**: Modular `BoundaryCondition` class hierarchy
     - Easy to add hard walls, absorbing boundaries later
     - User-selectable in future versions

2. **Measurement region sizes**:
   - **MVP DECISION**: Single grid square only for both positive and negative measurements
     - Simplest implementation
     - Clear, unambiguous behavior
     - Still demonstrates quantum measurement faithfully
   - **Future enhancement**: Variable radius R (1-10 grid cells)
     - **Positive result**: Gaussian with width σ_measure ∝ R
     - **Negative result**: Zero out circular region of radius R
     - Tradeoff: Larger R = more information gained, but more destructive to wavefunction
     - User-configurable via slider

3. **Initial momentum**: Start at rest or with drift?
   - Recommendation: Configurable, default to zero or small value

4. **Visualization lightness**: Fixed 50% or amplitude-dependent?
   - Recommendation: Fixed for clarity, amplitude in saturation

5. **Performance**: Grid size limit for smooth animation?
   - Test 64×64, 128×128, 256×256 on target browsers

## Technical Notes

### FFT Library Choice
- **fft.js**: Pure JavaScript, good for learning
- **FFTW.js**: WebAssembly, much faster for large grids
- Start with fft.js, optimize later if needed

### Numerical Precision
- Use Float64Array for wavefunction storage
- Watch for numerical diffusion/dispersion
- Monitor normalization as quality metric

### Browser Compatibility
- Target modern browsers (ES6+)
- Canvas 2D API (widely supported)
- No WebGL initially (can add for performance)

## Success Criteria

MVP is successful when:
1. Wavefunction evolves smoothly from center
2. Spreading rate matches theoretical prediction
3. Total probability conserved to <1% error
4. Color visualization clearly shows phase and amplitude
5. Click measurement collapses wavefunction realistically
6. Runs smoothly at 30+ FPS on modern hardware

## Implementation Priority

### Phase 1 (MVP)
1. Set up HTML/Canvas structure
2. Implement complex number utilities
3. Integrate FFT library
4. Implement split-operator evolution
5. Create visualization pipeline (hue = phase, saturation = amplitude)
6. **Add single-grid-square measurement**:
   - Probabilistic determination (Born rule)
   - Positive result: collapse to clicked square only
   - Negative result: zero out clicked square only
   - Renormalization after both outcomes
7. Basic UI (play/pause, reset, speed control)
8. Test and validate physics (normalization, Born rule, spreading)

### Phase 1.5 (Enhanced Measurements)
1. Add measurement radius parameter
2. Implement variable-radius collapse/exclusion
3. UI: radius slider with hover preview
4. Smooth vs sharp cutoff options
5. Measurement statistics tracking

### Phase 2 (Polish & Features)
1. Improved visual feedback (animations, tooltips)
2. Add debug/validation displays (probability plot, energy plot)
3. Multiple initial conditions (momentum, width)
4. Performance optimization

### Phase 3 (Physics Extensions)
1. Add potential V(x,y) support
2. Potentials: wells, barriers, harmonic oscillators
3. Different boundary conditions

### Phase 4 (Game Mechanics)
1. Target challenges
2. Measurement budget/scoring
3. Strategic puzzle mode
