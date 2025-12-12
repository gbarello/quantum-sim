/**
 * Quantum Simulation Utilities Module
 *
 * This module provides essential utilities for quantum wavefunction simulation:
 * - Complex number operations with full arithmetic
 * - Complex array manipulations optimized for performance
 * - Grid coordinate utilities for canvas/physics conversions
 * - Normalization utilities for wavefunction probability
 * - 2D FFT/IFFT wrappers for split-operator evolution
 *
 * @module utils
 * @author Quantum Playground Team
 */

import FFT from '../lib/fft.js';

// ============================================================================
// COMPLEX NUMBER CLASS
// ============================================================================

/**
 * Complex number class with full arithmetic operations
 *
 * Represents a complex number z = re + i*im and provides
 * standard operations needed for quantum mechanics calculations.
 * Optimized for quantum wavefunction operations.
 */
export class Complex {
    /**
     * Creates a complex number
     * @param {number} re - Real part (default: 0)
     * @param {number} im - Imaginary part (default: 0)
     */
    constructor(re = 0, im = 0) {
        this.re = re;
        this.im = im;
    }

    /**
     * Magnitude (absolute value): |z| = sqrt(re² + im²)
     * Uses Math.hypot for numerical stability
     * @returns {number} Magnitude of the complex number
     */
    abs() {
        return Math.hypot(this.re, this.im);
    }

    /**
     * Squared magnitude: |z|² = re² + im²
     * More efficient than abs() when squared value is needed
     * @returns {number} Squared magnitude
     */
    abs2() {
        return this.re * this.re + this.im * this.im;
    }

    /**
     * Phase (argument): arg(z) = atan2(im, re)
     * Returns angle in radians [-π, π]
     * @returns {number} Phase angle in radians
     */
    arg() {
        return Math.atan2(this.im, this.re);
    }

    /**
     * Complex conjugate: z* = re - i*im
     * @returns {Complex} Complex conjugate
     */
    conj() {
        return new Complex(this.re, -this.im);
    }

    /**
     * Add two complex numbers: z1 + z2
     * @param {Complex} other - Complex number to add
     * @returns {Complex} Sum of the two complex numbers
     */
    add(other) {
        return new Complex(this.re + other.re, this.im + other.im);
    }

    /**
     * Subtract two complex numbers: z1 - z2
     * @param {Complex} other - Complex number to subtract
     * @returns {Complex} Difference of the two complex numbers
     */
    sub(other) {
        return new Complex(this.re - other.re, this.im - other.im);
    }

    /**
     * Multiply two complex numbers: z1 * z2
     * (a + bi)(c + di) = (ac - bd) + (ad + bc)i
     * @param {Complex} other - Complex number to multiply
     * @returns {Complex} Product of the two complex numbers
     */
    mul(other) {
        return new Complex(
            this.re * other.re - this.im * other.im,
            this.re * other.im + this.im * other.re
        );
    }

    /**
     * Multiply by a scalar: c * z
     * @param {number} scalar - Real number to multiply by
     * @returns {Complex} Scaled complex number
     */
    scale(scalar) {
        return new Complex(this.re * scalar, this.im * scalar);
    }

    /**
     * Divide two complex numbers: z1 / z2
     * @param {Complex} other - Complex number to divide by
     * @returns {Complex} Quotient of the two complex numbers
     * @throws {Error} If dividing by zero
     */
    div(other) {
        const denom = other.abs2();
        if (denom === 0) {
            throw new Error('Division by zero in complex number');
        }
        return new Complex(
            (this.re * other.re + this.im * other.im) / denom,
            (this.im * other.re - this.re * other.im) / denom
        );
    }

    /**
     * Complex exponential: exp(z) = exp(re) * (cos(im) + i*sin(im))
     * @returns {Complex} e^z
     */
    exp() {
        const expRe = Math.exp(this.re);
        return new Complex(expRe * Math.cos(this.im), expRe * Math.sin(this.im));
    }

    /**
     * Create a copy of this complex number
     * @returns {Complex} Deep copy of this complex number
     */
    clone() {
        return new Complex(this.re, this.im);
    }

    /**
     * String representation for debugging
     * @returns {string} String representation like "1.234567+0.234567i"
     */
    toString() {
        const sign = this.im >= 0 ? '+' : '';
        return `${this.re.toFixed(6)}${sign}${this.im.toFixed(6)}i`;
    }

    /**
     * Create a complex number from polar coordinates
     * @param {number} r - Magnitude
     * @param {number} theta - Phase angle in radians
     * @returns {Complex} Complex number z = r*e^(i*theta)
     */
    static fromPolar(r, theta) {
        return new Complex(r * Math.cos(theta), r * Math.sin(theta));
    }

    /**
     * Create a pure imaginary number: i*x
     * @param {number} x - Imaginary part
     * @returns {Complex} Complex number 0 + i*x
     */
    static imaginary(x) {
        return new Complex(0, x);
    }

    /**
     * Create a real number as a complex number
     * @param {number} x - Real part
     * @returns {Complex} Complex number x + 0i
     */
    static real(x) {
        return new Complex(x, 0);
    }

    /**
     * Zero complex number: 0 + 0i
     * @returns {Complex} Zero
     */
    static zero() {
        return new Complex(0, 0);
    }

    /**
     * One complex number: 1 + 0i
     * @returns {Complex} One
     */
    static one() {
        return new Complex(1, 0);
    }

    /**
     * Imaginary unit: 0 + 1i
     * @returns {Complex} i
     */
    static i() {
        return new Complex(0, 1);
    }
}

// ============================================================================
// COMPLEX GRID CLASS (Optimized Storage)
// ============================================================================

/**
 * 2D array of complex numbers stored as interleaved [re, im, re, im, ...]
 * This format is optimized for FFT operations and memory efficiency.
 * Uses Float64Array for high precision quantum calculations.
 */
export class ComplexGrid {
    /**
     * Create a complex grid
     * @param {number} sizeX - Grid width
     * @param {number} sizeY - Grid height
     */
    constructor(sizeX, sizeY) {
        this.sizeX = sizeX;
        this.sizeY = sizeY;
        // Interleaved format: [re0, im0, re1, im1, ...]
        // Uses Float64Array for precision in quantum calculations
        this.data = new Float64Array(sizeX * sizeY * 2);
    }

    /**
     * Get complex value at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Complex} Complex value at position
     */
    get(x, y) {
        const idx = (y * this.sizeX + x) * 2;
        return new Complex(this.data[idx], this.data[idx + 1]);
    }

    /**
     * Set complex value at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Complex} c - Complex value to set
     */
    set(x, y, c) {
        const idx = (y * this.sizeX + x) * 2;
        this.data[idx] = c.re;
        this.data[idx + 1] = c.im;
    }

    /**
     * Get real part at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Real part
     */
    getRe(x, y) {
        return this.data[(y * this.sizeX + x) * 2];
    }

    /**
     * Get imaginary part at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Imaginary part
     */
    getIm(x, y) {
        return this.data[(y * this.sizeX + x) * 2 + 1];
    }

    /**
     * Set real and imaginary parts at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} re - Real part
     * @param {number} im - Imaginary part
     */
    setReIm(x, y, re, im) {
        const idx = (y * this.sizeX + x) * 2;
        this.data[idx] = re;
        this.data[idx + 1] = im;
    }

    /**
     * Get magnitude squared |ψ|² at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Probability density at position
     */
    getAbs2(x, y) {
        const idx = (y * this.sizeX + x) * 2;
        const re = this.data[idx];
        const im = this.data[idx + 1];
        return re * re + im * im;
    }

    /**
     * Get magnitude |ψ| at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Amplitude at position
     */
    getAbs(x, y) {
        return Math.sqrt(this.getAbs2(x, y));
    }

    /**
     * Get phase arg(ψ) at (x, y)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Phase in radians [-π, π]
     */
    getArg(x, y) {
        const idx = (y * this.sizeX + x) * 2;
        return Math.atan2(this.data[idx + 1], this.data[idx]);
    }

    /**
     * Scale all values by a real scalar
     * Modifies grid in-place
     * @param {number} scalar - Scaling factor
     */
    scale(scalar) {
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] *= scalar;
        }
    }

    /**
     * Copy data from another ComplexGrid
     * @param {ComplexGrid} other - Source grid
     */
    copy(other) {
        this.data.set(other.data);
    }

    /**
     * Clone this grid
     * @returns {ComplexGrid} Deep copy of this grid
     */
    clone() {
        const result = new ComplexGrid(this.sizeX, this.sizeY);
        result.data.set(this.data);
        return result;
    }

    /**
     * Fill with zeros
     */
    zero() {
        this.data.fill(0);
    }

    /**
     * Sum of |ψ|² over all grid points
     * Used for normalization checks (should equal 1 when normalized)
     * @returns {number} Total probability
     */
    sumAbs2() {
        let sum = 0;
        for (let i = 0; i < this.data.length; i += 2) {
            const re = this.data[i];
            const im = this.data[i + 1];
            sum += re * re + im * im;
        }
        return sum;
    }

    /**
     * Zero out a specific grid cell (useful for measurements)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    zeroCell(x, y) {
        const idx = (y * this.sizeX + x) * 2;
        this.data[idx] = 0;
        this.data[idx + 1] = 0;
    }

    /**
     * Zero out a circular region (for measurement collapse)
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Radius in grid cells
     */
    zeroCircularRegion(centerX, centerY, radius) {
        const radiusSq = radius * radius;
        for (let y = 0; y < this.sizeY; y++) {
            for (let x = 0; x < this.sizeX; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                if (dx * dx + dy * dy <= radiusSq) {
                    this.zeroCell(x, y);
                }
            }
        }
    }
}

// ============================================================================
// 2D FFT CLASS
// ============================================================================

/**
 * 2D FFT operations using row-column decomposition
 *
 * Performs 2D Fourier transforms via:
 * 1. 1D FFT on each row
 * 2. 1D FFT on each column
 *
 * Critical for split-operator time evolution in momentum space.
 */
export class FFT2D {
    /**
     * Create a 2D FFT operator
     * @param {number} sizeX - Grid width (must be power of 2)
     * @param {number} sizeY - Grid height (must be power of 2)
     */
    constructor(sizeX, sizeY) {
        this.sizeX = sizeX;
        this.sizeY = sizeY;

        // Create 1D FFT objects for rows and columns
        this.fftX = new FFT(sizeX);
        this.fftY = new FFT(sizeY);

        // Temporary buffers for row/column operations
        this.rowBuffer = new Float64Array(sizeX * 2);
        this.colBuffer = new Float64Array(sizeY * 2);
    }

    /**
     * 2D Forward FFT (in-place)
     * Transforms from position space to momentum space
     * @param {ComplexGrid} grid - Grid to transform (modified in-place)
     */
    forward(grid) {
        // FFT along rows (x-direction)
        for (let y = 0; y < this.sizeY; y++) {
            // Extract row
            const rowOffset = y * this.sizeX * 2;
            for (let x = 0; x < this.sizeX; x++) {
                this.rowBuffer[x * 2] = grid.data[rowOffset + x * 2];
                this.rowBuffer[x * 2 + 1] = grid.data[rowOffset + x * 2 + 1];
            }

            // Transform row
            const rowOut = this.fftX.createComplexArray();
            this.fftX.transform(rowOut, this.rowBuffer);

            // Write back
            for (let x = 0; x < this.sizeX; x++) {
                grid.data[rowOffset + x * 2] = rowOut[x * 2];
                grid.data[rowOffset + x * 2 + 1] = rowOut[x * 2 + 1];
            }
        }

        // FFT along columns (y-direction)
        for (let x = 0; x < this.sizeX; x++) {
            // Extract column
            for (let y = 0; y < this.sizeY; y++) {
                const idx = (y * this.sizeX + x) * 2;
                this.colBuffer[y * 2] = grid.data[idx];
                this.colBuffer[y * 2 + 1] = grid.data[idx + 1];
            }

            // Transform column
            const colOut = this.fftY.createComplexArray();
            this.fftY.transform(colOut, this.colBuffer);

            // Write back
            for (let y = 0; y < this.sizeY; y++) {
                const idx = (y * this.sizeX + x) * 2;
                grid.data[idx] = colOut[y * 2];
                grid.data[idx + 1] = colOut[y * 2 + 1];
            }
        }
    }

    /**
     * 2D Inverse FFT (in-place)
     * Transforms from momentum space back to position space
     * @param {ComplexGrid} grid - Grid to transform (modified in-place)
     */
    inverse(grid) {
        // IFFT along columns (y-direction)
        for (let x = 0; x < this.sizeX; x++) {
            // Extract column
            for (let y = 0; y < this.sizeY; y++) {
                const idx = (y * this.sizeX + x) * 2;
                this.colBuffer[y * 2] = grid.data[idx];
                this.colBuffer[y * 2 + 1] = grid.data[idx + 1];
            }

            // Inverse transform column
            const colOut = this.fftY.createComplexArray();
            this.fftY.inverseTransform(colOut, this.colBuffer);

            // Write back
            for (let y = 0; y < this.sizeY; y++) {
                const idx = (y * this.sizeX + x) * 2;
                grid.data[idx] = colOut[y * 2];
                grid.data[idx + 1] = colOut[y * 2 + 1];
            }
        }

        // IFFT along rows (x-direction)
        for (let y = 0; y < this.sizeY; y++) {
            // Extract row
            const rowOffset = y * this.sizeX * 2;
            for (let x = 0; x < this.sizeX; x++) {
                this.rowBuffer[x * 2] = grid.data[rowOffset + x * 2];
                this.rowBuffer[x * 2 + 1] = grid.data[rowOffset + x * 2 + 1];
            }

            // Inverse transform row
            const rowOut = this.fftX.createComplexArray();
            this.fftX.inverseTransform(rowOut, this.rowBuffer);

            // Write back
            for (let x = 0; x < this.sizeX; x++) {
                grid.data[rowOffset + x * 2] = rowOut[x * 2];
                grid.data[rowOffset + x * 2 + 1] = rowOut[x * 2 + 1];
            }
        }
    }
}

// ============================================================================
// NORMALIZATION UTILITIES
// ============================================================================

/**
 * Compute normalization constant for a ComplexGrid
 * @param {ComplexGrid} grid - Wavefunction grid
 * @returns {number} Norm = sqrt(∑|ψ|²)
 */
export function computeNorm(grid) {
    return Math.sqrt(grid.sumAbs2());
}

/**
 * Normalize a ComplexGrid to unit total probability
 * Ensures ∑|ψ|² = 1 (quantum normalization condition)
 * @param {ComplexGrid} grid - Wavefunction grid (modified in-place)
 * @returns {number} Normalization factor applied
 */
export function normalize(grid) {
    const norm = computeNorm(grid);
    if (norm > 1e-10) {
        grid.scale(1.0 / norm);
    } else {
        console.warn('Cannot normalize near-zero wavefunction');
    }
    return norm;
}

/**
 * Calculate total probability (should be 1 when normalized)
 * @param {ComplexGrid} grid - Wavefunction grid
 * @param {number} dx - Spatial step size
 * @returns {number} Total probability ∫|ψ|² dx dy
 */
export function totalProbability(grid, dx) {
    return grid.sumAbs2() * dx * dx;
}

/**
 * Check if wavefunction is properly normalized
 * @param {ComplexGrid} grid - Wavefunction grid
 * @param {number} tolerance - Acceptable deviation from 1.0 (default: 1e-6)
 * @returns {boolean} True if normalized within tolerance
 */
export function isNormalized(grid, tolerance = 1e-6) {
    const totalProb = grid.sumAbs2();
    return Math.abs(totalProb - 1.0) < tolerance;
}

// ============================================================================
// GRID COORDINATE UTILITIES
// ============================================================================

/**
 * Convert pixel coordinates to grid indices
 * @param {number} pixelX - X pixel coordinate on canvas
 * @param {number} pixelY - Y pixel coordinate on canvas
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} gridSize - Grid dimension (N for N×N grid)
 * @returns {{x: number, y: number}} Grid indices {x, y}
 */
export function pixelToGrid(pixelX, pixelY, canvasWidth, canvasHeight, gridSize) {
    const x = Math.floor((pixelX / canvasWidth) * gridSize);
    const y = Math.floor((pixelY / canvasHeight) * gridSize);
    return {
        x: Math.max(0, Math.min(gridSize - 1, x)),
        y: Math.max(0, Math.min(gridSize - 1, y))
    };
}

/**
 * Convert grid indices to pixel coordinates (center of cell)
 * @param {number} gridX - Grid X index
 * @param {number} gridY - Grid Y index
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {number} gridSize - Grid dimension (N for N×N grid)
 * @returns {{x: number, y: number}} Pixel coordinates {x, y}
 */
export function gridToPixel(gridX, gridY, canvasWidth, canvasHeight, gridSize) {
    const cellWidth = canvasWidth / gridSize;
    const cellHeight = canvasHeight / gridSize;
    return {
        x: (gridX + 0.5) * cellWidth,
        y: (gridY + 0.5) * cellHeight
    };
}

/**
 * Convert grid indices to physical coordinates
 * @param {number} gridX - Grid X index
 * @param {number} gridY - Grid Y index
 * @param {number} gridSize - Grid dimension (N for N×N grid)
 * @param {number} domainSize - Physical domain size (same for x and y)
 * @returns {{x: number, y: number}} Physical coordinates {x, y}
 */
export function gridToPhysical(gridX, gridY, gridSize, domainSize) {
    const dx = domainSize / gridSize;
    return {
        x: gridX * dx,
        y: gridY * dx
    };
}

/**
 * Calculate distance between two grid points
 * @param {number} x1 - First point X index
 * @param {number} y1 - First point Y index
 * @param {number} x2 - Second point X index
 * @param {number} y2 - Second point Y index
 * @returns {number} Euclidean distance
 */
export function gridDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Check if grid coordinates are within bounds
 * @param {number} x - X grid index
 * @param {number} y - Y grid index
 * @param {number} gridSize - Grid dimension (N for N×N grid)
 * @returns {boolean} True if coordinates are valid
 */
export function isValidGridCoord(x, y, gridSize) {
    return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

/**
 * Get circular neighborhood around a grid point
 * Used for measurement regions and visualization
 * @param {number} centerX - Center X grid index
 * @param {number} centerY - Center Y grid index
 * @param {number} radius - Radius in grid cells
 * @param {number} gridSize - Grid dimension (N for N×N grid)
 * @returns {Array<{x: number, y: number}>} Array of grid coordinates in neighborhood
 */
export function getCircularNeighborhood(centerX, centerY, radius, gridSize) {
    const points = [];
    const radiusSquared = radius * radius;

    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(gridSize - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(gridSize - 1, Math.ceil(centerY + radius));

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            const distSquared = (x - centerX) * (x - centerX) + (y - centerY) * (y - centerY);
            if (distSquared <= radiusSquared) {
                points.push({ x, y });
            }
        }
    }

    return points;
}

// ============================================================================
// PHYSICS UTILITIES
// ============================================================================

/**
 * Calculate spatial step size (grid spacing)
 * @param {number} domainSize - Physical domain size
 * @param {number} gridSize - Number of grid points
 * @returns {number} Spatial step dx = dy
 */
export function calculateDx(domainSize, gridSize) {
    return domainSize / gridSize;
}

/**
 * Calculate momentum-space step size
 * @param {number} gridSize - Number of grid points (N)
 * @param {number} dx - Spatial step size
 * @returns {number} Momentum step dk
 */
export function calculateDk(gridSize, dx) {
    return (2 * Math.PI) / (gridSize * dx);
}

/**
 * Get wave vector components for FFT grid point
 * FFT ordering: [0, 1, 2, ..., N/2-1, -N/2, -N/2+1, ..., -1]
 * @param {number} i - Grid index
 * @param {number} N - Grid size
 * @param {number} dk - Momentum step size
 * @returns {number} Wave vector k_i
 */
export function getWaveVector(i, N, dk) {
    if (i < N / 2) {
        return i * dk;
    } else {
        return (i - N) * dk;
    }
}

/**
 * Create a Gaussian initial wavefunction
 * ψ(x,y) = A exp(-(x-x0)²/4σ² - (y-y0)²/4σ²) exp(i(px·x + py·y)/ℏ)
 * @param {number} gridSize - Grid dimension (N×N)
 * @param {number} x0 - Center X position (in grid coordinates)
 * @param {number} y0 - Center Y position (in grid coordinates)
 * @param {number} sigma - Width parameter (in grid cells)
 * @param {number} px - Initial momentum X component
 * @param {number} py - Initial momentum Y component
 * @param {number} dx - Spatial step size
 * @param {number} hbar - Reduced Planck constant (natural units)
 * @returns {ComplexGrid} Normalized Gaussian wavepacket
 */
export function createGaussianWavepacket(gridSize, x0, y0, sigma, px, py, dx, hbar = 1.0) {
    const grid = new ComplexGrid(gridSize, gridSize);
    const sigmaSquared = sigma * sigma;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            // Calculate position relative to center
            const x = i - x0;
            const y = j - y0;

            // Gaussian envelope
            const envelope = Math.exp(-(x * x + y * y) / (4 * sigmaSquared));

            // Phase from momentum: exp(i(px·x + py·y)/ℏ)
            // Convert grid coordinates to physical coordinates
            const xPhys = x * dx;
            const yPhys = y * dx;
            const phase = (px * xPhys + py * yPhys) / hbar;

            // Combine envelope and phase: envelope * e^(i*phase)
            const re = envelope * Math.cos(phase);
            const im = envelope * Math.sin(phase);
            grid.setReIm(i, j, re, im);
        }
    }

    // Normalize to unit probability
    normalize(grid);

    return grid;
}

// ============================================================================
// MATHEMATICAL UTILITIES
// ============================================================================

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation parameter [0, 1]
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Check if a number is a power of 2
 * Important for FFT optimization
 * @param {number} n - Number to check
 * @returns {boolean} True if n is a power of 2
 */
export function isPowerOf2(n) {
    return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Find next power of 2 greater than or equal to n
 * @param {number} n - Input number
 * @returns {number} Next power of 2
 */
export function nextPowerOf2(n) {
    if (n <= 0) return 1;
    n--;
    n |= n >> 1;
    n |= n >> 2;
    n |= n >> 4;
    n |= n >> 8;
    n |= n >> 16;
    return n + 1;
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

/**
 * Performance monitoring utility for profiling simulation code
 */
export class PerformanceMonitor {
    constructor() {
        this.timings = new Map();
    }

    /**
     * Start timing a labeled operation
     * @param {string} label - Operation label
     */
    start(label) {
        this.timings.set(label, performance.now());
    }

    /**
     * End timing a labeled operation
     * @param {string} label - Operation label
     * @returns {number} Elapsed time in milliseconds
     */
    end(label) {
        const startTime = this.timings.get(label);
        if (startTime === undefined) {
            console.warn(`No start time found for label: ${label}`);
            return 0;
        }
        const elapsed = performance.now() - startTime;
        this.timings.delete(label);
        return elapsed;
    }

    /**
     * Measure execution time of a function
     * @param {string} label - Operation label
     * @param {Function} fn - Function to measure
     * @returns {*} Result of function
     */
    measure(label, fn) {
        this.start(label);
        const result = fn();
        const elapsed = this.end(label);
        console.log(`${label}: ${elapsed.toFixed(2)}ms`);
        return result;
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    Complex,
    ComplexGrid,
    FFT2D,
    computeNorm,
    normalize,
    totalProbability,
    isNormalized,
    pixelToGrid,
    gridToPixel,
    gridToPhysical,
    gridDistance,
    isValidGridCoord,
    getCircularNeighborhood,
    calculateDx,
    calculateDk,
    getWaveVector,
    createGaussianWavepacket,
    clamp,
    lerp,
    isPowerOf2,
    nextPowerOf2,
    PerformanceMonitor
};
