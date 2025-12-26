/**
 * quantum.js - Core quantum physics engine
 *
 * Implements the time-dependent Schrodinger equation evolution using:
 * - Split-operator method for time evolution
 * - FFT-based momentum space evolution
 * - Gaussian wavepacket initialization
 * - Quantum measurements with wavefunction collapse
 * - Periodic boundary conditions
 *
 * COORDINATE SYSTEM AND UNITS:
 * - dx: Physical spatial step size (PRIMARY PARAMETER, independent of grid size)
 * - gridSize: Number of grid points per dimension (must be power of 2 for FFT)
 * - domainSize: Physical domain size (DERIVED: domainSize = gridSize × dx)
 * - All positions, widths, and radii are specified in physical units
 * - Potential features use fixed physical scales (independent of domain size)
 */

import { ComplexGrid, FFT2D, normalize, Complex } from './utils.js';

/**
 * QuantumSimulation class
 *
 * Simulates a free quantum particle on a 2D grid using the time-dependent
 * Schrodinger equation: ih d�/dt = -h�/(2m) ��
 */
export class QuantumSimulation {
    /**
     * Constructor
     * @param {number} gridSize - Number of grid points in each dimension (NxN grid)
     * @param {number} dx - Spatial step size
     * @param {number} dt - Time step (must satisfy stability: dt < 2m*dx�/h)
     * @param {number} hbar - Reduced Planck constant (default: 1.0 in natural units)
     * @param {number} mass - Particle mass (default: 1.0 in natural units)
     * @param {string} boundaryCondition - Boundary type (default: 'periodic')
     * @param {number} timeScale - Time evolution speed multiplier (default: 1.0)
     */
    constructor(
        gridSize,
        dx,
        dt,
        hbar = 1.0,
        mass = 1.0,
        boundaryCondition = 'periodic',
        timeScale = 1.0
    ) {
        // Validate gridSize is power of 2 for FFT
        if ((gridSize & (gridSize - 1)) !== 0) {
            throw new Error('Grid size must be a power of 2 for FFT');
        }

        this.gridSize = gridSize;
        this.dx = dx;
        this.dt = dt;
        this.hbar = hbar;
        this.mass = mass;
        this.boundaryCondition = boundaryCondition;
        this.timeScale = timeScale;

        // Measurement parameters (in physical units)
        this.measurementRadius = 0.2; // Default: 0.2 in physical units

        // De-aliasing filter toggle (enabled by default)
        this.filterEnabled = true;

        // Calculate effective time step
        this.dtEffective = dt * timeScale;

        // Verify stability condition: dt < 2m*dx�/h
        const stabilityLimit = 2 * mass * dx * dx / hbar;
        if (this.dtEffective >= stabilityLimit) {
            console.warn(
                `Time step dt*timeScale = ${this.dtEffective} exceeds stability limit ${stabilityLimit}. ` +
                `Consider reducing dt or timeScale.`
            );
        }

        // Domain size
        this.domainSize = gridSize * dx;

        // Initialize wavefunction (position space)
        this.psi = new ComplexGrid(gridSize, gridSize);

        // Momentum space wavefunction (temporary buffer for FFT operations)
        this.psiMomentum = new ComplexGrid(gridSize, gridSize);

        // FFT object for 2D transforms
        this.fft = new FFT2D(gridSize, gridSize);

        // Precompute momentum space evolution operator
        this._precomputeMomentumOperator();

        // Potential well parameters (in fixed physical units)
        this.potentialType = 'none'; // Options: 'none', 'single', 'double', 'sinusoid', 'quadratic'
        this.potentialStrength = 1.0; // Depth of potential well (reduced for quantum tunneling)
        this.potentialStrengthScale = 1.0; // Scale multiplier for potential strength (0.1 to 10)
        this.potentialWidth = 2.0; // Fixed physical width (in natural units, independent of grid)

        // Precompute potential grid
        this.potential = new Float64Array(gridSize * gridSize);
        this._precomputePotential();

        // Precompute position space evolution operator for potential
        this.potentialOperatorHalf = new ComplexGrid(gridSize, gridSize);
        this._precomputePotentialOperator();

        // Time tracking
        this.time = 0;

        // Don't initialize here - let main.js initialize with values from controller
        // this.initialize();
    }

    /**
     * Precompute the momentum space evolution operator: e^(-ihk��t/2m)
     * where k� = kx� + ky� is the squared momentum magnitude
     *
     * For periodic boundary conditions with FFT, the momentum values are:
     * k[n] = 2�*n/L for n = 0, 1, ..., N/2-1, -N/2, ..., -1
     * where L = N*dx is the domain size
     *
     * Includes a de-aliasing filter to suppress high-frequency components
     * that would cause FFT aliasing artifacts (cross-pattern bands).
     * The filter uses the "2/3 rule" with smooth exponential decay.
     */
    _precomputeMomentumOperator() {
        const N = this.gridSize;
        const L = this.domainSize;
        const factor = -this.hbar * this.dtEffective / (2 * this.mass);

        // Maximum momentum (Nyquist limit)
        const kMax = Math.PI / this.dx;

        // De-aliasing filter parameters
        // Use gentle filtering starting at 0.9 of k_max to prevent severe aliasing
        // while minimizing non-physical damping
        const kFilter = 0.9 * kMax;
        const filterWidth = kMax - kFilter;

        // Store as complex grid for element-wise multiplication
        this.momentumOperator = new ComplexGrid(N, N);

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Momentum components (FFT ordering)
                const kx = (ix < N / 2) ? (2 * Math.PI * ix / L) : (2 * Math.PI * (ix - N) / L);
                const ky = (iy < N / 2) ? (2 * Math.PI * iy / L) : (2 * Math.PI * (iy - N) / L);

                // k� = kx� + ky�
                const k2 = kx * kx + ky * ky;
                const k = Math.sqrt(k2);

                // e^(-ihk��t/2m) = e^(i*phase) where phase = factor * k�
                const phase = factor * k2;

                // Compute complex exponential
                let opRe = Math.cos(phase);
                let opIm = Math.sin(phase);

                // Apply de-aliasing filter (if enabled)
                // Very gentle exponential filter that only suppresses the highest k components
                if (this.filterEnabled && k > kFilter) {
                    // Gentle exponential decay to minimize unphysical damping
                    const filterFactor = Math.exp(-Math.pow((k - kFilter) / filterWidth, 2));
                    opRe *= filterFactor;
                    opIm *= filterFactor;
                }

                // Store filtered operator
                this.momentumOperator.setReIm(ix, iy, opRe, opIm);
            }
        }
    }

    /**
     * Precompute the potential energy grid V(x,y)
     * Supports different potential types: none, single well, double well, sinusoid
     */
    _precomputePotential() {
        const N = this.gridSize;
        const sigma = this.potentialWidth;

        // Special case: freehand mode preserves user-drawn potential
        if (this.potentialType === 'freehand') {
            // Don't recompute - preserve user-drawn potential
            return;
        }

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                const x = ix * this.dx;
                const y = iy * this.dx;
                let V = 0;

                switch (this.potentialType) {
                    case 'none':
                        V = 0;
                        break;

                    case 'single':
                        // Single Gaussian well centered at the middle of the domain
                        const centerX = this.domainSize / 2;
                        const centerY = this.domainSize / 2;

                        // Distance from center (handling periodic boundaries)
                        let dx_single = Math.abs(x - centerX);
                        let dy_single = Math.abs(y - centerY);

                        if (dx_single > this.domainSize / 2) dx_single = this.domainSize - dx_single;
                        if (dy_single > this.domainSize / 2) dy_single = this.domainSize - dy_single;

                        const r2_single = dx_single * dx_single + dy_single * dy_single;

                        // Gaussian potential well: V(r) = -V₀ * exp(-r²/2σ²)
                        V = -this.potentialStrength * Math.exp(-r2_single / (2 * sigma * sigma));
                        break;

                    case 'double':
                        // Double well: two narrow Gaussian wells separated along y-axis
                        const centerXDouble = this.domainSize / 2;
                        const center1Y = this.domainSize / 3;
                        const center2Y = 2 * this.domainSize / 3;

                        // Use narrower sigma for distinct wells (1/3 of standard width)
                        const sigmaNarrow = sigma / 3;

                        // Distance from first well (handling periodic boundaries)
                        let dx1 = Math.abs(x - centerXDouble);
                        let dy1 = Math.abs(y - center1Y);
                        if (dx1 > this.domainSize / 2) dx1 = this.domainSize - dx1;
                        if (dy1 > this.domainSize / 2) dy1 = this.domainSize - dy1;
                        const r2_1 = dx1 * dx1 + dy1 * dy1;

                        // Distance from second well (handling periodic boundaries)
                        let dx2 = Math.abs(x - centerXDouble);
                        let dy2 = Math.abs(y - center2Y);
                        if (dx2 > this.domainSize / 2) dx2 = this.domainSize - dx2;
                        if (dy2 > this.domainSize / 2) dy2 = this.domainSize - dy2;
                        const r2_2 = dx2 * dx2 + dy2 * dy2;

                        // Sum of two narrow Gaussian wells
                        V = -this.potentialStrength * (
                            Math.exp(-r2_1 / (2 * sigmaNarrow * sigmaNarrow)) +
                            Math.exp(-r2_2 / (2 * sigmaNarrow * sigmaNarrow))
                        );
                        break;

                    case 'sinusoid':
                        // Sinusoidal potential across the y-axis
                        // Periodic with 3 complete periods: minima at y = 0, L/3, 2L/3
                        // V(y) = -V₀ * cos(2π * 3 * y / L) = -V₀ * cos(6π * y / L)
                        // This ensures periodicity: V(0) = V(L) = -V₀
                        V = -this.potentialStrength * Math.cos(6 * Math.PI * y / this.domainSize);
                        break;

                    case 'quadratic':
                        // Quadratic (harmonic oscillator) potential centered at domain center
                        // V(r) = k * r² where r is distance from center
                        // Using k = potentialStrength / (2 * sigma²) for comparable scaling
                        const centerXQuad = this.domainSize / 2;
                        const centerYQuad = this.domainSize / 2;

                        // Distance from center (handling periodic boundaries)
                        let dx_quad = Math.abs(x - centerXQuad);
                        let dy_quad = Math.abs(y - centerYQuad);

                        if (dx_quad > this.domainSize / 2) dx_quad = this.domainSize - dx_quad;
                        if (dy_quad > this.domainSize / 2) dy_quad = this.domainSize - dy_quad;

                        const r2_quad = dx_quad * dx_quad + dy_quad * dy_quad;

                        // Quadratic potential: V(r) = k * r² / (2 * sigma²)
                        // Scale factor chosen to give reasonable well depth comparable to Gaussian
                        const k = this.potentialStrength / (2 * sigma * sigma);
                        V = k * r2_quad;
                        break;

                    default:
                        V = 0;
                }

                // Apply strength scale multiplier
                this.potential[iy * N + ix] = V * this.potentialStrengthScale;
            }
        }
    }

    /**
     * Precompute position space evolution operator for potential: e^(-iVΔt/2ℏ)
     * Used in split-operator method (half time step for Strang splitting)
     */
    _precomputePotentialOperator() {
        const N = this.gridSize;
        const factor = -this.dtEffective / (2 * this.hbar);

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                const V = this.potential[iy * N + ix];
                const phase = factor * V;

                // e^(-iVΔt/2ℏ) = e^(i*phase)
                this.potentialOperatorHalf.setReIm(ix, iy, Math.cos(phase), Math.sin(phase));
            }
        }
    }

    /**
     * Initialize wavefunction with a Gaussian wavepacket
     * �(x,y,0) = A exp(-(x-x�)�/4ò - (y-y�)�/4ò) exp(i(px�x + py�y)/h)
     *
     * @param {object} params - Initialization parameters (ALL IN PHYSICAL UNITS)
     *   - centerX, centerY: Center position in physical coordinates (default: domainSize/2)
     *   - width: Gaussian width � in physical units (default: domainSize/20)
     *   - momentumX, momentumY: Initial momentum (default: 0)
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

        // Debug logging
        console.log('QuantumSimulation.initialize() called with:');
        console.log('  centerX (physical):', centerX, ', centerY (physical):', centerY);
        console.log('  width (physical):', width, ', sigma:', sigma);
        console.log('  momentumX:', momentumX, ', momentumY:', momentumY);
        console.log('  dx:', this.dx, ', gridSize:', N, ', domainSize:', this.domainSize);

        // Build Gaussian wavepacket
        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Physical position of this grid point
                const x = ix * this.dx;
                const y = iy * this.dx;

                // Center position (already in physical units)
                const x0 = centerX;
                const y0 = centerY;

                // Gaussian envelope
                const dx2 = (x - x0) * (x - x0);
                const dy2 = (y - y0) * (y - y0);
                const amplitude = Math.exp(-(dx2 + dy2) / (4 * sigma * sigma));

                // Phase from momentum: exp(i*p�r/h)
                const phase = (momentumX * x + momentumY * y) / this.hbar;

                // � = A * exp(-r�/4ò) * exp(i*p�r/h)
                const re = amplitude * Math.cos(phase);
                const im = amplitude * Math.sin(phase);

                this.psi.setReIm(ix, iy, re, im);
            }
        }

        // Debug: Check wavefunction before normalization
        const centerGridX = Math.floor(centerX / this.dx);
        const centerGridY = Math.floor(centerY / this.dx);
        const centerVal = this.psi.get(centerGridX, centerGridY);
        const centerAmp = Math.sqrt(centerVal.re * centerVal.re + centerVal.im * centerVal.im);
        const normBefore = Math.sqrt(this.psi.sumAbs2());
        console.log('  Before normalization:');
        console.log('    Center amplitude:', centerAmp.toFixed(6));
        console.log('    Norm:', normBefore.toFixed(6));

        // Normalize to unit total probability
        this.renormalize();

        // Debug: Check wavefunction after normalization
        const normAfter = Math.sqrt(this.psi.sumAbs2());
        const totalProb = this.getTotalProbability();
        console.log('  After normalization:');
        console.log('    Norm:', normAfter.toFixed(6));
        console.log('    Total probability:', totalProb.toFixed(8));

        // If freehand potential is active, attenuate wavefunction in high-potential regions
        // This ensures the wavefunction respects the drawn potential walls
        if (this.potentialType === 'freehand') {
            console.log('  Applying freehand potential attenuation...');

            // Attenuation strength parameter (higher = stronger suppression in walls)
            // Using 10.0 for strong attenuation while maintaining smoothness
            const attenuationStrength = 10.0;

            for (let iy = 0; iy < N; iy++) {
                for (let ix = 0; ix < N; ix++) {
                    const V = this.potential[iy * N + ix];

                    // Apply Gaussian attenuation: exp(-strength * |V|)
                    // For V=0: attenuation=1 (no change)
                    // For high |V|: attenuation→0 (strong suppression)
                    // Using abs(V) to handle both positive barriers and negative wells
                    const attenuation = Math.exp(-attenuationStrength * Math.abs(V));

                    // Apply attenuation to both real and imaginary parts
                    const re = this.psi.getRe(ix, iy);
                    const im = this.psi.getIm(ix, iy);
                    this.psi.setReIm(ix, iy, re * attenuation, im * attenuation);
                }
            }

            // Renormalize after attenuation to maintain unit probability
            this.renormalize();

            const normAfterAttenuation = Math.sqrt(this.psi.sumAbs2());
            const totalProbAfterAttenuation = this.getTotalProbability();
            console.log('  After attenuation and renormalization:');
            console.log('    Norm:', normAfterAttenuation.toFixed(6));
            console.log('    Total probability:', totalProbAfterAttenuation.toFixed(8));
        }

        // Reset time
        this.time = 0;
    }

    /**
     * Evolve the wavefunction by one time step using split-operator method
     *
     * For free particle (V=0), the evolution is:
     * �(t+�t) = exp(-i$�t/h) �(t)
     *         = exp(-iT�t/h) �(t)  where T = -h��/2m
     *
     * In momentum space, T is diagonal: T = h�k�/2m
     * So we use FFT to switch spaces:
     * 1. FFT: �(x) � �(k)
     * 2. Multiply by exp(-ihk��t/2m)
     * 3. IFFT: �(k) � �(x)
     */
    step() {
        const N = this.gridSize;

        // 1. Apply potential evolution (half step) if enabled
        if (this.potentialType !== 'none') {
            for (let i = 0; i < N * N; i++) {
                const idx = i * 2;

                const psiRe = this.psi.data[idx];
                const psiIm = this.psi.data[idx + 1];

                const opRe = this.potentialOperatorHalf.data[idx];
                const opIm = this.potentialOperatorHalf.data[idx + 1];

                // Complex multiplication
                this.psi.data[idx] = opRe * psiRe - opIm * psiIm;
                this.psi.data[idx + 1] = opRe * psiIm + opIm * psiRe;
            }
        }

        // 2. Transform to momentum space: �(k) = FFT[�(x)]
        this.psiMomentum.copy(this.psi);
        this.fft.forward(this.psiMomentum);

        // 3. Apply momentum space evolution operator: �(k) � exp(-ihk��t/2m) �(k)
        for (let i = 0; i < N * N; i++) {
            const idx = i * 2;

            // Get �(k)
            const psiRe = this.psiMomentum.data[idx];
            const psiIm = this.psiMomentum.data[idx + 1];

            // Get operator e^(i�)
            const opRe = this.momentumOperator.data[idx];
            const opIm = this.momentumOperator.data[idx + 1];

            // Complex multiplication: �_new = e^(i�) * �
            const newRe = opRe * psiRe - opIm * psiIm;
            const newIm = opRe * psiIm + opIm * psiRe;

            this.psiMomentum.data[idx] = newRe;
            this.psiMomentum.data[idx + 1] = newIm;
        }

        // 4. Transform back to position space: �(x) = IFFT[�(k)]
        this.fft.inverse(this.psiMomentum);
        this.psi.copy(this.psiMomentum);

        // 5. Apply potential evolution (half step) if enabled
        if (this.potentialType !== 'none') {
            for (let i = 0; i < N * N; i++) {
                const idx = i * 2;

                const psiRe = this.psi.data[idx];
                const psiIm = this.psi.data[idx + 1];

                const opRe = this.potentialOperatorHalf.data[idx];
                const opIm = this.potentialOperatorHalf.data[idx + 1];

                // Complex multiplication
                this.psi.data[idx] = opRe * psiRe - opIm * psiIm;
                this.psi.data[idx + 1] = opRe * psiIm + opIm * psiRe;
            }
        }

        // Update time
        this.time += this.dtEffective;
    }

    /**
     * Perform a quantum measurement at grid position (x, y)
     *
     * Integrates probability over the measurement region (Gaussian weighted)
     * to determine detection probability, matching the physical measurement apparatus
     *
     * @param {number} x - Grid x-coordinate (center of measurement)
     * @param {number} y - Grid y-coordinate (center of measurement)
     * @returns {object} - {found: boolean, probability: number}
     *   - found: true if particle detected in region, false if not detected
     *   - probability: integrated probability over measurement region
     */
    /**
     * Perform quantum measurement at physical coordinates (x, y)
     * @param {number} x - Physical x-coordinate
     * @param {number} y - Physical y-coordinate
     * @returns {object} - {found: boolean, probability: number}
     */
    measure(x, y) {
        const N = this.gridSize;
        const sigma = this.measurementRadius; // Physical units
        const x0 = x; // Already in physical units
        const y0 = y; // Already in physical units

        // Integrate probability over the measurement region
        // Sum probability weighted by Gaussian detector sensitivity
        // For a larger detector, we sum over more grid cells, capturing more probability
        let integratedProbability = 0;

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Handle periodic boundaries: find minimum distance considering wrapping
                let dx = Math.abs(ix * this.dx - x0);
                let dy = Math.abs(iy * this.dx - y0);

                // Wrap around if closer through periodic boundary
                if (dx > this.domainSize / 2) dx = this.domainSize - dx;
                if (dy > this.domainSize / 2) dy = this.domainSize - dy;

                const r2 = dx * dx + dy * dy;

                // Gaussian measurement sensitivity (detector response function)
                // For r << sigma: weight ≈ 1 (full sensitivity)
                // For r >> sigma: weight ≈ 0 (no sensitivity)
                const weight = Math.exp(-r2 / (2 * sigma * sigma));

                // Accumulate probability in detector region
                // Note: probability is already normalized (sum |ψ|² = 1)
                // so we just sum the weighted contributions
                integratedProbability += weight * this.getProbabilityAt(ix, iy);
            }
        }

        // Clamp to [0, 1] to ensure valid probability
        const probability = Math.min(1.0, integratedProbability);

        // Probabilistic measurement using Born rule with integrated probability
        const random = Math.random();
        const found = random < probability;

        // Perform appropriate collapse
        if (found) {
            this.collapsePositive(x, y);
        } else {
            this.collapseNegative(x, y);
        }

        return { found, probability };
    }

    /**
     * Collapse wavefunction based on positive measurement result
     * "Particle found at (x,y)"
     *
     * Implements the quantum posterior: ψ_collapsed(r) ∝ ψ_original(r) × detector_response(r)
     * This is the correct Born rule collapse where the wavefunction is projected
     * onto the measurement region weighted by the detector sensitivity.
     *
     * @param {number} x - Physical x-coordinate
     * @param {number} y - Physical y-coordinate
     */
    collapsePositive(x, y) {
        const N = this.gridSize;

        // Detector response function (Gaussian sensitivity)
        const sigma = this.measurementRadius; // Physical units
        const x0 = x; // Already in physical units
        const y0 = y; // Already in physical units

        // Apply projection: ψ_new(r) = ψ_old(r) × detector_response(r)
        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Handle periodic boundaries: find minimum distance considering wrapping
                let dx = Math.abs(ix * this.dx - x0);
                let dy = Math.abs(iy * this.dx - y0);

                // Wrap around if closer through periodic boundary
                if (dx > this.domainSize / 2) dx = this.domainSize - dx;
                if (dy > this.domainSize / 2) dy = this.domainSize - dy;

                const r2 = dx * dx + dy * dy;

                // Gaussian detector sensitivity (measurement operator)
                const weight = Math.exp(-r2 / (2 * sigma * sigma));

                // Project wavefunction: multiply by detector response
                // This preserves the relative amplitudes and phases within the detection region
                const re = this.psi.getRe(ix, iy);
                const im = this.psi.getIm(ix, iy);
                this.psi.setReIm(ix, iy, re * weight, im * weight);
            }
        }

        // Renormalize to unit probability
        this.renormalize();
    }

    /**
     * Zero out small region (negative measurement result)
     * "Particle NOT found at (x,y)"
     *
     * Zeros out a small Gaussian region instead of a single point to avoid
     * creating sharp discontinuities that cause FFT artifacts.
     *
     * @param {number} x - Grid x-coordinate
     * @param {number} y - Grid y-coordinate
     */
    /**
     * Collapse wavefunction based on negative measurement result
     * "Particle not found at (x,y)"
     *
     * @param {number} x - Physical x-coordinate
     * @param {number} y - Physical y-coordinate
     */
    collapseNegative(x, y) {
        const N = this.gridSize;

        // Zero out a small Gaussian region to avoid sharp discontinuities
        // Width controlled by measurementRadius (physical units)
        const sigma = this.measurementRadius; // Physical units
        const x0 = x; // Already in physical units
        const y0 = y; // Already in physical units

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Handle periodic boundaries: find minimum distance considering wrapping
                let dx = Math.abs(ix * this.dx - x0);
                let dy = Math.abs(iy * this.dx - y0);

                // Wrap around if closer through periodic boundary
                if (dx > this.domainSize / 2) dx = this.domainSize - dx;
                if (dy > this.domainSize / 2) dy = this.domainSize - dy;

                const r2 = dx * dx + dy * dy;

                // Apply Gaussian suppression (0 at center, 1 at distance)
                const suppression = 1.0 - Math.exp(-r2 / (2 * sigma * sigma));

                // Multiply wavefunction by suppression factor
                const re = this.psi.getRe(ix, iy);
                const im = this.psi.getIm(ix, iy);
                this.psi.setReIm(ix, iy, re * suppression, im * suppression);
            }
        }

        // Renormalize remaining wavefunction
        this.renormalize();
    }

    /**
     * Renormalize the wavefunction to unit total probability
     * Ensures sum |�|� = 1 (discrete normalization)
     */
    renormalize() {
        normalize(this.psi);
    }

    /**
     * Get probability density |�(x,y)|� at a specific grid point
     * @param {number} x - Grid x-coordinate
     * @param {number} y - Grid y-coordinate
     * @returns {number} - Probability density at (x,y)
     */
    getProbabilityAt(x, y) {
        return this.psi.getAbs2(x, y);
    }

    /**
     * Get probability density |�|� for the entire grid
     * @returns {Float64Array} - 2D array (flattened) of probability densities
     */
    getProbabilityDensity() {
        const N = this.gridSize;
        const density = new Float64Array(N * N);

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                density[iy * N + ix] = this.psi.getAbs2(ix, iy);
            }
        }

        return density;
    }

    /**
     * Get phase arg(�) for the entire grid
     * @returns {Float64Array} - 2D array (flattened) of phases in radians
     */
    getPhase() {
        const N = this.gridSize;
        const phase = new Float64Array(N * N);

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                phase[iy * N + ix] = this.psi.getArg(ix, iy);
            }
        }

        return phase;
    }

    /**
     * Get total probability (should be ~1 when normalized)
     * Useful for monitoring numerical accuracy
     * @returns {number} - Total probability sum |�|� (discrete normalization)
     */
    getTotalProbability() {
        // For discrete normalization, we use sumAbs2() directly
        // The wavefunction is normalized such that sum |�|� = 1
        return this.psi.sumAbs2();
    }

    /**
     * Get current wavefunction for direct access
     * @returns {ComplexGrid} - The wavefunction �(x,y)
     */
    getWavefunction() {
        return this.psi;
    }

    /**
     * Get current simulation time
     * @returns {number} - Current time in simulation units
     */
    getTime() {
        return this.time;
    }

    /**
     * Reset simulation to initial state
     * @param {object} params - Optional initialization parameters (same as initialize)
     */
    reset(params = {}) {
        this.initialize(params);
    }

    /**
     * Update time scale (evolution speed multiplier)
     * Note: Must recompute momentum operator with new effective dt
     * @param {number} newTimeScale - New time scale value
     */
    setTimeScale(newTimeScale) {
        this.timeScale = newTimeScale;
        this.dtEffective = this.dt * newTimeScale;

        // Verify stability condition with new time scale
        const stabilityLimit = 2 * this.mass * this.dx * this.dx / this.hbar;
        if (this.dtEffective >= stabilityLimit) {
            console.warn(
                `New time step dt*timeScale = ${this.dtEffective} exceeds stability limit ${stabilityLimit}. ` +
                `Consider reducing timeScale.`
            );
        }

        // Recompute momentum operator with new dt
        this._precomputeMomentumOperator();

        // Recompute potential operator with new dt
        this._precomputePotentialOperator();
    }

    /**
     * Update measurement radius multiplier
     * Controls the size of the Gaussian region affected by measurements
     * @param {number} multiplier - Radius in units of grid cell size (default: 1.5)
     */
    /**
     * Set the measurement radius in physical units
     * @param {number} radius - Measurement radius in physical units (0.05 to 2.0)
     */
    setMeasurementRadius(radius) {
        this.measurementRadius = Math.max(0.05, Math.min(2.0, radius));
    }

    /**
     * Set the potential type and recompute the potential grid
     * @param {string} type - Potential type: 'none', 'single', 'double', 'sinusoid', 'quadratic'
     */
    setPotentialType(type) {
        const validTypes = ['none', 'single', 'double', 'sinusoid', 'quadratic', 'freehand'];
        if (!validTypes.includes(type)) {
            console.warn(`Invalid potential type "${type}". Using "none".`);
            type = 'none';
        }

        this.potentialType = type;

        // Special handling for freehand mode
        if (type === 'freehand') {
            // Clear potential to start fresh drawing
            this.clearFreehandPotential();
        } else {
            // Recompute the potential grid with the new type
            this._precomputePotential();

            // Recompute the potential operator
            this._precomputePotentialOperator();
        }
    }

    /**
     * Get the current potential type
     * @returns {string} - Current potential type
     */
    getPotentialType() {
        return this.potentialType;
    }

    /**
     * Set the potential strength scale and recompute the potential grid
     * @param {number} scale - Strength scale multiplier (0.1 to 10, default 1.0)
     */
    setPotentialStrengthScale(scale) {
        // Clamp to valid range
        this.potentialStrengthScale = Math.max(0.1, Math.min(10.0, scale));

        // Recompute the potential grid with the new scale
        this._precomputePotential();

        // Recompute the potential operator
        this._precomputePotentialOperator();
    }

    /**
     * Enable or disable the de-aliasing filter
     * @param {boolean} enabled - True to enable filtering, false to disable
     */
    setFilterEnabled(enabled) {
        this.filterEnabled = enabled;
        // Recompute momentum operator with new filter setting
        this._precomputeMomentumOperator();
    }

    /**
     * Get the current filter enabled state
     * @returns {boolean} True if filter is enabled
     */
    isFilterEnabled() {
        return this.filterEnabled;
    }

    /**
     * Enable the potential well (deprecated - use setPotentialType instead)
     * Sets to 'single' well for backwards compatibility
     */
    enablePotential() {
        this.setPotentialType('single');
    }

    /**
     * Disable the potential well (deprecated - use setPotentialType instead)
     * Sets to 'none' for backwards compatibility
     */
    disablePotential() {
        this.setPotentialType('none');
    }

    /**
     * Toggle the potential well on/off (deprecated)
     * @returns {boolean} - New potential state (true = enabled)
     */
    togglePotential() {
        if (this.potentialType === 'none') {
            this.setPotentialType('single');
            return true;
        } else {
            this.setPotentialType('none');
            return false;
        }
    }

    /**
     * Check if potential is enabled (deprecated)
     * @returns {boolean} - True if potential is enabled
     */
    isPotentialEnabled() {
        return this.potentialType !== 'none';
    }

    /**
     * Get the potential energy grid V(x,y)
     * @returns {Float64Array} - 2D array (flattened) of potential values
     */
    getPotential() {
        return this.potential;
    }

    /**
     * Add potential at a specific grid location using Gaussian brush profile
     * Used for freehand drawing mode
     * @param {number} gridX - Grid X coordinate (0 to gridSize-1)
     * @param {number} gridY - Grid Y coordinate (0 to gridSize-1)
     * @param {number} strength - Energy value to add (can be negative for erasing)
     * @param {number} radius - Brush radius in physical units
     */
    addPotentialAt(gridX, gridY, strength, radius) {
        const N = this.gridSize;
        const sigma = radius;
        const x0 = gridX * this.dx;
        const y0 = gridY * this.dx;

        // Optimization: only update cells within 3σ (99.7% of Gaussian)
        const cellRadius = Math.ceil(3 * sigma / this.dx);
        const ixMin = Math.max(0, gridX - cellRadius);
        const ixMax = Math.min(N - 1, gridX + cellRadius);
        const iyMin = Math.max(0, gridY - cellRadius);
        const iyMax = Math.min(N - 1, gridY + cellRadius);

        for (let iy = iyMin; iy <= iyMax; iy++) {
            for (let ix = ixMin; ix <= ixMax; ix++) {
                const x = ix * this.dx;
                const y = iy * this.dx;

                // Handle periodic boundaries for distance calculation
                let dx = Math.abs(x - x0);
                let dy = Math.abs(y - y0);
                if (dx > this.domainSize / 2) dx = this.domainSize - dx;
                if (dy > this.domainSize / 2) dy = this.domainSize - dy;

                const r2 = dx * dx + dy * dy;

                // Gaussian brush profile: exp(-r²/(2σ²))
                const delta = strength * Math.exp(-r2 / (2 * sigma * sigma));
                this.potential[iy * N + ix] += delta;
            }
        }
    }

    /**
     * Finalize potential changes and recompute evolution operator
     * Call this after a series of addPotentialAt() calls (e.g., on mouseup)
     * to update the time evolution operator with the new potential
     */
    finalizePotentialChanges() {
        this._precomputePotentialOperator();
    }

    /**
     * Clear all freehand-drawn potential and reset to zero
     * Used when switching to freehand mode or clearing drawing
     */
    clearFreehandPotential() {
        const N = this.gridSize;
        for (let i = 0; i < N * N; i++) {
            this.potential[i] = 0;
        }
        this._precomputePotentialOperator();
    }

    /**
     * Set a uniform base potential value across the entire grid
     * @param {number} value - Base potential value (default: 0)
     */
    setBasePotential(value = 0) {
        const N = this.gridSize;
        for (let i = 0; i < N * N; i++) {
            this.potential[i] = value;
        }
        this._precomputePotentialOperator();
    }

    /**
     * Get simulation parameters
     * @returns {object} - Object containing all simulation parameters
     */
    getParameters() {
        return {
            gridSize: this.gridSize,
            dx: this.dx,
            dt: this.dt,
            dtEffective: this.dtEffective,
            hbar: this.hbar,
            mass: this.mass,
            boundaryCondition: this.boundaryCondition,
            timeScale: this.timeScale,
            domainSize: this.domainSize,
            time: this.time
        };
    }
}

export default QuantumSimulation;
