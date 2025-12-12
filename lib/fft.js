/**
 * FFT.js - Fast Fourier Transform Library
 *
 * High-performance, pure JavaScript implementation of the Fast Fourier Transform
 * using the Cooley-Tukey radix-2 algorithm.
 *
 * Features:
 * - Optimized for power-of-2 sizes (64, 128, 256, 512, etc.)
 * - Precomputed twiddle factors for maximum performance
 * - Precomputed bit-reversal table
 * - In-place and out-of-place transforms
 * - Forward and inverse transforms
 * - Float64Array for high precision (critical for quantum mechanics)
 *
 * Used for split-operator time evolution in quantum simulation:
 * - Position space → Momentum space (forward FFT)
 * - Momentum space → Position space (inverse FFT)
 *
 * Algorithm: Cooley-Tukey FFT with radix-2 decimation-in-time
 * Time Complexity: O(N log N)
 * Space Complexity: O(N) for precomputed tables
 *
 * @class FFT
 * @author Quantum Playground Team
 */

export default class FFT {
    /**
     * Create an FFT instance for a specific size
     * Precomputes twiddle factors and bit-reversal table for optimal performance
     * @param {number} size - Transform size (must be a power of 2: 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, ...)
     * @throws {Error} If size is not a power of 2
     */
    constructor(size) {
        this.size = size;

        // Verify size is a power of 2 (required for Cooley-Tukey algorithm)
        if ((size & (size - 1)) !== 0) {
            throw new Error(`FFT size must be a power of 2, got ${size}`);
        }

        if (size < 2) {
            throw new Error(`FFT size must be at least 2, got ${size}`);
        }

        // Cache log2(size) for bit-reversal
        this._log2Size = Math.log2(size);

        // Precompute bit-reversal table for performance
        // This maps each index to its bit-reversed counterpart
        // Example for size=8: [0,4,2,6,1,5,3,7]
        this._bitrev = new Uint32Array(size);
        for (let i = 0; i < size; i++) {
            this._bitrev[i] = this._reverseBits(i, this._log2Size);
        }

        // Precompute twiddle factors: W_N^k = e^(-2πi*k/N)
        // These are the complex exponentials used in butterfly operations
        // W_N^k = cos(-2πk/N) + i*sin(-2πk/N)
        // Store as separate cos/sin tables for efficiency
        this._cosTable = new Float64Array(size / 2);
        this._sinTable = new Float64Array(size / 2);
        for (let i = 0; i < size / 2; i++) {
            const angle = -2 * Math.PI * i / size;
            this._cosTable[i] = Math.cos(angle);
            this._sinTable[i] = Math.sin(angle);
        }
    }

    /**
     * Reverse the bits of n using the specified number of bits
     * Used for bit-reversal permutation in FFT
     * Example: reverseBits(6, 3) = 3  (binary: 110 → 011)
     * @private
     * @param {number} n - Number to reverse
     * @param {number} bits - Number of bits to consider
     * @returns {number} Bit-reversed number
     */
    _reverseBits(n, bits) {
        let reversed = 0;
        for (let i = 0; i < bits; i++) {
            reversed = (reversed << 1) | (n & 1);
            n >>= 1;
        }
        return reversed;
    }

    /**
     * Create a complex array in interleaved format
     * Format: [re0, im0, re1, im1, re2, im2, ...]
     * @returns {Float64Array} Complex array initialized to zeros
     */
    createComplexArray() {
        return new Float64Array(this.size * 2);
    }

    /**
     * Convert separate real and imaginary arrays to interleaved complex array
     * @param {Array|Float64Array} real - Real parts
     * @param {Array|Float64Array} [imag=null] - Imaginary parts (default: zeros)
     * @returns {Float64Array} Interleaved complex array
     */
    toComplexArray(real, imag = null) {
        const complex = this.createComplexArray();
        for (let i = 0; i < this.size; i++) {
            complex[i * 2] = real[i];
            complex[i * 2 + 1] = imag ? imag[i] : 0;
        }
        return complex;
    }

    /**
     * Extract real parts from interleaved complex array
     * @param {Float64Array} complex - Interleaved complex array
     * @param {Float64Array} [storage=null] - Optional output array
     * @returns {Float64Array} Real parts
     */
    fromComplexArray(complex, storage = null) {
        const real = storage || new Float64Array(this.size);
        for (let i = 0; i < this.size; i++) {
            real[i] = complex[i * 2];
        }
        return real;
    }

    /**
     * Forward FFT: transform input to output
     *
     * Performs Discrete Fourier Transform (DFT) using the Fast Fourier Transform algorithm.
     * Transforms time/position domain to frequency/momentum domain.
     *
     * Algorithm steps:
     * 1. Bit-reversal permutation
     * 2. Iterative Cooley-Tukey butterfly operations
     *
     * @param {Float64Array} output - Output array (interleaved complex format)
     * @param {Float64Array} input - Input array (interleaved complex format)
     * @returns {Float64Array} Output array (same as output parameter)
     *
     * @example
     * const fft = new FFT(8);
     * const input = fft.toComplexArray([1, 2, 3, 4, 5, 6, 7, 8]);
     * const output = fft.createComplexArray();
     * fft.transform(output, input);
     */
    transform(output, input) {
        const size = this.size;

        // Step 1: Bit-reversal permutation
        // Reorder input data according to bit-reversed indices
        if (output !== input) {
            // Out-of-place: direct copy with bit-reversal
            for (let i = 0; i < size; i++) {
                const j = this._bitrev[i];
                output[i * 2] = input[j * 2];
                output[i * 2 + 1] = input[j * 2 + 1];
            }
        } else {
            // In-place: swap elements (only need to swap each pair once)
            for (let i = 0; i < size; i++) {
                const j = this._bitrev[i];
                if (j > i) {
                    // Swap complex numbers at positions i and j
                    const tempRe = output[i * 2];
                    const tempIm = output[i * 2 + 1];
                    output[i * 2] = output[j * 2];
                    output[i * 2 + 1] = output[j * 2 + 1];
                    output[j * 2] = tempRe;
                    output[j * 2 + 1] = tempIm;
                }
            }
        }

        // Step 2: Cooley-Tukey FFT
        // Iteratively combine small DFTs into larger ones
        // len: current DFT size (2, 4, 8, ..., size)
        for (let len = 2; len <= size; len <<= 1) {
            const halfLen = len >> 1;
            const tableStep = size / len;

            // Process each DFT of size 'len'
            for (let i = 0; i < size; i += len) {
                let k = 0;

                // Butterfly operations for this DFT
                for (let j = 0; j < halfLen; j++) {
                    const idx1 = (i + j) * 2;
                    const idx2 = (i + j + halfLen) * 2;

                    // Get twiddle factor W_N^k = e^(-2πi*k/N)
                    const wRe = this._cosTable[k];
                    const wIm = this._sinTable[k];

                    // Compute t = W_N^k * output[idx2]
                    // Complex multiplication: (a + bi) * (c + di) = (ac - bd) + (ad + bc)i
                    const tRe = wRe * output[idx2] - wIm * output[idx2 + 1];
                    const tIm = wRe * output[idx2 + 1] + wIm * output[idx2];

                    // Butterfly operation:
                    // output[idx1] = output[idx1] + t
                    // output[idx2] = output[idx1] - t
                    const tempRe = output[idx1];
                    const tempIm = output[idx1 + 1];

                    output[idx1] = tempRe + tRe;
                    output[idx1 + 1] = tempIm + tIm;

                    output[idx2] = tempRe - tRe;
                    output[idx2 + 1] = tempIm - tIm;

                    k += tableStep;
                }
            }
        }

        return output;
    }

    /**
     * Inverse FFT: transform input to output
     *
     * Performs Inverse Discrete Fourier Transform (IDFT).
     * Transforms frequency/momentum domain back to time/position domain.
     *
     * Implementation: Use forward FFT with conjugation and normalization
     * IFFT(x) = (1/N) * conj(FFT(conj(x)))
     *
     * @param {Float64Array} output - Output array (interleaved complex format)
     * @param {Float64Array} input - Input array (interleaved complex format)
     * @returns {Float64Array} Output array (same as output parameter)
     *
     * @example
     * const fft = new FFT(8);
     * const freq = fft.createComplexArray();
     * fft.transform(freq, input);
     * const reconstructed = fft.createComplexArray();
     * fft.inverseTransform(reconstructed, freq);
     * // reconstructed should equal input
     */
    inverseTransform(output, input) {
        const size = this.size;

        // Step 1: Conjugate input (negate imaginary parts)
        const conjugated = this.createComplexArray();
        for (let i = 0; i < size; i++) {
            conjugated[i * 2] = input[i * 2];
            conjugated[i * 2 + 1] = -input[i * 2 + 1];
        }

        // Step 2: Forward transform
        this.transform(output, conjugated);

        // Step 3: Conjugate and normalize output
        // Divide by N and negate imaginary parts
        for (let i = 0; i < size; i++) {
            output[i * 2] /= size;
            output[i * 2 + 1] = -output[i * 2 + 1] / size;
        }

        return output;
    }

    /**
     * Real-valued FFT (optimized for real input)
     *
     * For now, uses the complex FFT with zero imaginary parts.
     * Future optimization: use real FFT algorithm for 2x speedup.
     *
     * @param {Float64Array} output - Output array (interleaved complex format)
     * @param {Array|Float64Array} input - Real input array
     * @returns {Float64Array} Output array
     */
    realTransform(output, input) {
        const complex = this.toComplexArray(input);
        return this.transform(output, complex);
    }

    /**
     * Real-valued inverse FFT
     *
     * @param {Float64Array} output - Output array (interleaved complex format)
     * @param {Float64Array} input - Complex input array (interleaved format)
     * @returns {Float64Array} Output array
     */
    realInverseTransform(output, input) {
        return this.inverseTransform(output, input);
    }

    /**
     * Get the size of this FFT instance
     * @returns {number} FFT size
     */
    getSize() {
        return this.size;
    }

    /**
     * Check if a number is a valid FFT size (power of 2)
     * @param {number} n - Number to check
     * @returns {boolean} True if n is a power of 2
     */
    static isPowerOf2(n) {
        return n > 0 && (n & (n - 1)) === 0;
    }

    /**
     * Find the next power of 2 greater than or equal to n
     * Useful for padding data to FFT-friendly size
     * @param {number} n - Input number
     * @returns {number} Next power of 2
     */
    static nextPowerOf2(n) {
        if (n <= 0) return 1;
        n--;
        n |= n >> 1;
        n |= n >> 2;
        n |= n >> 4;
        n |= n >> 8;
        n |= n >> 16;
        return n + 1;
    }
}
