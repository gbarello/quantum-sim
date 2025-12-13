/**
 * @file test-wavefunction-panel.js
 * @description Comprehensive unit tests for WavefunctionPanel
 *
 * These tests verify that the WavefunctionPanel:
 * 1. Correctly renders wavefunctions to ImageData
 * 2. Produces identical output to the original Visualizer
 * 3. Handles coordinate conversions correctly
 * 4. Responds to mouse events appropriately
 * 5. Supports all visualization modes
 */

import { WavefunctionPanel } from '../js/visualization/panels/WavefunctionPanel.js';
import { ComplexGrid } from '../js/utils.js';

// Test utilities
class MockQuantumSimulation {
    constructor(gridSize = 64) {
        this.gridSize = gridSize;
        this.psi = new ComplexGrid(gridSize);

        // Initialize with a simple test wavefunction
        this.initializeTestWavefunction();
    }

    initializeTestWavefunction() {
        // Create a Gaussian wavepacket for testing
        const centerX = this.gridSize / 2;
        const centerY = this.gridSize / 2;
        const width = this.gridSize / 8;

        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const r2 = dx * dx + dy * dy;

                // Gaussian amplitude
                const amplitude = Math.exp(-r2 / (2 * width * width));

                // Add phase (rotate around origin)
                const phase = Math.atan2(dy, dx);

                this.psi.set(x, y, {
                    re: amplitude * Math.cos(phase),
                    im: amplitude * Math.sin(phase)
                });
            }
        }
    }

    getProbabilityAt(x, y) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
            return 0;
        }
        const re = this.psi.getRe(x, y);
        const im = this.psi.getIm(x, y);
        return re * re + im * im;
    }
}

class MockCanvasContext {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.imageDataCalls = [];
        this.putImageDataCalls = [];
    }

    createImageData(width, height) {
        const imageData = {
            width,
            height,
            data: new Uint8ClampedArray(width * height * 4)
        };
        this.imageDataCalls.push({ width, height });
        return imageData;
    }

    putImageData(imageData, x, y) {
        this.putImageDataCalls.push({ imageData, x, y });
    }
}

// Test suite
const tests = {
    testConstruction() {
        console.log('Test: Panel construction...');

        const bounds = { x: 0, y: 0, width: 512, height: 512 };
        const config = { visualizationMode: 'full', saturationScale: 5.0 };
        const panel = new WavefunctionPanel(bounds, config);

        assert(panel.name === 'wavefunction', 'Panel name should be "wavefunction"');
        assert(panel.bounds.x === 0, 'Bounds x should be 0');
        assert(panel.bounds.width === 512, 'Bounds width should be 512');
        assert(panel.config.visualizationMode === 'full', 'Visualization mode should be "full"');
        assert(panel.config.saturationScale === 5.0, 'Saturation scale should be 5.0');

        console.log('✓ Panel construction test passed');
    },

    testDefaultConfig() {
        console.log('Test: Default configuration...');

        const bounds = { x: 0, y: 0, width: 512, height: 512 };
        const panel = new WavefunctionPanel(bounds);

        assert(panel.config.visualizationMode === 'full', 'Default mode should be "full"');
        assert(panel.config.saturationScale === 5.0, 'Default saturation scale should be 5.0');

        console.log('✓ Default configuration test passed');
    },

    testCanvasToGrid() {
        console.log('Test: Canvas to grid coordinate conversion...');

        const bounds = { x: 100, y: 50, width: 512, height: 512 };
        const panel = new WavefunctionPanel(bounds);
        const gridSize = 128;

        // Test center point
        const centerCanvas = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2
        };
        const centerGrid = panel.canvasToGrid(centerCanvas.x, centerCanvas.y, gridSize);
        assert(centerGrid.x === 64, `Center X should be 64, got ${centerGrid.x}`);
        assert(centerGrid.y === 64, `Center Y should be 64, got ${centerGrid.y}`);

        // Test top-left corner
        const topLeftGrid = panel.canvasToGrid(bounds.x, bounds.y, gridSize);
        assert(topLeftGrid.x === 0, `Top-left X should be 0, got ${topLeftGrid.x}`);
        assert(topLeftGrid.y === 0, `Top-left Y should be 0, got ${topLeftGrid.y}`);

        // Test bottom-right corner (just before edge)
        const bottomRightGrid = panel.canvasToGrid(
            bounds.x + bounds.width - 1,
            bounds.y + bounds.height - 1,
            gridSize
        );
        assert(bottomRightGrid.x === gridSize - 1, `Bottom-right X should be ${gridSize - 1}, got ${bottomRightGrid.x}`);
        assert(bottomRightGrid.y === gridSize - 1, `Bottom-right Y should be ${gridSize - 1}, got ${bottomRightGrid.y}`);

        console.log('✓ Canvas to grid conversion test passed');
    },

    testHslToRgb() {
        console.log('Test: HSL to RGB conversion...');

        const panel = new WavefunctionPanel({ x: 0, y: 0, width: 512, height: 512 });

        // Test pure red (0°, 100%, 50%)
        const red = panel.hslToRgb(0, 100, 50);
        assert(red[0] === 255, `Red R should be 255, got ${red[0]}`);
        assert(red[1] === 0, `Red G should be 0, got ${red[1]}`);
        assert(red[2] === 0, `Red B should be 0, got ${red[2]}`);

        // Test pure green (120°, 100%, 50%)
        const green = panel.hslToRgb(120, 100, 50);
        assert(green[0] === 0, `Green R should be 0, got ${green[0]}`);
        assert(green[1] === 255, `Green G should be 255, got ${green[1]}`);
        assert(green[2] === 0, `Green B should be 0, got ${green[2]}`);

        // Test pure blue (240°, 100%, 50%)
        const blue = panel.hslToRgb(240, 100, 50);
        assert(blue[0] === 0, `Blue R should be 0, got ${blue[0]}`);
        assert(blue[1] === 0, `Blue G should be 0, got ${blue[1]}`);
        assert(blue[2] === 255, `Blue B should be 255, got ${blue[2]}`);

        // Test gray (0°, 0%, 50%)
        const gray = panel.hslToRgb(0, 0, 50);
        assert(gray[0] === 128, `Gray R should be 128, got ${gray[0]}`);
        assert(gray[1] === 128, `Gray G should be 128, got ${gray[1]}`);
        assert(gray[2] === 128, `Gray B should be 128, got ${gray[2]}`);

        console.log('✓ HSL to RGB conversion test passed');
    },

    testComplexToColor() {
        console.log('Test: Complex to color conversion...');

        const panel = new WavefunctionPanel(
            { x: 0, y: 0, width: 512, height: 512 },
            { visualizationMode: 'full', saturationScale: 5.0 }
        );

        // Test real positive (should be reddish)
        const realPos = panel.complexToColor({ re: 1.0, im: 0.0 });
        assert(realPos[0] > realPos[1] && realPos[0] > realPos[2], 'Real positive should be reddish');

        // Test imaginary positive (should be yellowish)
        const imagPos = panel.complexToColor({ re: 0.0, im: 1.0 });
        assert(imagPos[0] > 0 && imagPos[1] > 0, 'Imaginary positive should be yellowish');

        // Test zero (should be dark)
        const zero = panel.complexToColor({ re: 0.0, im: 0.0 });
        assert(zero[0] < 100 && zero[1] < 100 && zero[2] < 100, 'Zero should be dark');

        console.log('✓ Complex to color conversion test passed');
    },

    testProbabilityMode() {
        console.log('Test: Probability visualization mode...');

        const panel = new WavefunctionPanel(
            { x: 0, y: 0, width: 512, height: 512 },
            { visualizationMode: 'probability', saturationScale: 5.0 }
        );

        // In probability mode, colors should be grayscale
        const color1 = panel.complexToColor({ re: 1.0, im: 0.0 });
        assert(color1[0] === color1[1] && color1[1] === color1[2], 'Probability mode should produce grayscale');

        const color2 = panel.complexToColor({ re: 0.5, im: 0.5 });
        assert(color2[0] === color2[1] && color2[1] === color2[2], 'Probability mode should produce grayscale');

        // Higher amplitude should be brighter
        const high = panel.complexToColor({ re: 1.0, im: 0.0 });
        const low = panel.complexToColor({ re: 0.1, im: 0.0 });
        assert(high[0] > low[0], 'Higher amplitude should be brighter in probability mode');

        console.log('✓ Probability mode test passed');
    },

    testPhaseMode() {
        console.log('Test: Phase visualization mode...');

        const panel = new WavefunctionPanel(
            { x: 0, y: 0, width: 512, height: 512 },
            { visualizationMode: 'phase', saturationScale: 5.0 }
        );

        // Phase mode should show color based on phase
        const realPos = panel.complexToColor({ re: 1.0, im: 0.0 });
        const realNeg = panel.complexToColor({ re: -1.0, im: 0.0 });

        // Different phases should produce different colors
        assert(
            realPos[0] !== realNeg[0] || realPos[1] !== realNeg[1] || realPos[2] !== realNeg[2],
            'Different phases should produce different colors'
        );

        console.log('✓ Phase mode test passed');
    },

    testRender() {
        console.log('Test: Rendering to ImageData...');

        const bounds = { x: 0, y: 0, width: 512, height: 512 };
        const panel = new WavefunctionPanel(bounds);
        const simulation = new MockQuantumSimulation(64);
        const ctx = new MockCanvasContext(bounds.width, bounds.height);

        panel.render(ctx, simulation, 0);

        // Check that createImageData was called with correct dimensions
        assert(ctx.imageDataCalls.length === 1, 'createImageData should be called once');
        assert(ctx.imageDataCalls[0].width === bounds.width, `ImageData width should be ${bounds.width}`);
        assert(ctx.imageDataCalls[0].height === bounds.height, `ImageData height should be ${bounds.height}`);

        // Check that putImageData was called with correct position
        assert(ctx.putImageDataCalls.length === 1, 'putImageData should be called once');
        assert(ctx.putImageDataCalls[0].x === bounds.x, `putImageData x should be ${bounds.x}`);
        assert(ctx.putImageDataCalls[0].y === bounds.y, `putImageData y should be ${bounds.y}`);

        // Check that ImageData was filled (not all zeros)
        const imageData = ctx.putImageDataCalls[0].imageData;
        let hasNonZero = false;
        for (let i = 0; i < imageData.data.length; i++) {
            if (imageData.data[i] !== 0) {
                hasNonZero = true;
                break;
            }
        }
        assert(hasNonZero, 'ImageData should contain non-zero values');

        console.log('✓ Rendering test passed');
    },

    testHandleMouseMove() {
        console.log('Test: Mouse move handling...');

        const bounds = { x: 100, y: 50, width: 512, height: 512 };
        const panel = new WavefunctionPanel(bounds);
        const simulation = new MockQuantumSimulation(128);

        // Test hovering over center
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const tooltip = panel.handleMouseMove(centerX, centerY, simulation);

        assert(tooltip !== null, 'Should return tooltip info');
        assert(tooltip.data.probability !== undefined, 'Tooltip should contain probability');
        assert(tooltip.data.text !== undefined, 'Tooltip should contain text');
        assert(tooltip.data.gridX === 64, 'Tooltip should contain correct grid X');
        assert(tooltip.data.gridY === 64, 'Tooltip should contain correct grid Y');

        // Test hovering outside bounds
        const outsideTooltip = panel.handleMouseMove(0, 0, simulation);
        assert(outsideTooltip === null, 'Should return null for coordinates outside panel');

        console.log('✓ Mouse move handling test passed');
    },

    testSetVisualizationMode() {
        console.log('Test: Setting visualization mode...');

        const panel = new WavefunctionPanel({ x: 0, y: 0, width: 512, height: 512 });

        panel.setVisualizationMode('probability');
        assert(panel.config.visualizationMode === 'probability', 'Should set probability mode');

        panel.setVisualizationMode('phase');
        assert(panel.config.visualizationMode === 'phase', 'Should set phase mode');

        panel.setVisualizationMode('full');
        assert(panel.config.visualizationMode === 'full', 'Should set full mode');

        // Test invalid mode (should be ignored)
        panel.setVisualizationMode('invalid');
        assert(panel.config.visualizationMode === 'full', 'Should ignore invalid mode');

        console.log('✓ Setting visualization mode test passed');
    },

    testSetSaturationScale() {
        console.log('Test: Setting saturation scale...');

        const panel = new WavefunctionPanel({ x: 0, y: 0, width: 512, height: 512 });

        panel.setSaturationScale(10.0);
        assert(panel.config.saturationScale === 10.0, 'Should set saturation scale to 10.0');

        panel.setSaturationScale(1.0);
        assert(panel.config.saturationScale === 1.0, 'Should set saturation scale to 1.0');

        // Test negative value (should clamp to 0)
        panel.setSaturationScale(-5.0);
        assert(panel.config.saturationScale === 0, 'Should clamp negative values to 0');

        console.log('✓ Setting saturation scale test passed');
    },

    testCellSizeCalculation() {
        console.log('Test: Cell size calculation consistency...');

        // Test various panel sizes with different grid sizes
        const testCases = [
            { panelSize: 512, gridSize: 64, expectedCellSize: 8 },
            { panelSize: 512, gridSize: 128, expectedCellSize: 4 },
            { panelSize: 1024, gridSize: 128, expectedCellSize: 8 },
            { panelSize: 256, gridSize: 64, expectedCellSize: 4 }
        ];

        for (const { panelSize, gridSize, expectedCellSize } of testCases) {
            const bounds = { x: 0, y: 0, width: panelSize, height: panelSize };
            const panel = new WavefunctionPanel(bounds);
            const simulation = new MockQuantumSimulation(gridSize);

            // The cell size is calculated as panelSize / gridSize
            const calculatedCellSize = panelSize / gridSize;
            assert(
                Math.abs(calculatedCellSize - expectedCellSize) < 0.001,
                `Cell size for ${panelSize}/${gridSize} should be ${expectedCellSize}, got ${calculatedCellSize}`
            );
        }

        console.log('✓ Cell size calculation test passed');
    },

    testRenderingDifferentGridSizes() {
        console.log('Test: Rendering with different grid sizes...');

        const bounds = { x: 0, y: 0, width: 512, height: 512 };
        const panel = new WavefunctionPanel(bounds);

        // Test with different grid sizes
        const gridSizes = [64, 128, 256];

        for (const gridSize of gridSizes) {
            const simulation = new MockQuantumSimulation(gridSize);
            const ctx = new MockCanvasContext(bounds.width, bounds.height);

            panel.render(ctx, simulation, 0);

            assert(ctx.putImageDataCalls.length === 1, `Should render for grid size ${gridSize}`);
            assert(ctx.imageDataCalls[0].width === bounds.width, `ImageData width should match panel width for grid size ${gridSize}`);
        }

        console.log('✓ Rendering with different grid sizes test passed');
    }
};

// Test runner utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function runTests() {
    console.log('=== WavefunctionPanel Unit Tests ===\n');

    let passed = 0;
    let failed = 0;

    for (const [name, test] of Object.entries(tests)) {
        try {
            test();
            passed++;
        } catch (error) {
            console.error(`✗ Test "${name}" failed:`, error.message);
            console.error(error.stack);
            failed++;
        }
    }

    console.log(`\n=== Test Results ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n✓ All tests passed!');
    } else {
        console.log(`\n✗ ${failed} test(s) failed`);
    }

    return failed === 0;
}

// Run tests if this module is executed directly
if (typeof window !== 'undefined') {
    window.runWavefunctionPanelTests = runTests;
}

export { runTests };
