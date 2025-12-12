# Quantum Simulation Utilities Documentation

This document provides detailed documentation for the utilities module (`js/utils.js`) and FFT library (`lib/fft.js`) used in the quantum particle simulation.

## Overview

The utilities provide the mathematical foundation for quantum wavefunction simulation:

- **Complex number arithmetic** - Full-featured complex number operations
- **Efficient storage** - Optimized ComplexGrid using interleaved Float64Arrays
- **FFT transforms** - Fast 2D Fourier transforms for momentum space evolution
- **Normalization** - Quantum probability conservation utilities
- **Coordinate conversions** - Grid/pixel/physical coordinate mappings
- **Physics calculations** - Wave vectors, spatial/momentum steps

## Module: js/utils.js

### Classes

#### `Complex`

Represents a complex number z = re + i·im with full arithmetic operations.

**Constructor:**
```javascript
const z = new Complex(re, im);
```

**Properties:**
- `re` (number) - Real part
- `im` (number) - Imaginary part

**Methods:**

| Method | Description | Returns |
|--------|-------------|---------|
| `abs()` | Magnitude \|z\| | number |
| `abs2()` | Squared magnitude \|z\|² | number |
| `arg()` | Phase angle in radians [-π, π] | number |
| `conj()` | Complex conjugate z* | Complex |
| `add(other)` | Addition z₁ + z₂ | Complex |
| `sub(other)` | Subtraction z₁ - z₂ | Complex |
| `mul(other)` | Multiplication z₁ · z₂ | Complex |
| `div(other)` | Division z₁ / z₂ | Complex |
| `scale(scalar)` | Scalar multiplication c · z | Complex |
| `exp()` | Complex exponential e^z | Complex |
| `clone()` | Deep copy | Complex |
| `toString()` | String representation | string |

**Static Methods:**

| Method | Description |
|--------|-------------|
| `Complex.fromPolar(r, θ)` | Create from polar coordinates |
| `Complex.real(x)` | Create real number x + 0i |
| `Complex.imaginary(x)` | Create imaginary number 0 + xi |
| `Complex.zero()` | Create 0 + 0i |
| `Complex.one()` | Create 1 + 0i |
| `Complex.i()` | Create imaginary unit 0 + 1i |

**Examples:**
```javascript
// Create complex numbers
const z1 = new Complex(3, 4);           // 3 + 4i
const z2 = Complex.fromPolar(5, Math.PI/4); // 5·e^(iπ/4)

// Arithmetic
const sum = z1.add(z2);
const product = z1.mul(z2);
const conjugate = z1.conj();

// Properties
const magnitude = z1.abs();    // |3+4i| = 5
const phase = z1.arg();         // atan2(4,3)
const probDensity = z1.abs2();  // |3+4i|² = 25
```

---

#### `ComplexGrid`

Efficient 2D array of complex numbers stored in interleaved format optimized for FFT operations.

**Storage Format:** `[re₀, im₀, re₁, im₁, ...]` using Float64Array

**Constructor:**
```javascript
const grid = new ComplexGrid(sizeX, sizeY);
```

**Properties:**
- `sizeX` (number) - Grid width
- `sizeY` (number) - Grid height
- `data` (Float64Array) - Raw interleaved data

**Methods:**

| Method | Description |
|--------|-------------|
| `get(x, y)` | Get Complex value at (x,y) |
| `set(x, y, c)` | Set Complex value at (x,y) |
| `getRe(x, y)` | Get real part |
| `getIm(x, y)` | Get imaginary part |
| `setReIm(x, y, re, im)` | Set real and imaginary parts |
| `getAbs2(x, y)` | Get probability density \|ψ\|² |
| `getAbs(x, y)` | Get amplitude \|ψ\| |
| `getArg(x, y)` | Get phase arg(ψ) |
| `scale(scalar)` | Scale all values by scalar |
| `copy(other)` | Copy data from another grid |
| `clone()` | Create deep copy |
| `zero()` | Fill with zeros |
| `sumAbs2()` | Sum of \|ψ\|² over all points |
| `zeroCell(x, y)` | Zero out single cell |
| `zeroCircularRegion(cx, cy, r)` | Zero out circular region |

**Examples:**
```javascript
// Create and initialize
const psi = new ComplexGrid(128, 128);
psi.setReIm(64, 64, 1.0, 0.0);  // Real value at center

// Query values
const probability = psi.getAbs2(64, 64);
const phase = psi.getArg(64, 64);

// Normalization
const totalProb = psi.sumAbs2();
psi.scale(1.0 / Math.sqrt(totalProb));

// Measurement collapse
psi.zeroCell(32, 32);  // Remove amplitude at one point
```

---

#### `FFT2D`

2D Fast Fourier Transform using row-column decomposition.

**Constructor:**
```javascript
const fft = new FFT2D(sizeX, sizeY);  // Both must be powers of 2
```

**Methods:**

| Method | Description |
|--------|-------------|
| `forward(grid)` | Transform position → momentum space |
| `inverse(grid)` | Transform momentum → position space |

Both methods modify the grid in-place.

**Examples:**
```javascript
// Create FFT operator
const fft2d = new FFT2D(128, 128);

// Forward transform (position → momentum)
fft2d.forward(psi);

// Apply momentum-space operator (e.g., kinetic evolution)
for (let i = 0; i < 128; i++) {
    for (let j = 0; j < 128; j++) {
        const kx = getWaveVector(i, 128, dk);
        const ky = getWaveVector(j, 128, dk);
        const kineticPhase = -(kx*kx + ky*ky) * dt / (2 * mass);
        const factor = Complex.fromPolar(1, kineticPhase);
        const val = psi.get(i, j);
        psi.set(i, j, val.mul(factor));
    }
}

// Inverse transform (momentum → position)
fft2d.inverse(psi);
```

---

#### `PerformanceMonitor`

Utility for profiling simulation performance.

**Constructor:**
```javascript
const perf = new PerformanceMonitor();
```

**Methods:**

| Method | Description |
|--------|-------------|
| `start(label)` | Start timing operation |
| `end(label)` | End timing and return elapsed ms |
| `measure(label, fn)` | Time function execution |

**Examples:**
```javascript
const perf = new PerformanceMonitor();

perf.start('evolution');
simulation.step();
const elapsed = perf.end('evolution');
console.log(`Evolution step: ${elapsed.toFixed(2)}ms`);

// Or use measure
const result = perf.measure('fft', () => fft2d.forward(grid));
```

---

### Functions

#### Normalization Utilities

| Function | Description |
|----------|-------------|
| `computeNorm(grid)` | Calculate norm √(∑\|ψ\|²) |
| `normalize(grid)` | Normalize to unit probability (modifies in-place) |
| `totalProbability(grid, dx)` | Calculate ∫\|ψ\|² dx dy |
| `isNormalized(grid, tol)` | Check if \|∑\|ψ\|² - 1\| < tolerance |

**Examples:**
```javascript
// Normalize wavefunction
const norm = normalize(psi);
console.log(`Normalization factor: ${norm}`);

// Check normalization
if (!isNormalized(psi, 1e-6)) {
    console.warn('Wavefunction not properly normalized!');
}

// Calculate physical probability
const dx = calculateDx(domainSize, gridSize);
const prob = totalProbability(psi, dx);
```

---

#### Grid Coordinate Utilities

| Function | Description |
|----------|-------------|
| `pixelToGrid(px, py, cw, ch, gs)` | Convert canvas pixels to grid indices |
| `gridToPixel(gx, gy, cw, ch, gs)` | Convert grid indices to canvas pixels |
| `gridToPhysical(gx, gy, gs, ds)` | Convert grid to physical coordinates |
| `gridDistance(x1, y1, x2, y2)` | Euclidean distance between grid points |
| `isValidGridCoord(x, y, gs)` | Check if coordinates are in bounds |
| `getCircularNeighborhood(cx, cy, r, gs)` | Get points within radius |

**Examples:**
```javascript
// Handle canvas click
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;

    const {x, y} = pixelToGrid(pixelX, pixelY,
                               canvas.width, canvas.height, gridSize);

    // Perform measurement at grid position (x, y)
    simulation.measure(x, y);
});

// Get measurement region
const points = getCircularNeighborhood(64, 64, 3, 128);
console.log(`Measurement covers ${points.length} grid points`);
```

---

#### Physics Utilities

| Function | Description |
|----------|-------------|
| `calculateDx(domainSize, gridSize)` | Calculate spatial step size |
| `calculateDk(gridSize, dx)` | Calculate momentum step size |
| `getWaveVector(i, N, dk)` | Get wave vector for FFT index |
| `createGaussianWavepacket(...)` | Create initial Gaussian wavefunction |

**Examples:**
```javascript
// Setup physics parameters
const domainSize = 10.0;
const gridSize = 128;
const dx = calculateDx(domainSize, gridSize);
const dk = calculateDk(gridSize, dx);

// Create initial state: Gaussian at center with momentum
const psi = createGaussianWavepacket(
    gridSize,
    gridSize/2, gridSize/2,  // center position
    5.0,                      // width (sigma)
    0.5, 0.0,                // initial momentum (px, py)
    dx,
    1.0                       // hbar (natural units)
);

// Use wave vectors for momentum-space operations
for (let i = 0; i < gridSize; i++) {
    const kx = getWaveVector(i, gridSize, dk);
    // kx is properly ordered for FFT: [0, dk, 2dk, ..., -dk]
}
```

---

#### Mathematical Utilities

| Function | Description |
|----------|-------------|
| `clamp(value, min, max)` | Clamp value to range |
| `lerp(a, b, t)` | Linear interpolation |
| `isPowerOf2(n)` | Check if n is power of 2 |
| `nextPowerOf2(n)` | Find next power of 2 ≥ n |

---

## Module: lib/fft.js

### Class `FFT`

Fast Fourier Transform implementation using Cooley-Tukey radix-2 algorithm.

**Features:**
- O(N log N) complexity
- Precomputed twiddle factors
- Precomputed bit-reversal table
- In-place and out-of-place transforms
- High precision (Float64Array)

**Constructor:**
```javascript
const fft = new FFT(size);  // size must be power of 2
```

**Methods:**

| Method | Description |
|--------|-------------|
| `createComplexArray()` | Create interleaved array [re,im,re,im,...] |
| `toComplexArray(real, imag)` | Convert real/imag to interleaved |
| `fromComplexArray(complex)` | Extract real parts |
| `transform(output, input)` | Forward FFT |
| `inverseTransform(output, input)` | Inverse FFT |
| `realTransform(output, input)` | FFT for real input |
| `getSize()` | Get FFT size |

**Static Methods:**

| Method | Description |
|--------|-------------|
| `FFT.isPowerOf2(n)` | Check if valid FFT size |
| `FFT.nextPowerOf2(n)` | Find next valid size |

**Algorithm Details:**

1. **Bit-reversal permutation** - Reorders input for in-place computation
2. **Iterative butterfly operations** - Combines small DFTs into larger ones
3. **Twiddle factors** - Precomputed complex exponentials W_N^k = e^(-2πik/N)

**Examples:**
```javascript
// Create FFT for size 128
const fft = new FFT(128);

// Prepare input
const input = fft.toComplexArray([1, 2, 3, ..., 128]);

// Forward transform
const output = fft.createComplexArray();
fft.transform(output, input);

// Process in frequency domain
// ... modify output ...

// Inverse transform
const reconstructed = fft.createComplexArray();
fft.inverseTransform(reconstructed, output);

// Should recover original (within numerical precision)
```

**Performance:**
- 64-point FFT: ~0.1-0.2 ms
- 128-point FFT: ~0.2-0.4 ms
- 256-point FFT: ~0.5-1.0 ms
- 512-point FFT: ~1.5-3.0 ms

(Times approximate, depend on hardware)

---

## Usage in Quantum Simulation

### Split-Operator Time Evolution

The split-operator method evolves the wavefunction by alternating between position and momentum space:

```javascript
// Setup
const gridSize = 128;
const dx = calculateDx(10.0, gridSize);
const dk = calculateDk(gridSize, dx);
const dt = 0.01;
const mass = 1.0;
const hbar = 1.0;

// Create initial wavefunction
const psi = createGaussianWavepacket(gridSize, gridSize/2, gridSize/2,
                                     5.0, 0, 0, dx, hbar);

// Create FFT operator
const fft2d = new FFT2D(gridSize, gridSize);

// Time evolution step
function evolveStep() {
    // Transform to momentum space
    fft2d.forward(psi);

    // Apply kinetic evolution: exp(-iℏk²Δt/2m)
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const kx = getWaveVector(i, gridSize, dk);
            const ky = getWaveVector(j, gridSize, dk);
            const k2 = kx*kx + ky*ky;
            const phase = -hbar * k2 * dt / (2 * mass);

            // Multiply by phase factor
            const psiVal = psi.get(i, j);
            const factor = Complex.fromPolar(1, phase);
            psi.set(i, j, psiVal.mul(factor));
        }
    }

    // Transform back to position space
    fft2d.inverse(psi);

    // Check normalization (should be preserved)
    if (!isNormalized(psi, 1e-6)) {
        console.warn('Normalization error detected');
        normalize(psi);
    }
}

// Run simulation
for (let step = 0; step < 1000; step++) {
    evolveStep();
}
```

### Measurement Collapse

```javascript
function performMeasurement(clickX, clickY) {
    // Convert click to grid coordinates
    const {x, y} = pixelToGrid(clickX, clickY,
                                canvas.width, canvas.height, gridSize);

    // Get measurement probability
    const probability = psi.getAbs2(x, y);

    // Probabilistic collapse
    const found = Math.random() < probability;

    if (found) {
        // Positive result: collapse to clicked position
        psi.zero();
        psi.setReIm(x, y, 1, 0);
    } else {
        // Negative result: zero out clicked position
        psi.zeroCell(x, y);
    }

    // Renormalize
    normalize(psi);

    return { found, probability };
}
```

---

## Performance Optimization Tips

1. **Use power-of-2 grid sizes** (64, 128, 256) for optimal FFT performance
2. **Avoid unnecessary grid copies** - Use in-place operations when possible
3. **Batch operations** - Process multiple time steps between renders
4. **Monitor normalization** - Check occasionally, normalize only when needed
5. **Profile bottlenecks** - Use PerformanceMonitor to identify slow operations

---

## Testing

Open `test-utils.html` in a browser to run the comprehensive test suite:

```bash
# Serve locally
python3 -m http.server 8000
# Open http://localhost:8000/test-utils.html
```

Tests verify:
- Complex number arithmetic
- Grid storage and operations
- 1D and 2D FFT transforms
- Round-trip accuracy (FFT → IFFT)
- Gaussian wavepacket creation
- Normalization preservation
- Coordinate conversions
- Performance benchmarks

---

## Technical Notes

### Numerical Precision

- All calculations use `Float64Array` (64-bit floats)
- Normalization errors typically < 1e-10 per operation
- Cumulative errors over many steps may require periodic renormalization
- Monitor total probability: should remain ≈ 1.0

### FFT Conventions

- **Forward transform:** No normalization factor
- **Inverse transform:** Divide by N
- **Wave vector ordering:** [0, dk, 2dk, ..., max, -max, ..., -dk]
- **Frequency range:** [-π/dx, π/dx] (Nyquist limit)

### Memory Layout

ComplexGrid uses row-major storage with interleaving:
```
Index: 0  1  2  3  4  5  6  7  ...
Data:  r₀ i₀ r₁ i₁ r₂ i₂ r₃ i₃ ...

Position (x,y): index = (y * sizeX + x) * 2
```

This layout is optimal for:
- Cache-friendly sequential access
- FFT library compatibility
- SIMD vectorization potential

---

## Dependencies

- **None!** Both modules are pure JavaScript with no external dependencies
- Uses only standard browser APIs (Math, TypedArrays, ES6 modules)
- Compatible with modern browsers (Chrome 90+, Firefox 88+, Safari 14+)

---

## License

Part of the Quantum Playground project.

---

## References

- Cooley-Tukey FFT Algorithm (1965)
- Split-operator method for Schrödinger equation
- Numerical Methods for Quantum Mechanics
- High-precision numerical computing in JavaScript
