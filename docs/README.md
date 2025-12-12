# Documentation

This directory contains detailed technical documentation for the Quantum Particle Playground project.

## Architecture Documentation

### `ROOT_ARCHITECTURE.md`
Comprehensive overview of the entire project architecture:
- Project purpose and goals
- High-level design patterns (MVC architecture)
- Directory structure and organization
- Application initialization and data flow
- Technology stack and design decisions
- UI/UX structure
- Build and deployment approach

## Component Documentation

### `QUANTUM-ENGINE-README.md`
Detailed documentation of the quantum simulation engine:
- Split-operator method implementation
- Schrödinger equation solver
- Time evolution algorithms
- Numerical methods and accuracy

### `UTILITIES_README.md`
Documentation of utility functions and mathematical operations:
- Complex number operations
- Grid manipulations
- FFT utilities
- Coordinate transformations

### `BOUNDARY_CONDITIONS.md`
Technical documentation on boundary condition implementations:
- Periodic boundaries
- Boundary effects on simulation
- Edge case handling

### `BUILD_SUMMARY.md`
Build process and development workflow documentation:
- Development setup
- Build configuration
- Deployment process
- Performance optimization notes

## Design Documents

The `design/` subdirectory contains design documents and planning materials:

### `design/initial-design.md`
Original design document outlining:
- Initial project vision
- Feature requirements
- Architecture decisions
- Implementation roadmap

## Documentation Organization

Documentation is organized by purpose:
- **Architecture docs** (this directory): High-level structure and design
- **Component docs** (`js/README.md`, `lib/README.md`): Detailed implementation documentation
- **API docs** (inline comments): Function-level documentation in source code
- **User docs** (`README.md` in root): User-facing documentation

## For Developers

Start with these docs in order:
1. `ROOT_ARCHITECTURE.md` - Understand the overall structure
2. `js/README.md` - Learn about the main application code
3. `lib/README.md` - Understand the mathematical foundations
4. Component-specific docs - Deep dive into specific areas

## For Contributors

When adding new features or making significant changes:
1. Update relevant technical documentation
2. Add inline code comments for complex algorithms
3. Update the main `README.md` if user-facing behavior changes
4. Consider adding design documents for major architectural changes
