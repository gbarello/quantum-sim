# Quantum Physics Engine Documentation

## Overview

The quantum physics engine (`js/quantum.js`) implements a faithful simulation of quantum mechanics for a free particle in 2D. It solves the time-dependent Schrödinger equation using the split-operator method with FFT-based momentum space evolution.

## Core Features

### Physics Implementation

- **Time-dependent Schrödinger equation**: `iℏ ∂ψ/∂t = -ℏ²/(2m) ∇²ψ`
- **Split-operator method**: Accurate spectral evolution using FFT
- **Unitarity preservation**: Total probability conserved to numerical precision
- **Periodic boundary conditions**: Wavefunction wraps at grid edges (torus topology)
- **Gaussian wavepacket initialization**: With configurable position, width, and momentum
- **Quantum measurements**: Implements Born rule with wavefunction collapse
  - Positive measurement: Collapse to single grid square
  - Negative measurement: Zero out single grid square
  - Automatic renormalization after measurements

### Key Classes

#### `QuantumSimulation`

Main simulation class that encapsulates all quantum evolution and measurement operations.

```javascript
import { QuantumSimulation } from './js/quantum.js';

const sim = new QuantumSimulation(
    gridSize,           // N×N grid (must be power of 2)
    dx,                 // Spatial step size
    dt,                 // Time step
    hbar,               // Reduced Planck constant (default: 1.0)
    mass,               // Particle mass (default: 1.0)
    boundaryCondition,  // 'periodic' (MVP)
    timeScale           // Evolution speed multiplier (default: 1.0)
);
```

## API Reference

### Initialization

#### `constructor(gridSize, dx, dt, hbar, mass, boundaryCondition, timeScale)`

Creates a new quantum simulation instance.

**Parameters:**
- `gridSize` (number): Grid dimension N for N×N grid. Must be power of 2 (e.g., 64, 128, 256)
- `dx` (number): Spatial step size in arbitrary units
- `dt` (number): Time step for evolution. Must satisfy stability: `dt < 2m·dx²/ℏ`
- `hbar` (number, optional): Reduced Planck constant. Default: 1.0 (natural units)
- `mass` (number, optional): Particle mass. Default: 1.0 (natural units)
- `boundaryCondition` (string, optional): Boundary type. Default: 'periodic'
- `timeScale` (number, optional): Evolution speed multiplier. Default: 1.0

**Stability Condition:**
The time step must satisfy `dt·timeScale < 2m·dx²/ℏ` for numerical stability. The constructor will warn if this is violated.

**Example:**
```javascript
const sim = new QuantumSimulation(128, 0.1, 0.005);
```

#### `initialize(params)`

Initialize wavefunction with a Gaussian wavepacket.

**Parameters (all optional):**
- `centerX` (number): Center position X in grid coordinates. Default: gridSize/2
- `centerY` (number): Center position Y in grid coordinates. Default: gridSize/2
- `width` (number): Gaussian width σ. Default: 3·dx
- `momentumX` (number): Initial momentum in X. Default: 0
- `momentumY` (number): Initial momentum in Y. Default: 0

**Gaussian formula:**
```
ψ(x,y,0) = A exp(-(x-x₀)²/4σ² - (y-y₀)²/4σ²) exp(i(px·x + py·y)/ℏ)
```

**Example:**
```javascript
sim.initialize({
    centerX: 30,
    centerY: 30,
    width: 2.0,
    momentumX: 1.0,
    momentumY: 0.5
});
```

### Time Evolution

#### `step()`

Evolve the wavefunction by one time step using the split-operator method.

**Algorithm:**
1. Forward FFT: Transform to momentum space `ψ(x) → ψ̃(k)`
2. Apply kinetic evolution: `ψ̃(k) → exp(-iℏk²Δt/2m) ψ̃(k)`
3. Inverse FFT: Transform back `ψ̃(k) → ψ(x)`

**Properties:**
- Preserves unitarity (total probability = 1)
- Updates internal time by `dt·timeScale`
- Computationally efficient: O(N² log N)

**Example:**
```javascript
// Evolve for 100 time steps
for (let i = 0; i < 100; i++) {
    sim.step();
}
```

### Quantum Measurements

#### `measure(x, y)`

Perform a quantum measurement at grid position (x, y) following the Born rule.

**Parameters:**
- `x` (number): Grid x-coordinate
- `y` (number): Grid y-coordinate

**Returns:**
Object with properties:
- `found` (boolean): true if particle found at (x,y), false otherwise
- `probability` (number): |ψ(x,y)|² before measurement

**Behavior:**
1. Calculate measurement probability P = |ψ(x,y)|²
2. Generate random number r ∈ [0,1]
3. If r < P: Positive result (particle found) → `collapsePositive(x, y)`
4. If r ≥ P: Negative result (not found) → `collapseNegative(x, y)`

**Example:**
```javascript
const result = sim.measure(32, 32);
if (result.found) {
    console.log(`Found! (probability was ${result.probability.toFixed(4)})`);
} else {
    console.log(`Not found (probability was ${result.probability.toFixed(4)})`);
}
```

#### `collapsePositive(x, y)`

Collapse wavefunction to single grid square (positive measurement result).

**Effect:**
- Sets ψ(x',y') = 0 for all (x',y') ≠ (x,y)
- Keeps ψ(x,y) unchanged
- Renormalizes to unit probability

**Physical meaning:** "Particle found at position (x,y)"

#### `collapseNegative(x, y)`

Zero out single grid square (negative measurement result).

**Effect:**
- Sets ψ(x,y) = 0
- Keeps all other positions unchanged
- Renormalizes remaining wavefunction

**Physical meaning:** "Particle NOT found at position (x,y)"

### Query Methods

#### `getProbabilityAt(x, y)`

Get probability density |ψ(x,y)|² at a specific grid point.

**Returns:** (number) Probability at position (x,y)

**Example:**
```javascript
const prob = sim.getProbabilityAt(32, 32);
console.log(`Probability at center: ${prob.toFixed(6)}`);
```

#### `getProbabilityDensity()`

Get probability density |ψ|² for entire grid.

**Returns:** (Float64Array) Flattened 2D array of probabilities, length N×N

**Index mapping:** `density[y * gridSize + x]` = |ψ(x,y)|²

**Example:**
```javascript
const density = sim.getProbabilityDensity();
const centerProb = density[32 * sim.gridSize + 32];
```

#### `getPhase()`

Get phase arg(ψ) for entire grid.

**Returns:** (Float64Array) Flattened 2D array of phases in radians [-π, π]

**Index mapping:** `phase[y * gridSize + x]` = arg(ψ(x,y))

**Example:**
```javascript
const phase = sim.getPhase();
const centerPhase = phase[32 * sim.gridSize + 32];
```

#### `getTotalProbability()`

Get total probability (should be ~1 when normalized).

**Returns:** (number) ∑|ψ|² over all grid points

**Use:** Monitor numerical accuracy. Should remain ≈ 1.0 during evolution.

**Example:**
```javascript
const totalProb = sim.getTotalProbability();
if (Math.abs(totalProb - 1.0) > 1e-6) {
    console.warn('Normalization error:', totalProb);
}
```

#### `getWavefunction()`

Get direct access to wavefunction ComplexGrid.

**Returns:** (ComplexGrid) The wavefunction ψ(x,y)

**Use:** Advanced operations, direct grid manipulation

#### `getTime()`

Get current simulation time.

**Returns:** (number) Time in simulation units

### Utility Methods

#### `renormalize()`

Explicitly renormalize wavefunction to unit total probability.

**Effect:** Scales ψ → ψ/√(∑|ψ|²)

**Note:** Called automatically after measurements. Manual use rarely needed.

#### `reset(params)`

Reset simulation to initial state.

**Parameters:** Same as `initialize(params)`

**Example:**
```javascript
sim.reset(); // Reset to default Gaussian
sim.reset({ centerX: 20, momentumX: 1.0 }); // Custom reset
```

#### `setTimeScale(newTimeScale)`

Update evolution speed multiplier.

**Parameters:**
- `newTimeScale` (number): New time scale value

**Effect:**
- Updates `dtEffective = dt · timeScale`
- Recomputes momentum space evolution operator
- Checks stability condition

**Example:**
```javascript
sim.setTimeScale(2.0); // 2x faster evolution
```

#### `getParameters()`

Get all simulation parameters.

**Returns:** Object containing:
- `gridSize`, `dx`, `dt`, `dtEffective`
- `hbar`, `mass`, `boundaryCondition`, `timeScale`
- `domainSize`, `time`

**Example:**
```javascript
const params = sim.getParameters();
console.log(`Domain size: ${params.domainSize}`);
console.log(`Current time: ${params.time}`);
```

## Physics Details

### Schrödinger Equation

The simulation solves:
```
iℏ ∂ψ/∂t = Ĥψ
```

For a free particle (no potential):
```
Ĥ = -ℏ²/(2m) ∇² = -ℏ²/(2m) (∂²/∂x² + ∂²/∂y²)
```

### Split-Operator Method

The time evolution operator is:
```
ψ(t+Δt) = exp(-iĤΔt/ℏ) ψ(t)
```

For free particle, Ĥ is purely kinetic (T̂), which is diagonal in momentum space:
```
T̂ ψ̃(k) = (ℏ²k²/2m) ψ̃(k)
```

**Evolution steps:**
1. FFT to momentum space: `ψ(x) → ψ̃(k)`
2. Multiply by `exp(-iℏk²Δt/2m)`
3. Inverse FFT: `ψ̃(k) → ψ(x)`

### Momentum Space

For periodic boundaries with FFT, the wave vectors are:
```
k[n] = 2πn/L    for n = 0, 1, ..., N/2-1, -N/2, ..., -1
```
where L = N·dx is the domain size.

### Normalization

**Discrete normalization:**
```
∑ |ψ(x,y)|² = 1
```

This is maintained:
- Automatically during unitary evolution
- Enforced after measurements via renormalization

### Measurement (Born Rule)

**Probability:** The probability of finding the particle at position (x,y) is:
```
P(x,y) = |ψ(x,y)|²
```

**Collapse:** After measurement:
- **Found:** ψ → ψ(x,y) at (x,y), 0 elsewhere
- **Not found:** ψ(x,y) → 0, remaining ψ renormalized

## Usage Examples

### Example 1: Basic Simulation
```javascript
import { QuantumSimulation } from './js/quantum.js';

// Create 64×64 simulation
const sim = new QuantumSimulation(64, 0.1, 0.005);

// Evolve for 100 steps
for (let i = 0; i < 100; i++) {
    sim.step();
}

console.log('Time:', sim.getTime());
console.log('Total probability:', sim.getTotalProbability());
```

### Example 2: Measurement Loop
```javascript
const sim = new QuantumSimulation(64, 0.1, 0.005);

// Perform 1000 measurements at center
const centerX = 32, centerY = 32;
let foundCount = 0;

for (let i = 0; i < 1000; i++) {
    sim.reset();
    const result = sim.measure(centerX, centerY);
    if (result.found) foundCount++;
}

console.log('Found frequency:', foundCount / 1000);
```

### Example 3: Wavepacket with Momentum
```javascript
const sim = new QuantumSimulation(128, 0.1, 0.005);

// Initialize with momentum
sim.initialize({
    centerX: 64,
    centerY: 64,
    width: 2.0,
    momentumX: 2.0,  // Will propagate in +x direction
    momentumY: 0
});

// Watch it move
for (let i = 0; i < 100; i++) {
    sim.step();
    if (i % 20 === 0) {
        console.log(`t=${sim.getTime().toFixed(2)}`);
    }
}
```

### Example 4: Visualization Data
```javascript
const sim = new QuantumSimulation(64, 0.1, 0.005);

// Get data for visualization
const density = sim.getProbabilityDensity();
const phase = sim.getPhase();

// Convert to color for each pixel
for (let y = 0; y < sim.gridSize; y++) {
    for (let x = 0; x < sim.gridSize; x++) {
        const idx = y * sim.gridSize + x;
        const amplitude = Math.sqrt(density[idx]);
        const phaseAngle = phase[idx];

        // Use phase for hue, amplitude for saturation
        const hue = (phaseAngle + Math.PI) / (2 * Math.PI) * 360;
        const saturation = amplitude * 100;
        const lightness = 50;

        // HSL to RGB conversion here...
    }
}
```

## Performance Characteristics

### Computational Complexity

- **Time per step:** O(N² log N) due to 2D FFT
- **Memory:** O(N²) for grid storage
- **Typical performance:**
  - 64×64 grid: ~1-2ms per step
  - 128×128 grid: ~5-10ms per step
  - 256×256 grid: ~30-50ms per step

### Optimization Tips

1. **Use power-of-2 grid sizes:** Required for FFT, highly optimized
2. **Batch evolution steps:** Multiple `step()` calls per render frame
3. **Pre-allocate arrays:** Avoid creating temporary arrays in hot loops
4. **Use Float64Array:** Already used internally for numerical precision

## Testing

Run the test suite:
```bash
node test-quantum.js
```

**Tests verify:**
1. Initialization and parameter setting
2. Normalization (total probability = 1)
3. Unitarity preservation during evolution
4. Gaussian wavepacket properties
5. Positive/negative measurement collapse
6. Born rule statistics
7. Wavepacket dispersion (spreading)
8. Reset functionality
9. Time scale parameter

All tests should pass with numerical precision ~10⁻⁶.

## Limitations (MVP)

1. **Free particle only:** No potential V(x,y) yet
2. **Periodic boundaries only:** No hard walls or absorbing boundaries
3. **Single grid square measurements:** No variable radius measurements
4. **2D only:** No 3D or 1D modes

## Future Extensions

See `initial-design.md` for planned features:
- Potential wells and barriers
- Multiple boundary condition types
- Variable measurement radius
- Multiple particles and entanglement
- Momentum space measurements

## Dependencies

- `js/utils.js`: Complex number utilities, ComplexGrid, FFT2D wrapper
- `lib/fft.js`: Core FFT implementation

## License

Part of the Quantum Particle Simulation Game project.

## References

- **Split-operator method:** Press et al., "Numerical Recipes"
- **FFT algorithm:** Cooley-Tukey algorithm
- **Quantum mechanics:** Griffiths, "Introduction to Quantum Mechanics"
