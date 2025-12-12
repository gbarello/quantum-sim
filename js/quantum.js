/**
 * quantum.js - Core quantum physics engine
 *
 * Implements the time-dependent Schrodinger equation evolution using:
 * - Split-operator method for time evolution
 * - FFT-based momentum space evolution
 * - Gaussian wavepacket initialization
 * - Quantum measurements with wavefunction collapse
 * - Periodic boundary conditions
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

        // Measurement parameters
        this.measurementRadiusMultiplier = 1.5; // Default: 1.5 grid cells

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

        // Potential well parameters
        this.potentialType = 'none'; // Options: 'none', 'single', 'double', 'sinusoid'
        this.potentialStrength = 50.0; // Depth of potential well
        this.potentialWidth = this.domainSize / 4; // Standard deviation = 1/4 of domain

        // Precompute potential grid
        this.potential = new Float64Array(gridSize * gridSize);
        this._precomputePotential();

        // Precompute position space evolution operator for potential
        this.potentialOperatorHalf = new ComplexGrid(gridSize, gridSize);
        this._precomputePotentialOperator();

        // Time tracking
        this.time = 0;

        // Initialize with default Gaussian wavepacket
        this.initialize();
    }

    /**
     * Precompute the momentum space evolution operator: e^(-ihk��t/2m)
     * where k� = kx� + ky� is the squared momentum magnitude
     *
     * For periodic boundary conditions with FFT, the momentum values are:
     * k[n] = 2�*n/L for n = 0, 1, ..., N/2-1, -N/2, ..., -1
     * where L = N*dx is the domain size
     */
    _precomputeMomentumOperator() {
        const N = this.gridSize;
        const L = this.domainSize;
        const factor = -this.hbar * this.dtEffective / (2 * this.mass);

        // Store as complex grid for element-wise multiplication
        this.momentumOperator = new ComplexGrid(N, N);

        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Momentum components (FFT ordering)
                const kx = (ix < N / 2) ? (2 * Math.PI * ix / L) : (2 * Math.PI * (ix - N) / L);
                const ky = (iy < N / 2) ? (2 * Math.PI * iy / L) : (2 * Math.PI * (iy - N) / L);

                // k� = kx� + ky�
                const k2 = kx * kx + ky * ky;

                // e^(-ihk��t/2m) = e^(i*phase) where phase = factor * k�
                const phase = factor * k2;

                // Store as complex exponential
                this.momentumOperator.setReIm(ix, iy, Math.cos(phase), Math.sin(phase));
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

                    default:
                        V = 0;
                }

                this.potential[iy * N + ix] = V;
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
     * @param {object} params - Initialization parameters
     *   - centerX, centerY: Center position (default: grid center)
     *   - width: Gaussian width � (default: 3*dx)
     *   - momentumX, momentumY: Initial momentum (default: 0)
     */
    initialize(params = {}) {
        const {
            centerX = this.gridSize / 2,
            centerY = this.gridSize / 2,
            width = 3 * this.dx,
            momentumX = 0,
            momentumY = 0
        } = params;

        const N = this.gridSize;
        const sigma = width;

        // Build Gaussian wavepacket
        for (let iy = 0; iy < N; iy++) {
            for (let ix = 0; ix < N; ix++) {
                // Physical position
                const x = ix * this.dx;
                const y = iy * this.dx;

                // Center position
                const x0 = centerX * this.dx;
                const y0 = centerY * this.dx;

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

        // Normalize to unit total probability
        this.renormalize();

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
    measure(x, y) {
        const N = this.gridSize;
        const sigma = this.measurementRadiusMultiplier * this.dx;
        const x0 = x * this.dx;
        const y0 = y * this.dx;

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
     * @param {number} x - Grid x-coordinate
     * @param {number} y - Grid y-coordinate
     */
    collapsePositive(x, y) {
        const N = this.gridSize;

        // Detector response function (Gaussian sensitivity)
        const sigma = this.measurementRadiusMultiplier * this.dx;
        const x0 = x * this.dx;
        const y0 = y * this.dx;

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
    collapseNegative(x, y) {
        const N = this.gridSize;

        // Zero out a small Gaussian region to avoid sharp discontinuities
        // Width controlled by measurementRadiusMultiplier
        const sigma = this.measurementRadiusMultiplier * this.dx;
        const x0 = x * this.dx;
        const y0 = y * this.dx;

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
    setMeasurementRadius(multiplier) {
        this.measurementRadiusMultiplier = Math.max(0.5, Math.min(10.0, multiplier));
    }

    /**
     * Set the potential type and recompute the potential grid
     * @param {string} type - Potential type: 'none', 'single', 'double', 'sinusoid'
     */
    setPotentialType(type) {
        const validTypes = ['none', 'single', 'double', 'sinusoid'];
        if (!validTypes.includes(type)) {
            console.warn(`Invalid potential type "${type}". Using "none".`);
            type = 'none';
        }

        this.potentialType = type;

        // Recompute the potential grid with the new type
        this._precomputePotential();

        // Recompute the potential operator
        this._precomputePotentialOperator();
    }

    /**
     * Get the current potential type
     * @returns {string} - Current potential type
     */
    getPotentialType() {
        return this.potentialType;
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
