# Periodic Boundary Conditions - Complete Technical Reference

## Overview
The simulation implements **periodic boundary conditions** where the grid wraps around like a torus. The left edge connects to the right edge, and the top connects to the bottom.

---

## Where Boundary Conditions Are Handled

### 1. **Momentum Space Grid Setup**
**File**: `js/quantum.js`, **Function**: `_precomputeMomentumOperator()`, **Lines**: 95-119

This is where periodic boundaries are fundamentally encoded:

```javascript
// Momentum components (FFT ordering)
const kx = (ix < N / 2) ? (2 * Math.PI * ix / L) : (2 * Math.PI * (ix - N) / L);
const ky = (iy < N / 2) ? (2 * Math.PI * iy / L) : (2 * Math.PI * (iy - N) / L);
```

**How it works**:
- For periodic boundaries, allowed momentum values are: `k = 2πn/L` where `n` is an integer
- FFT naturally assumes periodic data, so frequencies wrap:
  - Indices 0 to N/2-1: positive frequencies (k = 0, 2π/L, 4π/L, ...)
  - Indices N/2 to N-1: negative frequencies (k = -π(N/L), ..., -2π/L)
- The Nyquist frequency `k_max = πN/L` is the highest momentum the grid can represent
- This frequency ordering is **fundamental** to how FFT handles periodic domains

### 2. **FFT Forward Transform**
**File**: `js/utils.js`, **Class**: `FFT2D`, **Function**: `forward()`, **Lines**: 442-488

```javascript
forward(grid) {
    // FFT along rows (x-direction)
    for (let y = 0; y < this.sizeY; y++) {
        // Extract row, transform, write back
    }
    // FFT along columns (y-direction)
    for (let x = 0; x < this.sizeX; x++) {
        // Extract column, transform, write back
    }
}
```

**How it works**:
- The FFT implicitly assumes the input data is periodic
- When you FFT a row of N points, the algorithm treats it as if point N wraps to point 0
- No explicit boundary handling needed - it's built into the FFT algorithm itself
- This is performed by the Cooley-Tukey radix-2 algorithm in `lib/fft.js`

### 3. **FFT Inverse Transform**
**File**: `lib/fft.js`, **Function**: `inverseTransform()`, **Lines**: 240-261

```javascript
inverseTransform(output, input) {
    // Step 1: Conjugate input
    // Step 2: Forward transform
    // Step 3: Conjugate and normalize output (divide by N)
    for (let i = 0; i < size; i++) {
        output[i * 2] /= size;
        output[i * 2 + 1] = -output[i * 2 + 1] / size;
    }
}
```

**How it works**:
- Uses the identity: `IFFT(x) = (1/N) * conj(FFT(conj(x)))`
- Each 1D IFFT divides by N
- For 2D: IFFT on rows (÷N), then IFFT on columns (÷N) = total ÷N²
- This preserves normalization and maintains periodicity

### 4. **Time Evolution Step**
**File**: `js/quantum.js`, **Function**: `step()`, **Lines**: 189-222

```javascript
step() {
    // 1. Transform to momentum space: ψ(k) = FFT[ψ(x)]
    this.psiMomentum.copy(this.psi);
    this.fft.forward(this.psiMomentum);

    // 2. Apply momentum space evolution: ψ(k) → exp(-iℏk²Δt/2m) ψ(k)
    // (element-wise multiplication with precomputed operator)

    // 3. Transform back: ψ(x) = IFFT[ψ(k)]
    this.fft.inverse(this.psiMomentum);
    this.psi.copy(this.psiMomentum);
}
```

**How it works**:
- The split-operator method in Fourier space is **exact** for periodic boundaries
- No explicit boundary conditions needed - the FFT handles everything
- Each step preserves unitarity (probability conservation) to machine precision
- The wavefunction naturally wraps around at the edges

### 5. **Measurement Collapse (NEW - Artifact Fix)**
**File**: `js/quantum.js`, **Functions**: `collapsePositive()` and `collapseNegative()`, **Lines**: 261-342

```javascript
// Handle periodic boundaries: find minimum distance considering wrapping
let dx = Math.abs(ix * this.dx - x0);
let dy = Math.abs(iy * this.dx - y0);

// Wrap around if closer through periodic boundary
if (dx > this.domainSize / 2) dx = this.domainSize - dx;
if (dy > this.domainSize / 2) dy = this.domainSize - dy;
```

**How it works**:
- When creating Gaussian peaks/holes after measurements, we must account for wrapping
- If a measurement is at x=2 (near left edge), points at x=30 (near right edge) might be closer through wrapping
- This ensures smooth Gaussian shapes even when centered near grid edges
- Prevents discontinuities that would cause FFT artifacts

---

## Key Points

### ✅ What Periodic Boundaries DO:
1. **Conserve momentum and energy** exactly (no boundary losses)
2. **Allow the wavefunction to wrap** from one edge to the opposite edge
3. **Automatically handled by FFT** - no special edge cases in the physics code
4. **Preserve unitarity** (total probability = 1) to machine precision

### ⚠️ What Can Go Wrong:
1. **Aliasing**: Momenta higher than `k_max = πN/L` cannot be represented and "wrap around"
2. **Resolution**: A 32×32 grid can only resolve ~16 independent wavelengths per direction
3. **Sharp features**: Delta functions or sharp discontinuities contain high frequencies → artifacts
4. **Gibbs ringing**: Sharp edges cause oscillations in Fourier space

### 🔧 How We Fixed Artifacts:
- Replaced delta function collapses with **small Gaussian peaks** (σ ≈ 1.5Δx)
- Limited bandwidth to what the grid can represent
- Properly handled distance calculations across periodic boundaries
- Result: Smooth evolution without FFT ringing or aliasing

---

## Mathematical Details

### Momentum Quantization
For a periodic domain of size L with N grid points:
- Allowed momenta: `k_n = 2πn/L` where n ∈ {-N/2, ..., N/2-1}
- Maximum momentum: `k_max = πN/L = π/Δx` (Nyquist limit)
- Minimum wavelength: `λ_min = 2Δx` (2 points per wavelength)

### FFT Convention
The DFT frequency ordering used:
```
Frequencies: [0, f, 2f, ..., f_max, -f_max, ..., -2f, -f]
Indices:     [0, 1, 2,  ..., N/2,   N/2+1, ..., N-2, N-1]
where f = 1/L, f_max = N/(2L)
```

This is the **standard FFT convention** and matches what numpy.fft, FFTW, and other libraries use.

---

## Debugging Periodic Boundaries

To verify periodic boundaries are working correctly:
```bash
node boundary-check.js
```

This diagnostic:
- Creates a wavepacket near the edge
- Evolves it to cross the boundary
- Checks that it wraps correctly to the opposite side
- Verifies probability conservation
- Tests measurement behavior near edges
