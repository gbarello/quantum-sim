# Quantum Simulation Refactoring Plan

**Document Purpose:** Detailed architectural changes needed to support:
1. Independent control of spatial resolution (dx) from grid size
2. Future multi-particle and multi-processing capabilities

**Author:** Analysis based on current codebase structure
**Date:** 2025-12-23
**Status:** Planning Phase - No Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Feature 1: Independent Spatial Resolution](#feature-1-independent-spatial-resolution)
4. [Feature 2: Multi-particle and Multi-processing Support](#feature-2-multi-particle-and-multi-processing-support)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Testing Strategy](#testing-strategy)
7. [Migration Guide](#migration-guide)

---

## Executive Summary

### Current Limitations

**Problem 1: Coupled dx and gridSize**
- `dx = domainSize / gridSize` is derived, not configurable
- Changing grid resolution changes physical behavior
- Cannot easily scale simulation without affecting physics
- Difficult to compare same physical setup at different resolutions

**Problem 2: Single-particle, monolithic architecture**
- One QuantumSimulation instance handles one particle
- No clean separation between physics logic and state
- Tightly coupled components difficult to parallelize
- Not extensible to multi-particle systems

### Proposed Solutions

**Solution 1: Invert the dx-gridSize relationship**
- Make `dx` a primary configuration parameter (physical step size)
- Calculate `domainSize = gridSize × dx` (derived)
- Allow users to scale gridSize independently while maintaining physics
- Preserve numerical stability conditions relative to dx

**Solution 2: Modular, worker-ready architecture**
- Separate simulation state from simulation logic
- Create abstract interfaces for physics operators
- Design message-passing API for Web Workers
- Support both domain decomposition and particle decomposition

### Impact Assessment

| Component | Impact Level | Effort | Risk |
|-----------|-------------|--------|------|
| quantum.js | High | Medium | Low |
| main.js | Medium | Low | Low |
| visualization/ | Low | Low | Low |
| controls/ | Medium | Medium | Low |
| utils.js | Low | Low | Low |
| Tests | High | High | Medium |

**Total Estimated Effort:** 2-3 weeks for Feature 1, 4-6 weeks for Feature 2

---

## Current Architecture Analysis

### How dx is Currently Determined

**Configuration Flow:**
```
main.js:
  config.domainSize = 10.0        (fixed)
  config.gridSize = 128           (power of 2)
  dx = domainSize / gridSize      (calculated: 0.078125)
    ↓
QuantumSimulation(gridSize, dx, ...)
```

**Problem:** To maintain the same physical behavior (same wavelengths, wavepacket sizes) while changing resolution:
- Currently: Change gridSize → dx changes → physics changes → apparent behavior changes
- Desired: Change gridSize → dx stays same → domainSize adjusts → behavior preserved

### Current Parameter Dependencies

```
Physics Parameters:
  λ_deBroglie = h/p                    (momentum → wavelength)
  wavepacket_width = σ                 (in physical units)
  potential_width = domainSize/4       (scales with domain!)
  stability: dt < 2m·dx²/ℏ            (depends on dx)

Visualization:
  canvas_to_grid: pixel → gridIndex
  grid_to_physical: gridIndex → x = gridIndex × dx

Current coupling:
  gridSize ↔ dx ↔ domainSize
  All three are interdependent
```

### Tight Coupling Points

**1. QuantumSimulation Constructor** (`quantum.js:31-102`)
```javascript
constructor(gridSize, dx, dt, ...) {
    this.gridSize = gridSize;
    this.dx = dx;
    this.domainSize = gridSize * dx;  // Derived, but not primary design focus
    // ...
}
```
- Accepts both gridSize and dx
- Calculates domainSize as product
- **Issue:** domainSize used for potential calculations but not treated as flexible

**2. Potential Precomputation** (`quantum.js:142-221`)
```javascript
_precomputePotential() {
    const sigma = this.potentialWidth;
    // this.potentialWidth = this.domainSize / 4  (line 87)
    // Potential features scale with domainSize
    // Problem: If gridSize changes but dx stays same, potential features scale
}
```
- **Issue:** Potential well sizes scale with domainSize, not with physical units

**3. Initial Conditions** (`quantum.js:251-317`)
```javascript
initialize(params = {}) {
    const {
        centerX = this.gridSize / 2,  // Grid coordinates
        width = 3 * this.dx,           // Physical units
        momentumX = 0,
        // ...
    } = params;
}
```
- **Mixed units:** Position in grid coordinates, width in physical coordinates
- **Issue:** Not clear what "3 * this.dx" means physically - depends on current dx

**4. Visualization Scaling** (`visualization/panels/WavefunctionPanel.js`)
```javascript
// Maps grid cells to canvas pixels
const cellWidth = this.bounds.width / gridSize;
const cellHeight = this.bounds.height / gridSize;
```
- **Issue:** Canvas scaling based only on gridSize, not physical size
- When domainSize changes, visualization doesn't reflect physical scale

---

## Feature 1: Independent Spatial Resolution

### Goal

Enable users to:
1. Set `dx` as a primary physical parameter (e.g., "spatial resolution = 0.1 natural units")
2. Set `gridSize` independently (computational resolution)
3. Have `domainSize` automatically adjust: `domainSize = gridSize × dx`
4. Maintain consistent physical behavior when changing gridSize (if dx is fixed)

### Benefits

- **Reproducibility:** Same physics at different resolutions for convergence testing
- **Performance tuning:** Easy to scale resolution up/down without changing setup
- **Physical intuition:** dx represents real physical scale, not derived value
- **Documentation:** Clearer what parameters mean physically

### Required Changes

#### 1. Configuration Schema Update

**File:** `js/main.js`

**Current:**
```javascript
const config = {
  gridSize: 128,
  domainSize: 10.0,        // Primary parameter
  // dx calculated as domainSize / gridSize
};
```

**Proposed:**
```javascript
const config = {
  gridSize: 128,           // Computational resolution (must be power of 2)
  dx: 0.078,               // Primary: physical spatial step size
  // domainSize calculated as gridSize × dx = 10.0

  // Physics constants
  hbar: 1.0,
  mass: 1.0,

  // Derived stability limit (for validation):
  // dt_max = 2 × mass × dx² / hbar
};
```

**Benefits:**
- dx is now explicit and primary
- Easy to understand physical scale
- Can change gridSize without config file updates

**Migration:**
- Existing configs: Calculate dx = domainSize / gridSize, use that as new primary value
- Validation: Warn if user specifies both domainSize and dx that don't match

#### 2. QuantumSimulation Constructor Refactoring

**File:** `js/quantum.js`

**Current Signature:**
```javascript
constructor(gridSize, dx, dt, hbar, mass, boundaryCondition, timeScale)
```

**Proposed Approach A (Minimal change):**
```javascript
constructor(gridSize, dx, dt, hbar = 1.0, mass = 1.0, boundaryCondition = 'periodic', timeScale = 1.0) {
    // Validate inputs
    if ((gridSize & (gridSize - 1)) !== 0) {
        throw new Error('Grid size must be a power of 2 for FFT');
    }

    this.gridSize = gridSize;
    this.dx = dx;                      // Primary parameter
    this.domainSize = gridSize * dx;   // Derived from gridSize × dx

    // Rest unchanged...
}
```
- **Minimal disruption:** Signature unchanged, just clarify that domainSize is derived
- **Change:** Remove domainSize from being a design parameter
- **Document:** Make it clear dx is the fundamental scale

**Proposed Approach B (Config object):**
```javascript
constructor(config = {}) {
    const {
        gridSize,
        dx,
        dt,
        hbar = 1.0,
        mass = 1.0,
        boundaryCondition = 'periodic',
        timeScale = 1.0
    } = config;

    // Validate required params
    if (!gridSize || !dx || !dt) {
        throw new Error('gridSize, dx, and dt are required parameters');
    }

    // Validate gridSize is power of 2
    if ((gridSize & (gridSize - 1)) !== 0) {
        throw new Error('Grid size must be a power of 2 for FFT');
    }

    // Set primary parameters
    this.gridSize = gridSize;
    this.dx = dx;
    this.dt = dt;

    // Calculate derived parameters
    this.domainSize = gridSize * dx;

    // Continue initialization...
}
```
- **Benefits:**
  - Clearer parameter roles
  - Easier to extend in future
  - Named parameters more maintainable
- **Migration cost:** All call sites need updating

**Recommendation:** Use Approach A for now (minimal change), migrate to Approach B when doing Feature 2 refactoring.

#### 3. Potential Energy Scaling

**File:** `js/quantum.js:142-221`

**Current Issue:**
```javascript
this.potentialWidth = this.domainSize / 4;  // Scales with domain!

// In _precomputePotential():
const sigma = this.potentialWidth;
// Potential well at domain center:
const centerX = this.domainSize / 2;
const centerY = this.domainSize / 2;
```

**Problem:** If user doubles gridSize (keeping dx same), domainSize doubles, and:
- Potential well center moves
- Potential well becomes wider
- Completely different physical system!

**Solution: Fixed Physical Scales**

```javascript
constructor(config) {
    // ...
    this.domainSize = gridSize * dx;  // Derived

    // CHANGE: Potential parameters in absolute physical units
    this.potentialWidth = 2.0;  // Fixed physical width (natural units)
    this.potentialStrength = 50.0;
    this.potentialCenterX = 5.0;  // Fixed physical position
    this.potentialCenterY = 5.0;  // Fixed physical position

    // Or: Specify as fraction of reference scale
    this.referenceLength = 10.0;  // Reference physical scale
    this.potentialWidth = 0.2 * this.referenceLength;  // 20% of reference
}

_precomputePotential() {
    const N = this.gridSize;
    const sigma = this.potentialWidth;  // Now fixed physical size

    for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
            const x = ix * this.dx;  // Physical position
            const y = iy * this.dx;

            switch (this.potentialType) {
                case 'single':
                    // Use fixed physical center
                    const centerX = this.potentialCenterX;
                    const centerY = this.potentialCenterY;

                    // Distance with periodic boundaries
                    let dx_single = Math.abs(x - centerX);
                    let dy_single = Math.abs(y - centerY);

                    // Wrap around using domainSize
                    if (dx_single > this.domainSize / 2)
                        dx_single = this.domainSize - dx_single;
                    if (dy_single > this.domainSize / 2)
                        dy_single = this.domainSize - dy_single;

                    const r2 = dx_single * dx_single + dy_single * dy_single;
                    V = -this.potentialStrength * Math.exp(-r2 / (2 * sigma * sigma));
                    break;

                case 'double':
                    // Use fixed physical positions
                    const well1Y = 3.33;  // Fixed positions in natural units
                    const well2Y = 6.67;
                    // ... similar approach
                    break;
            }

            this.potential[iy * N + ix] = V * this.potentialStrengthScale;
        }
    }
}
```

**Key Changes:**
1. Potential features specified in absolute physical units
2. Centers at fixed physical positions (not fractions of domainSize)
3. Widths in fixed physical units (not fractions of domainSize)
4. Periodic boundary wrapping still uses domainSize (correct)

**Configuration Addition:**
```javascript
// In main.js or potential configuration:
potentialConfig: {
    type: 'single',
    centerX: 5.0,      // Physical coordinates
    centerY: 5.0,
    width: 2.0,        // Physical width
    strength: 50.0
}
```

**Alternative Approach: Center-referenced scaling**
```javascript
// For users who want potential to stay centered
this.potentialCenterX = this.domainSize / 2;  // Always center
this.potentialCenterY = this.domainSize / 2;
this.potentialWidth = 2.0;  // But fixed absolute width
```

This keeps well centered but doesn't scale its width.

#### 4. Initial Conditions Clarification

**File:** `js/quantum.js:251-317`

**Current Issue:**
```javascript
initialize(params = {}) {
    const {
        centerX = this.gridSize / 2,    // Grid indices
        centerY = this.gridSize / 2,
        width = 3 * this.dx,             // Physical units
        momentumX = 0,                   // Physical units
        momentumY = 0
    } = params;

    // Convert center from grid indices to physical
    const x0 = centerX * this.dx;
    const y0 = centerY * this.dx;
    // ...
}
```

**Problem:** Mixed coordinate systems in parameters
- `centerX, centerY` are grid indices
- `width, momentumX, momentumY` are physical units
- Confusing and error-prone

**Solution: Consistent Physical Units**

```javascript
/**
 * Initialize wavefunction with a Gaussian wavepacket
 *
 * @param {object} params - Initialization parameters in physical units
 *   - centerX: Center X position in physical units (default: domainSize/2)
 *   - centerY: Center Y position in physical units (default: domainSize/2)
 *   - width: Gaussian width σ in physical units (default: domainSize/20)
 *   - momentumX: Initial momentum X component (default: 0)
 *   - momentumY: Initial momentum Y component (default: 0)
 */
initialize(params = {}) {
    const {
        centerX = this.domainSize / 2,   // Physical units
        centerY = this.domainSize / 2,   // Physical units
        width = this.domainSize / 20,    // Physical units (5% of domain)
        momentumX = 0,                   // Physical units
        momentumY = 0                    // Physical units
    } = params;

    const N = this.gridSize;
    const sigma = width;

    console.log('QuantumSimulation.initialize() called with:');
    console.log('  centerX (physical):', centerX, ', centerY (physical):', centerY);
    console.log('  width (physical):', width, ', sigma:', sigma);
    console.log('  momentumX:', momentumX, ', momentumY:', momentumY);

    // Build Gaussian wavepacket
    for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
            // Physical position of this grid point
            const x = ix * this.dx;
            const y = iy * this.dx;

            // Gaussian envelope centered at (centerX, centerY)
            const dx2 = (x - centerX) * (x - centerX);
            const dy2 = (y - centerY) * (y - centerY);
            const amplitude = Math.exp(-(dx2 + dy2) / (4 * sigma * sigma));

            // Phase from momentum: exp(i·p·r/ℏ)
            const phase = (momentumX * x + momentumY * y) / this.hbar;

            // ψ = A × exp(-r²/4σ²) × exp(i·p·r/ℏ)
            const re = amplitude * Math.cos(phase);
            const im = amplitude * Math.sin(phase);

            this.psi.setReIm(ix, iy, re, im);
        }
    }

    // Normalize to unit total probability
    this.renormalize();

    // Reset time
    this.time = 0;
}
```

**Key Changes:**
1. All parameters in physical units (consistent)
2. Default centerX, centerY based on domainSize (always centered)
3. Default width as fraction of domainSize (scales sensibly)
4. Clear documentation of units

**Control Panel Updates:**
```javascript
// In controls/defaultConfig.js:
{
    id: 'initial-x',
    type: 'canvas',
    label: 'Initial Position',
    // Return value should be physical coordinates, not grid indices
    onChange: (value, manager) => {
        // value = {x: 0.5, y: 0.5} (normalized 0-1)
        // Convert to physical coordinates:
        const physicalX = value.x * manager.simulation.domainSize;
        const physicalY = value.y * manager.simulation.domainSize;
        manager.state.initialPosition = {x: physicalX, y: physicalY};
    }
}
```

#### 5. Measurement Radius Physical Units

**File:** `js/quantum.js:412-463`

**Current:**
```javascript
measure(x, y) {
    const sigma = this.measurementRadiusMultiplier * this.dx;
    const x0 = x * this.dx;  // x,y are grid indices
    const y0 = y * this.dx;
    // ...
}
```

**Issues:**
- `measurementRadiusMultiplier` is in units of dx (grid cells)
- When dx changes, physical measurement size changes
- Not intuitive: "radius = 2.5 grid cells" vs "radius = 0.2 natural units"

**Solution:**
```javascript
constructor(config) {
    // ...
    // CHANGE: Measurement radius in physical units
    this.measurementRadius = 0.2;  // Physical radius in natural units
    // Not "multiplier × dx"
}

setMeasurementRadius(radius) {
    // Radius in physical units
    this.measurementRadius = Math.max(0.05, Math.min(2.0, radius));
}

measure(x, y) {
    // x, y should be in physical coordinates now
    const sigma = this.measurementRadius;  // Already physical units
    const x0 = x;  // Physical coordinate
    const y0 = y;  // Physical coordinate

    const N = this.gridSize;
    let integratedProbability = 0;

    for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
            // Physical position of grid point
            const gridX = ix * this.dx;
            const gridY = iy * this.dx;

            // Distance with periodic boundaries
            let dx = Math.abs(gridX - x0);
            let dy = Math.abs(gridY - y0);

            if (dx > this.domainSize / 2) dx = this.domainSize - dx;
            if (dy > this.domainSize / 2) dy = this.domainSize - dy;

            const r2 = dx * dx + dy * dy;
            const weight = Math.exp(-r2 / (2 * sigma * sigma));

            integratedProbability += weight * this.getProbabilityAt(ix, iy);
        }
    }

    const probability = Math.min(1.0, integratedProbability);
    const random = Math.random();
    const found = random < probability;

    if (found) {
        this.collapsePositive(x, y);
    } else {
        this.collapseNegative(x, y);
    }

    return { found, probability };
}

// Collapse methods also need updating:
collapsePositive(x, y) {
    // x, y are now physical coordinates
    const N = this.gridSize;
    const sigma = this.measurementRadius;

    for (let iy = 0; iy < N; iy++) {
        for (let ix = 0; ix < N; ix++) {
            const gridX = ix * this.dx;
            const gridY = iy * this.dx;

            // Distance with periodic boundaries
            let dx = Math.abs(gridX - x);
            let dy = Math.abs(gridY - y);

            if (dx > this.domainSize / 2) dx = this.domainSize - dx;
            if (dy > this.domainSize / 2) dy = this.domainSize - dy;

            const r2 = dx * dx + dy * dy;
            const weight = Math.exp(-r2 / (2 * sigma * sigma));

            const re = this.psi.getRe(ix, iy);
            const im = this.psi.getIm(ix, iy);
            this.psi.setReIm(ix, iy, re * weight, im * weight);
        }
    }

    this.renormalize();
}

// Similar for collapseNegative()
```

**API Change:**
```javascript
// Before: measure(gridX, gridY) where gridX, gridY are indices
simulation.measure(64, 64);

// After: measure(physX, physY) where physX, physY are physical coordinates
simulation.measure(5.0, 5.0);
```

**Controls Update:**
```javascript
// In ControlsManager:
handleCanvasClick(canvasX, canvasY) {
    // Convert canvas → grid indices
    const gridCoords = this.canvasToGrid(canvasX, canvasY);

    // Convert grid indices → physical coordinates
    const physX = gridCoords.x * this.simulation.dx;
    const physY = gridCoords.y * this.simulation.dy;

    // Call measure with physical coordinates
    const result = this.simulation.measure(physX, physY);
    // ...
}
```

#### 6. Visualization Coordinate System

**File:** `js/visualization/panels/WavefunctionPanel.js`

**Current:**
```javascript
render(ctx, simulation, time) {
    // ...
    for (let py = 0; py < physicalHeight; py++) {
        for (let px = 0; px < physicalWidth; px++) {
            // Map pixel → grid cell (assuming square domain)
            const gx = Math.floor(px / cellWidth);
            const gy = Math.floor(py / cellHeight);

            const complex = simulation.psi.get(gx, gy);
            // ...
        }
    }
}
```

**Issue:** Visualization doesn't show physical scale
- Canvas scales only with grid size
- No indication of physical size changing

**Solution: Add Physical Scale Indicators**

**Option A: No change needed**
- Visualization already correctly maps grid cells to canvas
- Physical scale is implicit in how wavepacket behaves
- **Recommendation:** This is probably fine as-is

**Option B: Add scale indicator**
```javascript
class PhysicalScalePanel extends Panel {
    render(ctx, simulation, time) {
        // Draw scale bar showing physical units
        const domainSize = simulation.domainSize;
        const scaleBarLength = this.bounds.width / 4;  // 1/4 of canvas
        const physicalLength = domainSize / 4;

        // Draw scale bar
        const x = this.bounds.x + 20;
        const y = this.bounds.y + this.bounds.height - 30;

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + scaleBarLength, y);
        ctx.stroke();

        // Label with physical size
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${physicalLength.toFixed(1)} ℏ/√(2m)`,
                     x + scaleBarLength/2, y + 20);
    }
}
```

**Option C: Display domainSize in UI**
```javascript
// Add display control showing current domain size
{
    type: 'display',
    id: 'domain-size',
    label: 'Domain Size',
    getValue: (manager) => {
        return manager.simulation.domainSize.toFixed(2);
    }
}
```

#### 7. Controls System Updates

**File:** `js/controls/defaultConfig.js`

**Changes Needed:**

**A. Add dx control (optional):**
```javascript
{
    type: 'slider',
    id: 'spatial-resolution',
    label: 'Spatial Resolution (dx)',
    min: 0.01,
    max: 0.2,
    step: 0.01,
    defaultValue: 0.078,
    onChange: (value, manager) => {
        // Changing dx requires full reconstruction
        console.warn('Changing dx requires simulation reset');
        manager.state.dx = value;
        // Would need to reinitialize simulation
    }
}
```

**B. Update grid size control:**
```javascript
{
    type: 'select',
    id: 'grid-size',
    label: 'Grid Size (resolution)',
    options: [
        {value: 64, label: '64×64 (Fast)'},
        {value: 128, label: '128×128 (Default)'},
        {value: 256, label: '256×256 (High Quality)'},
        {value: 512, label: '512×512 (Very Slow)'}
    ],
    defaultValue: 128,
    onChange: (value, manager) => {
        // Changing grid size requires reconstruction
        console.log(`Changing grid size to ${value}×${value}`);
        console.log(`Domain size will become: ${value * manager.state.dx}`);
        // Would need to reinitialize simulation with new gridSize
    }
}
```

**C. Measurement radius in physical units:**
```javascript
{
    type: 'slider',
    id: 'measurement-radius',
    label: 'Measurement Radius',
    min: 0.05,
    max: 2.0,
    step: 0.05,
    defaultValue: 0.2,
    unit: 'ℏ/√(2m)',  // Physical units
    onChange: (value, manager) => {
        manager.simulation.setMeasurementRadius(value);
    }
}
```

#### 8. Documentation Updates

**Files to Update:**
- `README.md`: Explain dx as primary parameter
- `CLAUDE.md`: Update parameter descriptions
- `docs/QUANTUM-ENGINE-README.md`: Document coordinate systems clearly
- Inline comments in `quantum.js`

**Example Documentation:**

```markdown
### Spatial Resolution and Grid Size

The simulation uses three related parameters:

- **dx**: Physical spatial step size (primary parameter)
  - Controls the physical resolution of the simulation
  - Determines wavelength resolution: λ_min ≈ 2×dx
  - Affects stability: dt < 2m×dx²/ℏ
  - Unit: [length] (natural units)

- **gridSize**: Number of grid points (computational resolution)
  - Must be a power of 2 for FFT: 64, 128, 256, 512
  - Higher = more computational cost (O(N² log N))
  - Does not affect physics if dx is held constant

- **domainSize**: Physical size of simulation domain (derived)
  - Automatically calculated: domainSize = gridSize × dx
  - Determines periodic boundary locations
  - Unit: [length] (natural units)

**Example:**
- dx = 0.078, gridSize = 128 → domainSize = 10.0
- dx = 0.078, gridSize = 256 → domainSize = 20.0 (same physics, larger domain)
- dx = 0.039, gridSize = 256 → domainSize = 10.0 (same domain, higher resolution)
```

#### 9. Testing and Validation

**New Tests Needed:**

**A. Resolution independence test:**
```javascript
// tests/test-resolution-independence.js
// Test that same physics occurs at different gridSize with fixed dx

const dx = 0.08;
const sim128 = new QuantumSimulation({gridSize: 128, dx, dt: 0.01});
const sim256 = new QuantumSimulation({gridSize: 256, dx, dt: 0.01});

// Initialize both with same physical parameters
const initParams = {
    centerX: 5.0,   // Physical coordinates
    centerY: 5.0,
    width: 0.6,
    momentumX: 1.0,
    momentumY: 0.0
};

sim128.initialize(initParams);
sim256.initialize(initParams);

// Evolve both for same physical time
for (let i = 0; i < 100; i++) {
    sim128.step();
    sim256.step();
}

// Compare wavefunctions at same physical locations
// Should be very similar (within interpolation error)
for (let physX = 0; physX < 10; physX += 0.5) {
    for (let physY = 0; physY < 10; physY += 0.5) {
        const gx128 = Math.floor(physX / dx);
        const gy128 = Math.floor(physY / dx);
        const psi128 = sim128.psi.get(gx128, gy128);

        const gx256 = Math.floor(physX / dx);
        const gy256 = Math.floor(physY / dx);
        const psi256 = sim256.psi.get(gx256, gy256);

        // Should match within tolerance
        const diff = Math.abs(psi128.abs() - psi256.abs());
        assert(diff < 0.01, `Mismatch at (${physX}, ${physY}): ${diff}`);
    }
}
```

**B. Physical units test:**
```javascript
// tests/test-physical-units.js
// Verify all parameters are in correct physical units

const sim = new QuantumSimulation({gridSize: 128, dx: 0.078, dt: 0.01});

// Test 1: Domain size calculation
assert(Math.abs(sim.domainSize - 128 * 0.078) < 1e-10);

// Test 2: Initialize with physical coordinates
sim.initialize({
    centerX: 5.0,  // Should be at physical center
    centerY: 5.0,
    width: 1.0,
    momentumX: 0,
    momentumY: 0
});

// Check wavefunction is centered at correct grid cell
const expectedGridX = Math.floor(5.0 / sim.dx);
const expectedGridY = Math.floor(5.0 / sim.dx);
const maxProb = findMaxProbabilityLocation(sim.psi);
assert(maxProb.x === expectedGridX);
assert(maxProb.y === expectedGridY);

// Test 3: Measurement with physical coordinates
const result = sim.measure(5.0, 5.0);  // Physical coordinates
// Should detect particle near center with high probability
assert(result.probability > 0.5);
```

#### 10. Migration Path

**Step-by-step migration:**

1. **Phase 1: Internal changes (no API breakage)**
   - Update quantum.js to calculate domainSize from gridSize × dx
   - Update potential calculations to use physical units internally
   - Add documentation clarifying coordinate systems
   - **No external API changes yet**

2. **Phase 2: initialize() API update**
   - Change initialize() to accept physical coordinates
   - Update controls to pass physical coordinates
   - Add deprecation warnings for old API
   - **Breaking change but easy to fix**

3. **Phase 3: measure() API update**
   - Change measure() to accept physical coordinates
   - Update all call sites in controls
   - **Breaking change**

4. **Phase 4: Configuration update**
   - Make dx primary parameter in config
   - Update main.js initialization
   - Update documentation
   - **Breaking change for config files**

5. **Phase 5: New controls**
   - Add dx control (optional)
   - Update grid size control with domain size display
   - Update measurement radius control
   - **Pure additions**

**Backward Compatibility Strategy:**

```javascript
// In QuantumSimulation constructor:
constructor(gridSize, dx, dt, hbar, mass, boundaryCondition, timeScale) {
    // Support old API where dx was passed explicitly
    // New API: dx is primary, domainSize is derived

    // Legacy support: if old code passes domainSize, calculate dx
    if (arguments.length === 8 && typeof arguments[1] === 'object') {
        // Old API: constructor(gridSize, {domainSize, dt, ...})
        console.warn('Legacy API detected, please update to use dx parameter');
        const config = arguments[1];
        dx = config.domainSize / gridSize;
    }

    // Proceed with new API
    this.gridSize = gridSize;
    this.dx = dx;
    this.domainSize = gridSize * dx;
    // ...
}
```

---

## Feature 2: Multi-particle and Multi-processing Support

### Goal

Structure the codebase to enable:
1. **Multi-particle simulations**: Simulate N particles with entanglement
2. **Multi-processing**: Distribute computation across Web Workers
3. **Domain decomposition**: Split grid into sub-grids for parallel processing
4. **Particle decomposition**: Assign particles to different workers

### Benefits

- **Performance:** Utilize multi-core CPUs for larger simulations
- **Scalability:** Handle more complex quantum systems
- **Flexibility:** Choose parallelization strategy based on problem
- **Future-proof:** Enable advanced quantum phenomena (entanglement, collisions)

### Current Architectural Barriers

**1. Monolithic QuantumSimulation class**
- Single class handles state + logic + configuration
- Cannot easily split across workers
- No clear interface for composition

**2. Tight coupling of state and logic**
- `psi`, `potential`, operators all owned by QuantumSimulation
- Cannot separate "data" from "computation"
- Difficult to serialize for message passing

**3. Synchronous API**
- All methods are synchronous
- No async/promise-based interface
- Cannot easily wrap in postMessage communication

**4. Global coordinate system**
- Single grid covers entire domain
- No concept of sub-domains or domain boundaries
- FFT requires entire grid at once

**5. Single-particle assumption**
- Wavefunction is ψ(x,y) for one particle
- No support for ψ(x₁,y₁,x₂,y₂) for two particles
- No concept of particle identity or exchange symmetry

### Required Changes

#### 1. Separate State from Logic

**Create SimulationState class:**

**File:** `js/core/SimulationState.js` (new file)

```javascript
/**
 * SimulationState - Pure data container for quantum simulation state
 *
 * Separates state (data) from logic (operators), enabling:
 * - Serialization for Web Workers
 * - State snapshots for undo/history
 * - Multiple states per simulation (multi-particle)
 */
export class SimulationState {
    constructor(config) {
        const {gridSize, particleCount = 1} = config;

        // Grid configuration
        this.gridSize = gridSize;
        this.particleCount = particleCount;

        // Wavefunction storage
        // Single particle: psi[gridSize × gridSize]
        // N particles: psi[gridSize^(2N)] - tensor product space
        if (particleCount === 1) {
            this.psi = new ComplexGrid(gridSize, gridSize);
        } else {
            // Multi-particle: tensor product space
            const totalSize = Math.pow(gridSize, 2 * particleCount);
            this.psi = new Float64Array(totalSize * 2);  // Flat array
        }

        // Potential energy landscape
        this.potential = new Float64Array(gridSize * gridSize);

        // Time tracking
        this.time = 0;

        // Metadata
        this.normalized = true;
        this.totalProbability = 1.0;
    }

    /**
     * Clone this state (deep copy)
     */
    clone() {
        const cloned = new SimulationState({
            gridSize: this.gridSize,
            particleCount: this.particleCount
        });

        if (this.particleCount === 1) {
            cloned.psi.copy(this.psi);
        } else {
            cloned.psi.set(this.psi);
        }

        cloned.potential.set(this.potential);
        cloned.time = this.time;
        cloned.normalized = this.normalized;
        cloned.totalProbability = this.totalProbability;

        return cloned;
    }

    /**
     * Serialize to transferable object for postMessage
     */
    serialize() {
        return {
            gridSize: this.gridSize,
            particleCount: this.particleCount,
            psi: this.particleCount === 1
                ? this.psi.data
                : this.psi,
            potential: this.potential,
            time: this.time,
            normalized: this.normalized,
            totalProbability: this.totalProbability
        };
    }

    /**
     * Deserialize from transferred object
     */
    static deserialize(data) {
        const state = new SimulationState({
            gridSize: data.gridSize,
            particleCount: data.particleCount
        });

        if (data.particleCount === 1) {
            state.psi.data.set(data.psi);
        } else {
            state.psi.set(data.psi);
        }

        state.potential.set(data.potential);
        state.time = data.time;
        state.normalized = data.normalized;
        state.totalProbability = data.totalProbability;

        return state;
    }
}
```

**Key features:**
- Pure data container (no methods that modify state)
- Serializable for Web Workers
- Supports both single and multi-particle
- Cloneable for snapshots/history

#### 2. Create Physics Engine Interface

**File:** `js/core/PhysicsEngine.js` (new file)

```javascript
/**
 * PhysicsEngine - Abstract interface for quantum evolution operators
 *
 * Separates physics algorithms from state storage.
 * Enables different engine implementations:
 * - SplitOperatorEngine (current)
 * - ImaginaryTimeEngine (ground state finding)
 * - ManyBodyEngine (multi-particle)
 * - SubDomainEngine (domain decomposition)
 */
export class PhysicsEngine {
    constructor(config) {
        this.config = config;
    }

    /**
     * Evolve state by one time step
     * @param {SimulationState} state - State to evolve (modified in-place)
     */
    step(state) {
        throw new Error('step() must be implemented by subclass');
    }

    /**
     * Initialize state with given parameters
     * @param {SimulationState} state - State to initialize
     * @param {object} params - Initialization parameters
     */
    initialize(state, params) {
        throw new Error('initialize() must be implemented by subclass');
    }

    /**
     * Perform measurement on state
     * @param {SimulationState} state - State to measure
     * @param {object} params - Measurement parameters
     * @returns {object} Measurement result
     */
    measure(state, params) {
        throw new Error('measure() must be implemented by subclass');
    }
}
```

**Concrete implementation:**

**File:** `js/core/SplitOperatorEngine.js` (new file)

```javascript
import { PhysicsEngine } from './PhysicsEngine.js';
import { FFT2D, normalize } from '../utils.js';

/**
 * SplitOperatorEngine - Current split-operator method
 *
 * Refactored from QuantumSimulation to operate on SimulationState
 */
export class SplitOperatorEngine extends PhysicsEngine {
    constructor(config) {
        super(config);

        const {gridSize, dx, dt, hbar, mass, timeScale} = config;

        this.gridSize = gridSize;
        this.dx = dx;
        this.dt = dt;
        this.hbar = hbar;
        this.mass = mass;
        this.timeScale = timeScale;
        this.dtEffective = dt * timeScale;

        // Create FFT operator
        this.fft = new FFT2D(gridSize, gridSize);

        // Precompute operators
        this._precomputeMomentumOperator();

        // Temporary buffers
        this.psiMomentum = new ComplexGrid(gridSize, gridSize);
    }

    _precomputeMomentumOperator() {
        // Same as current implementation in quantum.js
        // ...
    }

    _precomputePotentialOperator(state) {
        // Compute from state.potential
        // ...
    }

    step(state) {
        // 1. Apply potential (half step)
        this._applyPotential(state, 0.5);

        // 2. FFT to momentum space
        this.psiMomentum.copy(state.psi);
        this.fft.forward(this.psiMomentum);

        // 3. Apply kinetic energy
        this._applyKinetic(this.psiMomentum);

        // 4. IFFT back to position space
        this.fft.inverse(this.psiMomentum);
        state.psi.copy(this.psiMomentum);

        // 5. Apply potential (half step)
        this._applyPotential(state, 0.5);

        // Update time
        state.time += this.dtEffective;
    }

    _applyPotential(state, fraction) {
        // Apply exp(-iV·dt·fraction/ℏ) to state.psi
        // Using state.potential
        // ...
    }

    _applyKinetic(psiMomentum) {
        // Apply exp(-iℏk²·dt/2m) to psiMomentum
        // ...
    }

    initialize(state, params) {
        // Initialize state.psi with Gaussian wavepacket
        // Same logic as current initialize() but operating on state
        // ...
        normalize(state.psi);
        state.time = 0;
        state.normalized = true;
        state.totalProbability = 1.0;
    }

    measure(state, params) {
        // Perform measurement on state.psi
        // Same logic as current measure()
        // ...
    }
}
```

**Benefits:**
- State and logic separated
- Engine can be swapped (different algorithms)
- Engine can be run in worker
- State can be serialized/deserialized independently

#### 3. Refactor QuantumSimulation as Coordinator

**File:** `js/quantum.js` (refactored)

```javascript
import { SimulationState } from './core/SimulationState.js';
import { SplitOperatorEngine } from './core/SplitOperatorEngine.js';

/**
 * QuantumSimulation - High-level API coordinator
 *
 * Wraps SimulationState + PhysicsEngine with convenient API
 * Maintains backward compatibility with existing code
 */
export class QuantumSimulation {
    constructor(gridSize, dx, dt, hbar = 1.0, mass = 1.0,
                boundaryCondition = 'periodic', timeScale = 1.0) {

        // Create configuration
        this.config = {
            gridSize, dx, dt, hbar, mass,
            boundaryCondition, timeScale
        };

        // Create state
        this.state = new SimulationState({
            gridSize,
            particleCount: 1
        });

        // Create engine
        this.engine = new SplitOperatorEngine(this.config);

        // Initialize potential
        this._initializePotential();

        // Expose legacy properties for backward compatibility
        this.gridSize = gridSize;
        this.dx = dx;
        this.dt = dt;
        this.hbar = hbar;
        this.mass = mass;
        this.domainSize = gridSize * dx;
    }

    // Delegate methods to engine:

    step() {
        this.engine.step(this.state);
    }

    initialize(params) {
        this.engine.initialize(this.state, params);
    }

    measure(x, y) {
        return this.engine.measure(this.state, {x, y});
    }

    // Expose state getters:

    get psi() {
        return this.state.psi;
    }

    get potential() {
        return this.state.potential;
    }

    get time() {
        return this.state.time;
    }

    getTime() {
        return this.state.time;
    }

    getProbabilityAt(x, y) {
        return this.state.psi.getAbs2(x, y);
    }

    // ... other legacy methods
}
```

**Benefits:**
- Backward compatible API
- Internally uses modular architecture
- Easy to extend with new engines
- State can be extracted for workers

#### 4. Web Worker Communication Layer

**File:** `js/workers/WorkerInterface.js` (new file)

```javascript
/**
 * WorkerInterface - Async wrapper for QuantumSimulation
 *
 * Provides promise-based API for running simulation in Web Worker
 */
export class WorkerInterface {
    constructor(workerScript = 'js/workers/quantum-worker.js') {
        this.worker = new Worker(workerScript);
        this.messageId = 0;
        this.pendingRequests = new Map();

        // Handle responses from worker
        this.worker.onmessage = (e) => {
            const {id, type, result, error} = e.data;

            const request = this.pendingRequests.get(id);
            if (!request) return;

            this.pendingRequests.delete(id);

            if (error) {
                request.reject(new Error(error));
            } else {
                request.resolve(result);
            }
        };
    }

    /**
     * Send command to worker and await result
     */
    async _sendCommand(command, params = {}) {
        const id = this.messageId++;

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, {resolve, reject});

            this.worker.postMessage({
                id,
                command,
                params
            });
        });
    }

    /**
     * Initialize simulation in worker
     */
    async initialize(config) {
        return this._sendCommand('initialize', config);
    }

    /**
     * Step simulation N times
     */
    async step(count = 1) {
        return this._sendCommand('step', {count});
    }

    /**
     * Get current state from worker
     */
    async getState() {
        const serialized = await this._sendCommand('getState');
        return SimulationState.deserialize(serialized);
    }

    /**
     * Set state in worker
     */
    async setState(state) {
        const serialized = state.serialize();
        return this._sendCommand('setState', serialized);
    }

    /**
     * Perform measurement
     */
    async measure(x, y) {
        return this._sendCommand('measure', {x, y});
    }

    /**
     * Terminate worker
     */
    terminate() {
        this.worker.terminate();
    }
}
```

**File:** `js/workers/quantum-worker.js` (new file)

```javascript
/**
 * quantum-worker.js - Web Worker for quantum simulation
 *
 * Runs physics engine in background thread
 */

import { QuantumSimulation } from '../quantum.js';

let simulation = null;

self.onmessage = function(e) {
    const {id, command, params} = e.data;

    try {
        let result = null;

        switch (command) {
            case 'initialize':
                simulation = new QuantumSimulation(
                    params.gridSize,
                    params.dx,
                    params.dt,
                    params.hbar,
                    params.mass,
                    params.boundaryCondition,
                    params.timeScale
                );

                if (params.initParams) {
                    simulation.initialize(params.initParams);
                }

                result = {success: true};
                break;

            case 'step':
                const count = params.count || 1;
                for (let i = 0; i < count; i++) {
                    simulation.step();
                }
                result = {time: simulation.time};
                break;

            case 'getState':
                result = simulation.state.serialize();
                break;

            case 'setState':
                simulation.state = SimulationState.deserialize(params);
                result = {success: true};
                break;

            case 'measure':
                result = simulation.measure(params.x, params.y);
                break;

            default:
                throw new Error(`Unknown command: ${command}`);
        }

        self.postMessage({
            id,
            type: 'result',
            result
        });

    } catch (error) {
        self.postMessage({
            id,
            type: 'error',
            error: error.message
        });
    }
};
```

**Usage:**

```javascript
// In main.js:
import { WorkerInterface } from './workers/WorkerInterface.js';

class QuantumPlaygroundApp {
    async init() {
        // Create worker instead of direct simulation
        this.worker = new WorkerInterface();

        await this.worker.initialize({
            gridSize: config.gridSize,
            dx: config.dx,
            dt: config.dt,
            hbar: config.hbar,
            mass: config.mass,
            boundaryCondition: config.boundaryCondition,
            timeScale: config.timeScale,
            initParams: {
                centerX: 5.0,
                centerY: 5.0,
                width: 0.6,
                momentumX: 1.0,
                momentumY: 0.0
            }
        });

        // Rest of initialization...
    }

    async mainLoop(currentTime) {
        // ...

        if (this.controlsManager.getState().isPlaying) {
            // Step simulation in worker
            await this.worker.step(config.stepsPerFrame);

            // Get updated state for rendering
            const state = await this.worker.getState();
            this.visualizer.renderState(state);
        }

        // ...
    }
}
```

#### 5. Domain Decomposition Architecture

**Concept:** Split grid into sub-domains, each computed by separate worker

**File:** `js/workers/DomainDecomposition.js` (new file)

```javascript
/**
 * DomainDecomposition - Split grid across multiple workers
 *
 * Strategy:
 * 1. Divide NxN grid into K sub-grids (e.g., 2x2 = 4 workers)
 * 2. Each worker computes its sub-domain
 * 3. Exchange boundary data between workers for FFT
 * 4. Coordinate time evolution across all workers
 */
export class DomainDecomposition {
    constructor(config, workerCount = 4) {
        this.config = config;
        this.workerCount = workerCount;

        // Determine decomposition layout (e.g., 2x2, 1x4, etc.)
        this.layout = this._calculateLayout(workerCount);

        // Create workers
        this.workers = [];
        for (let i = 0; i < workerCount; i++) {
            this.workers.push(new Worker('js/workers/subdomain-worker.js'));
        }

        // Initialize each worker with its sub-domain
        this._initializeWorkers();
    }

    _calculateLayout(count) {
        // For simplicity, assume square decomposition
        const side = Math.sqrt(count);
        if (side !== Math.floor(side)) {
            throw new Error('Worker count must be perfect square for now');
        }
        return {rows: side, cols: side};
    }

    _initializeWorkers() {
        const {rows, cols} = this.layout;
        const subGridSize = this.config.gridSize / rows;

        let workerIndex = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const worker = this.workers[workerIndex];

                worker.postMessage({
                    command: 'initialize',
                    params: {
                        ...this.config,
                        subGridSize,
                        offsetX: col * subGridSize,
                        offsetY: row * subGridSize,
                        neighbors: this._getNeighbors(row, col)
                    }
                });

                workerIndex++;
            }
        }
    }

    _getNeighbors(row, col) {
        // Return indices of neighboring workers for boundary exchange
        const {rows, cols} = this.layout;
        return {
            north: row > 0 ? (row - 1) * cols + col : null,
            south: row < rows - 1 ? (row + 1) * cols + col : null,
            east: col < cols - 1 ? row * cols + (col + 1) : null,
            west: col > 0 ? row * cols + (col - 1) : null
        };
    }

    async step() {
        // 1. Send step command to all workers
        const stepPromises = this.workers.map(worker =>
            this._sendCommand(worker, 'step')
        );

        await Promise.all(stepPromises);

        // 2. Exchange boundary data
        await this._exchangeBoundaries();

        // 3. Continue step (second half after boundary exchange)
        const continuePromises = this.workers.map(worker =>
            this._sendCommand(worker, 'continueStep')
        );

        await Promise.all(continuePromises);
    }

    async _exchangeBoundaries() {
        // Each worker sends boundary data to neighbors
        // This is complex - requires SharedArrayBuffer or message passing
        // Simplified example:

        for (let i = 0; i < this.workers.length; i++) {
            const boundaries = await this._sendCommand(this.workers[i], 'getBoundaries');

            // Send to neighbors
            // (Implementation depends on boundary exchange strategy)
        }
    }
}
```

**Challenges:**
- FFT requires global data (all rows/columns)
- Boundary exchange overhead
- Synchronization complexity
- SharedArrayBuffer may be required

**Alternative: Spectral method decomposition**
- Compute FFT before decomposition (single-threaded)
- Decompose momentum space operations (embarrassingly parallel)
- IFFT after recomposition

#### 6. Multi-Particle System Architecture

**For N distinguishable particles:**

**Wavefunction:** ψ(r₁, r₂, ..., rₙ) where rᵢ = (xᵢ, yᵢ)

**Storage:** Tensor product space
- 1 particle: N² grid points
- 2 particles: N⁴ grid points (128² = 16k → 128⁴ = 268M!)
- 3 particles: N⁶ grid points (infeasible)

**Challenges:**
- Memory explosion (N^(2P) for P particles)
- Computational cost (FFT becomes N^(2P) log N)
- Visualization (cannot show 4D wavefunction directly)

**Solutions:**

**A. Separable states (no entanglement):**
```javascript
class MultiParticleSimulation {
    constructor(config, particleCount) {
        // Each particle has its own independent simulation
        this.particles = [];
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new QuantumSimulation(
                config.gridSize,
                config.dx,
                config.dt,
                config.hbar,
                config.mass
            ));
        }
    }

    step() {
        // Particles evolve independently (no entanglement)
        for (const particle of this.particles) {
            particle.step();
        }

        // Could add interaction potential later:
        // V_interaction(r1, r2) = ...
    }

    // Easy to parallelize: one worker per particle
    async stepParallel() {
        const promises = this.particles.map(p => p.stepAsync());
        await Promise.all(promises);
    }
}
```

**Benefits:**
- Scales linearly with particle count
- Easy to parallelize
- Can visualize each particle separately

**Limitations:**
- No entanglement
- No quantum statistics (bosons/fermions)

**B. Sparse representation (for localized particles):**
```javascript
// Only store non-zero regions of ψ(r₁, r₂)
// If particles are spatially separated, most of the 4D grid is zero
// Use sparse matrix storage
```

**C. Tensor network methods:**
- Advanced: Matrix Product States (MPS)
- Reduces exponential scaling to polynomial
- Complex implementation, research-grade

**Recommendation for initial implementation:**
- Start with separable states (independent particles)
- Add interaction potentials (still separable evolution)
- Later: Consider reduced density matrix for entangled subsystems

#### 7. Parallel Execution Coordinator

**File:** `js/workers/ParallelCoordinator.js` (new file)

```javascript
/**
 * ParallelCoordinator - High-level API for parallel simulation
 *
 * Abstracts away worker management and provides simple API
 */
export class ParallelCoordinator {
    constructor(config) {
        this.config = config;
        this.mode = config.parallelMode || 'single';
        this.backend = null;

        this._createBackend();
    }

    _createBackend() {
        switch (this.mode) {
            case 'single':
                // Single-threaded (current)
                this.backend = new QuantumSimulation(
                    this.config.gridSize,
                    this.config.dx,
                    this.config.dt,
                    this.config.hbar,
                    this.config.mass
                );
                break;

            case 'worker':
                // Single worker (off main thread)
                this.backend = new WorkerInterface();
                break;

            case 'domain':
                // Domain decomposition (multiple workers)
                this.backend = new DomainDecomposition(
                    this.config,
                    this.config.workerCount
                );
                break;

            case 'multi-particle':
                // Multiple particles
                this.backend = new MultiParticleSimulation(
                    this.config,
                    this.config.particleCount
                );
                break;

            default:
                throw new Error(`Unknown parallel mode: ${this.mode}`);
        }
    }

    // Unified API:

    async step(count = 1) {
        if (this.backend.step.constructor.name === 'AsyncFunction') {
            return await this.backend.step(count);
        } else {
            for (let i = 0; i < count; i++) {
                this.backend.step();
            }
        }
    }

    async getState() {
        if (this.backend.getState) {
            return await this.backend.getState();
        } else {
            return this.backend.state;
        }
    }

    async measure(x, y) {
        if (this.backend.measure.constructor.name === 'AsyncFunction') {
            return await this.backend.measure(x, y);
        } else {
            return this.backend.measure(x, y);
        }
    }
}
```

**Usage:**

```javascript
// Easy to switch between modes:

// Single-threaded (current):
const sim = new ParallelCoordinator({
    gridSize: 128,
    dx: 0.078,
    dt: 0.01,
    parallelMode: 'single'
});

// Single worker:
const sim = new ParallelCoordinator({
    gridSize: 128,
    dx: 0.078,
    dt: 0.01,
    parallelMode: 'worker'
});

// Domain decomposition:
const sim = new ParallelCoordinator({
    gridSize: 256,
    dx: 0.078,
    dt: 0.01,
    parallelMode: 'domain',
    workerCount: 4
});

// Multi-particle:
const sim = new ParallelCoordinator({
    gridSize: 128,
    dx: 0.078,
    dt: 0.01,
    parallelMode: 'multi-particle',
    particleCount: 3
});

// All use same API:
await sim.step(10);
const state = await sim.getState();
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Feature 1 Implementation:**

**Week 1: Core refactoring**
- [ ] Update quantum.js to make dx primary, domainSize derived
- [ ] Convert all coordinate parameters to physical units
- [ ] Update initialize() to use physical coordinates
- [ ] Update measure() to use physical coordinates
- [ ] Write unit tests for coordinate conversions

**Week 2: Integration**
- [ ] Update main.js configuration
- [ ] Update controls to pass physical coordinates
- [ ] Add documentation for new coordinate system
- [ ] Update all existing tests
- [ ] Test resolution independence

**Deliverables:**
- ✓ dx is primary parameter
- ✓ All parameters in consistent physical units
- ✓ Tests pass
- ✓ Documentation updated

### Phase 2: State-Logic Separation (Weeks 3-4)

**Feature 2 Preparation:**

**Week 3: Create abstractions**
- [ ] Implement SimulationState class
- [ ] Implement PhysicsEngine interface
- [ ] Implement SplitOperatorEngine
- [ ] Write tests for new architecture

**Week 4: Refactor QuantumSimulation**
- [ ] Refactor QuantumSimulation as coordinator
- [ ] Ensure backward compatibility
- [ ] Update integration tests
- [ ] Performance benchmarks (should be same or better)

**Deliverables:**
- ✓ Modular architecture
- ✓ Backward compatible
- ✓ No performance regression
- ✓ State serializable

### Phase 3: Worker Implementation (Weeks 5-6)

**Week 5: Basic worker**
- [ ] Implement WorkerInterface class
- [ ] Implement quantum-worker.js
- [ ] Add async/await API layer
- [ ] Test single-worker performance

**Week 6: Integration**
- [ ] Update main.js to use worker (optional)
- [ ] Add worker mode toggle in UI
- [ ] Test on various browsers
- [ ] Benchmark single-thread vs worker

**Deliverables:**
- ✓ Working Web Worker implementation
- ✓ Async API functional
- ✓ Performance comparable or better

### Phase 4: Multi-particle (Weeks 7-8)

**Week 7: Separable states**
- [ ] Implement MultiParticleSimulation (separable)
- [ ] Add per-particle visualization
- [ ] Test 2-3 particle systems
- [ ] Add interaction potentials

**Week 8: Polish**
- [ ] Add multi-particle controls
- [ ] Visualization for multiple particles
- [ ] Documentation
- [ ] Example simulations

**Deliverables:**
- ✓ Multi-particle simulation working
- ✓ Particle-based parallelization
- ✓ Visualization for N particles

### Phase 5: Advanced Parallelism (Weeks 9-10+)

**Optional future work:**

**Domain decomposition:**
- [ ] Implement subdomain workers
- [ ] Boundary exchange protocol
- [ ] FFT decomposition strategy
- [ ] Benchmark scaling

**Optimization:**
- [ ] WebAssembly FFT
- [ ] SIMD optimizations
- [ ] GPU.js integration
- [ ] SharedArrayBuffer coordination

---

## Testing Strategy

### Unit Tests

**Feature 1 tests:**
```javascript
describe('Spatial resolution independence', () => {
    test('Same dx, different gridSize gives same physics', () => {
        // Test at gridSize 64, 128, 256 with dx=0.1
        // Check wavefunction evolution matches at same physical points
    });

    test('Physical coordinate conversions', () => {
        // Test grid ↔ physical coordinate conversions
    });

    test('Potential scales correctly', () => {
        // Verify potential features don't change with gridSize
    });
});
```

**Feature 2 tests:**
```javascript
describe('State-engine separation', () => {
    test('State serialization round-trip', () => {
        // Serialize and deserialize state, verify equality
    });

    test('Engine operates on state correctly', () => {
        // Create state, apply engine, verify evolution
    });
});

describe('Worker interface', () => {
    test('Worker initializes correctly', () => {
        // Test async initialization
    });

    test('Worker step produces correct results', () => {
        // Compare worker results to single-thread
    });
});
```

### Integration Tests

```javascript
describe('Full simulation with workers', () => {
    test('Worker simulation matches single-thread', () => {
        // Run same simulation in both modes
        // Compare final states
    });

    test('Multi-particle system evolves correctly', () => {
        // Test 2-particle system
        // Verify separable evolution
    });
});
```

### Performance Benchmarks

```javascript
describe('Performance', () => {
    benchmark('Single-thread 128x128', () => {
        // Time 1000 steps
    });

    benchmark('Worker 128x128', () => {
        // Time 1000 steps in worker
    });

    benchmark('Multi-particle 3 particles', () => {
        // Time 1000 steps with 3 particles
    });
});
```

---

## Migration Guide

### For Existing Code

**Step 1: Update configuration**

Before:
```javascript
const config = {
    gridSize: 128,
    domainSize: 10.0
};
const dx = config.domainSize / config.gridSize;
```

After:
```javascript
const config = {
    gridSize: 128,
    dx: 0.078  // Primary parameter now
    // domainSize = gridSize * dx (calculated automatically)
};
```

**Step 2: Update initialization**

Before:
```javascript
simulation.initialize({
    centerX: 64,  // Grid indices
    centerY: 64,
    width: 0.6,
    momentumX: 1.0,
    momentumY: 0.0
});
```

After:
```javascript
simulation.initialize({
    centerX: 5.0,  // Physical coordinates
    centerY: 5.0,
    width: 0.6,
    momentumX: 1.0,
    momentumY: 0.0
});
```

**Step 3: Update measurement calls**

Before:
```javascript
const gridX = 64;
const gridY = 64;
simulation.measure(gridX, gridY);
```

After:
```javascript
const physX = 5.0;  // Physical coordinates
const physY = 5.0;
simulation.measure(physX, physY);
```

**Step 4: Optional - Use workers**

```javascript
// Instead of direct simulation:
import { WorkerInterface } from './workers/WorkerInterface.js';

const worker = new WorkerInterface();
await worker.initialize(config);

// Use async API:
await worker.step(5);
const state = await worker.getState();
```

### Backward Compatibility

**Compatibility layer:**
```javascript
class QuantumSimulationLegacy extends QuantumSimulation {
    initialize(params) {
        // Detect if params use old API (grid indices)
        if (params.centerX < this.gridSize &&
            params.centerY < this.gridSize &&
            params.width < 1) {
            // Legacy API detected
            console.warn('Legacy API: converting grid indices to physical coords');
            const newParams = {
                centerX: params.centerX * this.dx,
                centerY: params.centerY * this.dx,
                width: params.width * this.domainSize,
                momentumX: params.momentumX,
                momentumY: params.momentumY
            };
            return super.initialize(newParams);
        }

        // New API
        return super.initialize(params);
    }

    measure(x, y) {
        // Detect if x, y are grid indices or physical coords
        if (x < this.gridSize && y < this.gridSize) {
            // Legacy API: grid indices
            console.warn('Legacy API: converting grid indices to physical coords');
            return super.measure(x * this.dx, y * this.dx);
        }

        // New API: physical coordinates
        return super.measure(x, y);
    }
}
```

---

## Risk Assessment

### Low Risk Changes
- ✓ Making dx primary parameter (minimal code change)
- ✓ Updating documentation
- ✓ Adding new utility functions

### Medium Risk Changes
- ⚠ Changing initialize() API (affects all call sites)
- ⚠ Changing measure() API (affects controls)
- ⚠ Refactoring to state-engine architecture (large refactor but well-defined)

### High Risk Changes
- ⚠⚠ Domain decomposition (complex synchronization)
- ⚠⚠ Multi-particle tensor spaces (memory explosion)
- ⚠⚠ SharedArrayBuffer (browser compatibility issues)

### Mitigation Strategies
1. **Incremental rollout:** Implement features one at a time
2. **Comprehensive testing:** Unit + integration tests for each phase
3. **Backward compatibility:** Maintain legacy API during transition
4. **Performance monitoring:** Benchmark at each step
5. **Fallback options:** Allow disabling workers if issues arise

---

## Conclusion

### Summary of Changes

**Feature 1: Independent dx**
- **Impact:** Medium (mostly internal changes)
- **Effort:** 2 weeks
- **Risk:** Low
- **Benefit:** High (better physical intuition, easier scaling)

**Feature 2: Multi-particle/processing**
- **Impact:** High (architectural overhaul)
- **Effort:** 6-8 weeks
- **Risk:** Medium
- **Benefit:** Very High (enables advanced features, performance)

### Recommended Approach

1. **Phase 1:** Implement Feature 1 first (weeks 1-2)
   - Establishes physical units as foundation
   - Low risk, high benefit
   - Enables better testing of Feature 2

2. **Phase 2-3:** Implement state-logic separation and workers (weeks 3-6)
   - Foundational for all parallelism
   - Moderate complexity
   - Immediate performance benefits

3. **Phase 4:** Multi-particle (weeks 7-8)
   - Builds on worker infrastructure
   - Demonstrates extensibility

4. **Phase 5:** Advanced optimizations (optional, ongoing)
   - Domain decomposition
   - WebAssembly
   - GPU acceleration

### Long-term Vision

With these changes, the quantum playground will support:
- ✓ Arbitrary resolution simulations
- ✓ Multi-threaded computation
- ✓ Multiple particles with interactions
- ✓ Extensible physics engines
- ✓ Advanced visualization
- ✓ Research-grade simulations

The architecture will be:
- ✓ Modular and maintainable
- ✓ Performance-scalable
- ✓ Physically intuitive
- ✓ Extensible for future features

---

**End of Document**
