# Root Architecture Documentation

## Project Overview

**Quantum Particle Playground** is an interactive web-based educational simulation that demonstrates quantum mechanical phenomena in real-time. The application implements the time-dependent Schrödinger equation for a free quantum particle in 2D space, allowing users to observe wavefunction evolution and perform quantum measurements with probabilistic wavefunction collapse.

### Purpose
- Educational tool for visualizing quantum mechanics concepts
- Interactive demonstration of wave-particle duality, Heisenberg uncertainty, quantum measurement, and the Born rule
- Real-time simulation using accurate numerical methods (split-operator FFT-based evolution)
- Accessible physics education without requiring specialized software

---

## High-Level Architecture

### Design Philosophy
The application follows a **Model-View-Controller (MVC)** pattern with clean separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         index.html                           │
│                    (Entry Point & UI)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─── styles.css (Presentation Layer)
                     │
                     └─── js/main.js (Application Coordinator)
                            │
           ┌────────────────┼────────────────┐
           │                │                │
    ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
    │  quantum.js │  │visualization│  │ controls.js│
    │   (Model)   │  │    (View)   │  │(Controller)│
    └──────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │                │                │
           └────────────┬───┴────────────────┘
                        │
                  ┌─────▼──────┐
                  │  utils.js  │
                  │(Foundation)│
                  └─────┬──────┘
                        │
                  ┌─────▼──────┐
                  │ lib/fft.js │
                  │ (External) │
                  └────────────┘
```

### Core Components

1. **Physics Engine** (`quantum.js`)
   - Implements Schrödinger equation solver
   - Manages quantum state and time evolution
   - Handles measurements and wavefunction collapse
   - Provides potential well implementations

2. **Visualization Layer** (`visualization.js`)
   - Renders wavefunction to HTML5 Canvas
   - Complex-to-color mapping (phase → hue, amplitude → brightness)
   - Multiple visualization modes (complex, probability, phase)
   - Grid overlay and potential plotting

3. **User Interface Controller** (`controls.js`)
   - Manages DOM event handlers
   - Coordinates user input (clicks, keyboard, sliders)
   - Updates UI state indicators
   - Bridges user actions to physics/visualization

4. **Application Coordinator** (`main.js`)
   - Initializes and connects all components
   - Manages animation loop
   - Handles configuration
   - Provides app-level state management

5. **Foundation Libraries**
   - `utils.js`: Complex number math, grid operations, coordinate transforms
   - `lib/fft.js`: Fast Fourier Transform (2D FFT via row-column decomposition)

---

## Directory Structure

```
quantum-play/
│
├── index.html                    # Entry point: HTML structure
├── styles.css                    # Complete styling (mobile-first responsive)
│
├── js/                           # Application modules (ES6)
│   ├── main.js                   # App coordinator & initialization (301 lines)
│   ├── quantum.js                # Physics engine & simulation (748 lines)
│   ├── visualization.js          # Canvas rendering & display (726 lines)
│   ├── controls.js               # User interface controller (597 lines)
│   └── utils.js                  # Utilities & complex math (908 lines)
│
├── lib/                          # External libraries
│   └── fft.js                    # Fast Fourier Transform (322 lines)
│
├── *.md                          # Documentation
│   ├── README.md                 # User-facing documentation
│   ├── ROOT_ARCHITECTURE.md      # This file (project overview)
│   ├── QUANTUM-ENGINE-README.md  # Detailed physics documentation
│   ├── UTILITIES_README.md       # Utils library documentation
│   ├── BUILD_SUMMARY.md          # Development build notes
│   ├── BOUNDARY_CONDITIONS.md    # Boundary conditions explanation
│   └── initial-design.md         # Original design specification
│
├── test-*.js / *.js              # Test/validation scripts (Node.js)
│   ├── test-quantum.js           # Physics tests
│   ├── test-integrated-measurement.js
│   ├── measurement-artifact-test.js
│   ├── boundary-check.js
│   ├── validate.js
│   └── example-usage.js          # Usage examples
│
├── test-utils.html               # Browser-based utility tests
│
└── .git/                         # Git repository
    └── .gitignore                # Git ignore rules
```

### File Organization Rationale

- **Root Level**: Entry files (HTML, CSS) and documentation
- **`js/` Directory**: Core application modules using ES6 modules
- **`lib/` Directory**: Third-party or external libraries (FFT implementation)
- **Test Files**: Validation scripts (not loaded by production app)
- **Documentation**: Multiple MD files for different audiences/purposes

---

## Application Initialization Flow

### 1. HTML Entry Point (`index.html`)

```
User opens index.html
    ↓
Browser parses HTML structure
    ↓
Loads styles.css (styling applied)
    ↓
Encounters <script type="module" src="js/main.js">
    ↓
ES6 module loading begins
```

### 2. Module Loading Chain

```javascript
// index.html line 243
<script type="module" src="js/main.js"></script>

// js/main.js lines 7-9
import { QuantumSimulation } from './quantum.js';
import { Visualizer } from './visualization.js';
import { Controller } from './controls.js';

// js/quantum.js line 12
import { ComplexGrid, FFT2D, normalize, Complex } from './utils.js';

// js/utils.js line 15
import FFT from '../lib/fft.js';
```

**Module Dependency Graph:**
```
main.js
  ├─→ quantum.js
  │     └─→ utils.js
  │           └─→ lib/fft.js
  ├─→ visualization.js
  └─→ controls.js
```

### 3. Application Initialization

Once modules load, `main.js` executes:

```javascript
// Create app configuration (lines 14-40)
const config = { gridSize: 128, domainSize: 10.0, ... };

// Define QuantumPlaygroundApp class (lines 45-300)
class QuantumPlaygroundApp {
  constructor() { ... }
  async init() {
    // 1. Get canvas element
    // 2. Create simulation, visualizer, controller
    // 3. Initialize all components
    // 4. Set up animation loop
    // 5. Connect event handlers
  }
  start() { /* Begin animation */ }
}

// Initialize and start (lines 302-307)
const app = new QuantumPlaygroundApp();
app.init().then(() => {
  console.log('Quantum Playground initialized');
  app.start(); // Start animation loop
});
```

### 4. Runtime Animation Loop

```javascript
animate(timestamp) {
  if (!this.running) return;

  // Calculate frame delta
  const elapsed = timestamp - this.lastFrameTime;

  // Physics update (multiple substeps)
  for (let i = 0; i < config.stepsPerFrame; i++) {
    this.simulation.step(); // Evolve wavefunction
  }

  // Render to canvas
  this.visualizer.render(this.simulation.psi);

  // Update UI statistics
  this.controller.updateStats(...);

  // Continue loop
  requestAnimationFrame(this.animate.bind(this));
}
```

---

## UI/UX Structure

### Layout Hierarchy (from HTML/CSS)

```
<body>
  <header>                          # Dark header bar
    <h1>Quantum Particle Playground</h1>
    <p class="subtitle">...</p>
  </header>

  <main>                            # Central content area
    <div class="simulation-wrapper">  # Flex container

      <div class="simulation-container">  # Canvas + overlays
        <canvas id="quantum-canvas">...</canvas>
        <div class="info-overlay">...</div>      # Measurement feedback
        <div class="hover-info">...</div>        # Probability tooltip
      </div>

      <div class="controls-panel">    # User controls
        <div class="control-group">   # Play/Pause/Reset buttons
        <div class="control-group">   # Speed slider
        <div class="control-group">   # Measurement radius slider
        <div class="control-group">   # Visualization mode select
        <div class="control-group">   # Grid toggle checkbox
        <div class="control-group">   # Potential well radio buttons
      </div>

    </div>

    <div class="info-panel">          # Educational info
      <section>Instructions</section>
      <section>Phase Wheel Reference</section>
      <section>Statistics</section>
    </div>
  </main>

  <footer>                            # About & credits
    <details class="about-section">
      <summary>About this simulation</summary>
      <div class="about-content">...</div>
    </details>
  </footer>
</body>
```

### Responsive Design Strategy

**Mobile-first approach** with breakpoints:

- **Base (< 768px)**: Single column, stacked layout
- **Tablet (≥ 768px)**: Canvas + controls side-by-side, 2-column info panel
- **Desktop (≥ 1024px)**: Larger canvas, wider controls
- **Large Desktop (≥ 1400px)**: 4-column info panel

CSS Custom Properties (`--primary-color`, `--spacing-md`, etc.) provide consistent theming.

### User Interaction Points

1. **Canvas Click** → Quantum measurement at click location
2. **Canvas Hover** → Display probability at cursor position
3. **Play/Pause Button** → Toggle simulation evolution
4. **Reset Button** → Reinitialize wavefunction
5. **Speed Slider** → Adjust time evolution rate (0.01x - 1.0x)
6. **Measurement Radius Slider** → Size of measurement region
7. **Visualization Mode Dropdown** → Switch rendering modes
8. **Show Grid Checkbox** → Toggle grid overlay
9. **Potential Well Radio** → Select potential configuration
10. **Keyboard Shortcuts** → Space (play/pause), R (reset), Esc (close overlay)

### Accessibility Features

- ARIA labels on interactive elements
- Semantic HTML structure
- Keyboard navigation support
- Focus indicators (`outline: 2px solid var(--accent-color)`)
- Touch-friendly target sizes (min 44px)
- Reduced motion support (`@media (prefers-reduced-motion: reduce)`)
- High contrast mode support

---

## Technology Stack

### Core Technologies

| Technology | Purpose | Notes |
|------------|---------|-------|
| **HTML5** | Structure & semantic markup | Modern semantic elements |
| **CSS3** | Styling & responsive layout | Custom properties, Grid, Flexbox |
| **JavaScript ES6+** | Application logic | Modules, classes, async/await |
| **Canvas 2D API** | Graphics rendering | RGB pixel manipulation |

### Language Features Used

**JavaScript ES6+ Features:**
- ES6 Modules (`import`/`export`)
- Classes and inheritance
- Arrow functions
- Destructuring
- Template literals
- `async`/`await`
- `let`/`const` block scoping
- Spread operator
- Default parameters

**No External Frameworks:**
- ✅ Pure vanilla JavaScript
- ✅ No npm dependencies for production
- ✅ No build/transpile step required
- ✅ Direct browser execution

### Browser APIs

- `requestAnimationFrame()` for smooth animation
- Canvas 2D Context (`getContext('2d')`)
- DOM Events (click, mousemove, keyboard)
- `addEventListener()` for event handling
- `Float64Array` / `Float32Array` for typed arrays
- `ImageData` for pixel manipulation

### Mathematical Libraries

- **Custom FFT Implementation** (`lib/fft.js`)
  - Cooley-Tukey radix-2 algorithm
  - 1D FFT + row-column decomposition for 2D
  - Complex number support

- **Custom Utilities** (`js/utils.js`)
  - Complex number arithmetic
  - Grid data structures
  - Coordinate transformations
  - Physics calculations

### Browser Compatibility

**Requirements:**
- ES6 module support
- Canvas 2D API
- CSS Grid & Flexbox

**Minimum Versions:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## Build & Deployment Approach

### Build System: **None Required**

This project uses a **zero-build** approach:

✅ **No compilation step**
- Direct ES6 module loading
- Native browser module support
- No Webpack, Rollup, or Parcel needed

✅ **No transpilation**
- Modern JavaScript only
- Target browsers support ES6+
- No Babel required

✅ **No package manager for production**
- No npm/yarn dependencies
- All code is custom or included
- Self-contained application

### Development Workflow

**Local Development:**
```bash
# Option 1: Direct file opening
open index.html

# Option 2: Simple HTTP server (recommended for CORS)
python3 -m http.server 8000
# Then visit: http://localhost:8000

# Option 3: Node-based server
npx serve
```

**Why HTTP server is recommended:**
- ES6 modules require HTTP(S) protocol (not `file://`)
- CORS restrictions prevent local module loading from `file://` URLs
- Any simple static server works

### Deployment Strategy

**Static Site Hosting:**

The entire application is static files, deployable to:
- GitHub Pages
- Netlify
- Vercel
- AWS S3 + CloudFront
- Any static web hosting

**Deployment steps:**
1. Upload all files maintaining directory structure
2. Ensure `index.html` is at root
3. Configure server to serve with correct MIME types:
   - `.js` → `text/javascript`
   - `.css` → `text/css`
   - `.html` → `text/html`

**No server-side processing required:**
- All computation happens in browser
- No backend API needed
- Pure client-side application

### Performance Considerations

**Optimization Strategies:**
- Typed arrays (`Float64Array`) for numerical performance
- In-place FFT operations (no memory allocation in loop)
- Canvas pixel manipulation via `ImageData`
- `requestAnimationFrame()` for vsync-aligned rendering
- Adjustable `stepsPerFrame` for performance tuning

**Typical Performance:**
- 128×128 grid: ~60 FPS on modern hardware
- 256×256 grid: May require speed adjustment
- FFT complexity: O(N² log N) per timestep

### Production Optimizations (Optional)

While not currently implemented, production deployments could add:

- **Minification**: Reduce file sizes (e.g., Terser for JS, cssnano for CSS)
- **Gzip/Brotli**: Server-side compression
- **CDN**: Content delivery network for global distribution
- **Service Worker**: Offline capability
- **Code Splitting**: Lazy load visualization modes (future enhancement)

**Current Total Size (unminified):**
- HTML: ~10 KB
- CSS: ~18 KB
- JavaScript: ~100 KB (all modules)
- **Total: ~128 KB** (very lightweight)

---

## Data Flow Architecture

### State Management

**Single Source of Truth:**
```javascript
// In QuantumSimulation (quantum.js)
this.psi = ComplexGrid(N, N);     // Wavefunction state
this.time = 0;                     // Simulation time
this.potential = PotentialWell();  // Potential configuration
```

**State Updates:**
```
User Input → Controller → Simulation → Visualizer → Canvas
    ↓            ↓            ↓            ↓
  Events → Event Handlers → Physics → Rendering → Display
```

### Event Flow Example: Click to Measure

```
1. User clicks canvas
   ↓
2. Canvas 'click' event fires
   ↓
3. Controller.handleCanvasClick()
   - Convert pixel → grid coordinates
   - Call simulation.performMeasurement(x, y, radius)
   ↓
4. QuantumSimulation.performMeasurement()
   - Calculate probability P = |ψ(x,y)|²
   - Perform probabilistic measurement (Born rule)
   - Collapse wavefunction
   - Renormalize
   ↓
5. Controller displays result
   - Show "Particle found!" or "Not found at this location"
   ↓
6. Next animation frame renders new wavefunction
```

---

## Key Design Patterns

### 1. **Module Pattern (ES6)**
Clean separation via ES6 modules with explicit exports/imports.

### 2. **Class-Based OOP**
```javascript
class QuantumSimulation { ... }  // Model
class Visualizer { ... }          // View
class Controller { ... }          // Controller
```

### 3. **Strategy Pattern**
Multiple visualization modes and potential wells:
```javascript
visualizer.setMode('probability');
simulation.setPotential('double-well');
```

### 4. **Observer Pattern** (implicit)
Controller observes user events, updates model, triggers view refresh.

### 5. **Facade Pattern**
`QuantumPlaygroundApp` provides simplified interface to complex subsystems.

---

## Extension Points

The architecture supports future enhancements:

### Current Extension Mechanisms

1. **Potential Wells** (`quantum.js`)
   - Add new potential types in `createPotentialWell()`
   - Implement custom `getPotential(x, y)` methods

2. **Visualization Modes** (`visualization.js`)
   - Add cases to `render()` method
   - Implement new color mapping functions

3. **Controls** (`controls.js`)
   - Add new UI elements in HTML
   - Register event handlers in `setupEventListeners()`

4. **Physics Parameters** (`main.js`)
   - Adjust `config` object for different behaviors
   - Grid size, time step, initial conditions

### Planned Enhancements (from design docs)

- Multiple particles and entanglement
- Momentum space measurements
- Different boundary conditions (hard walls, absorbing)
- Animation recording/playback
- Game mechanics (puzzles, challenges)
- Presets for educational scenarios

---

## Documentation Ecosystem

### User-Facing Documentation
- **README.md**: Getting started, features, controls
- **index.html** (footer): In-app physics explanations

### Developer Documentation
- **ROOT_ARCHITECTURE.md** (this file): Project structure overview
- **QUANTUM-ENGINE-README.md**: Detailed physics implementation
- **UTILITIES_README.md**: Utils library API reference
- **BOUNDARY_CONDITIONS.md**: Boundary condition explanations

### Development Notes
- **BUILD_SUMMARY.md**: Build process notes
- **initial-design.md**: Original specification (25KB design doc)

### Test Files
- `test-quantum.js`: Physics validation
- `test-integrated-measurement.js`: Measurement testing
- `boundary-check.js`: Boundary condition verification
- `test-utils.html`: Browser-based utility tests

---

## Summary

**Quantum Particle Playground** is a well-architected, educational web application demonstrating quantum mechanics principles through interactive simulation. The project exemplifies modern web development best practices:

✅ **Clean Architecture**: MVC pattern with clear separation of concerns
✅ **Modern JavaScript**: ES6 modules, classes, no legacy code
✅ **Zero-Build Deployment**: Direct browser execution, no compilation
✅ **Responsive Design**: Mobile-first CSS, accessible interface
✅ **Educational Focus**: Rich documentation, in-app explanations
✅ **Extensible Design**: Clear extension points for future features
✅ **Performance Optimized**: Efficient algorithms, typed arrays
✅ **Self-Contained**: No external dependencies, ~128KB total size

The application successfully bridges the gap between complex quantum physics and accessible web-based education, providing an interactive learning experience that runs entirely in the browser.
