# Test Scripts and Utilities

This directory contains test scripts and validation utilities for the Quantum Particle Playground project.

## Test Scripts

### `test-quantum.js`
Core quantum simulation tests. Validates the quantum mechanics engine including:
- Wavefunction normalization
- Time evolution accuracy
- FFT transformations
- Probability conservation

### `test-integrated-measurement.js`
Tests the measurement system and wavefunction collapse:
- Born rule probability calculations
- Position measurement accuracy
- Wavefunction collapse behavior
- Post-measurement state validation

### `measurement-artifact-test.js`
Tests for measurement artifacts and edge cases:
- Boundary condition effects
- Numerical precision issues
- Measurement resolution limits

### `boundary-check.js`
Validates boundary condition implementations:
- Periodic boundaries
- Reflective boundaries (if implemented)
- Edge case handling

### `validate.js`
General validation script for overall system integrity:
- Configuration validation
- Numerical stability checks
- Performance benchmarks

### `example-usage.js`
Example code demonstrating how to use the quantum simulation API:
- Creating simulations
- Setting up initial conditions
- Running time evolution
- Performing measurements

## Test Utilities

### `test-utils.html`
HTML-based test runner and utility visualizer. Provides a browser-based interface for running tests and visualizing results.

## Running Tests

Most test scripts can be run directly with Node.js:

```bash
node test-quantum.js
node test-integrated-measurement.js
node boundary-check.js
node validate.js
```

For browser-based testing, open `test-utils.html` in a web browser.

## Test Coverage

The test suite covers:
- **Physics accuracy**: Schrödinger equation solution correctness
- **Numerical stability**: FFT round-trip accuracy, conservation laws
- **Measurement theory**: Born rule, collapse mechanics
- **Boundary conditions**: Periodic wrapping, edge behavior
- **Integration**: Component interaction and data flow

## Adding New Tests

When adding new tests:
1. Follow the existing naming convention (`test-*.js` or `*-test.js`)
2. Include clear assertions and expected outcomes
3. Test both normal operation and edge cases
4. Document the test purpose at the top of the file
5. Update this README with a description of the new test
