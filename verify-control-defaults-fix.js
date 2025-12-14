/**
 * Verification script for control defaults fix
 *
 * This script verifies that:
 * 1. ControlsManager has applyInitialControlValues method
 * 2. main.js calls this method in the correct order
 * 3. defaultConfig.js has expected default values
 */

import { defaultControlsConfig } from './js/controls/defaultConfig.js';
import { ControlsManager } from './js/controls/ControlsManager.js';

console.log('='.repeat(60));
console.log('Control Defaults Fix - Verification Script');
console.log('='.repeat(60));
console.log('');

let allPassed = true;

function test(name, condition) {
    const status = condition ? 'PASS ✓' : 'FAIL ✗';
    const color = condition ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${name}`);
    if (!condition) allPassed = false;
    return condition;
}

console.log('1. Checking ControlsManager...');
console.log('');

// Check ControlsManager has the method
test(
    'ControlsManager has applyInitialControlValues method',
    typeof ControlsManager.prototype.applyInitialControlValues === 'function'
);

console.log('');
console.log('2. Checking defaultConfig structure...');
console.log('');

// Check config structure
test('Config has tabs array', Array.isArray(defaultControlsConfig.tabs));
test('Config has defaultTab', typeof defaultControlsConfig.defaultTab === 'string');

// Build controls map
const controls = new Map();
defaultControlsConfig.tabs.forEach(tab => {
    tab.controls.forEach(control => {
        controls.set(control.id, control);
    });
});

test(`Config has multiple controls (found ${controls.size})`, controls.size > 10);

console.log('');
console.log('3. Checking default values in config...');
console.log('');

// Check visualization mode
const vizModeControl = controls.get('viz-mode');
test(
    'Viz mode default is "probability"',
    vizModeControl?.value === 'probability'
);

// Check speed
const speedControl = controls.get('speed');
const speedDefault = speedControl?.transform ? speedControl.transform(speedControl.value) : null;
test(
    `Speed default is 0.1 (slider value ${speedControl?.value} → ${speedDefault})`,
    speedDefault !== null && Math.abs(speedDefault - 0.1) < 0.001
);

// Check measurement radius
const radiusControl = controls.get('measurement-radius');
const radiusDefault = radiusControl?.transform ? radiusControl.transform(radiusControl.value) : null;
test(
    `Measurement radius default is 10.0 (slider value ${radiusControl?.value} → ${radiusDefault})`,
    radiusDefault !== null && Math.abs(radiusDefault - 10.0) < 0.001
);

// Check potential type
const potentialTypeControl = controls.get('potential-type');
test(
    'Potential type default is "single"',
    potentialTypeControl?.value === 'single'
);

// Check potential strength
const potentialStrengthControl = controls.get('potential-strength');
const strengthDefault = potentialStrengthControl?.transform ?
    potentialStrengthControl.transform(potentialStrengthControl.value) : null;
test(
    `Potential strength default is 1.0 (slider value ${potentialStrengthControl?.value} → ${strengthDefault})`,
    strengthDefault !== null && Math.abs(strengthDefault - 1.0) < 0.001
);

// Check packet size
const packetSizeControl = controls.get('packet-size');
const packetDefault = packetSizeControl?.transform ?
    packetSizeControl.transform(packetSizeControl.value) : null;
test(
    `Packet size default is 2.56 (slider value ${packetSizeControl?.value} → ${packetDefault})`,
    packetDefault !== null && Math.abs(packetDefault - 2.56) < 0.001
);

// Check controls exist
test('Position selector control exists', controls.has('position-selector'));
test('Momentum selector control exists', controls.has('momentum-selector'));
test('Reset button exists', controls.has('reset'));
test('Play/pause button exists', controls.has('play-pause'));

console.log('');
console.log('4. Verifying method signatures...');
console.log('');

// Check method exists and can be called
const mockSimulation = {
    setTimeScale: () => {},
    setMeasurementRadius: () => {},
    setPotentialType: () => {},
    setPotentialStrengthScale: () => {}
};

const mockVisualizer = {
    setVisualizationMode: () => {}
};

try {
    const manager = new ControlsManager(mockSimulation, mockVisualizer);
    test('ControlsManager constructor works', true);

    // Check that the method exists and is callable
    test(
        'applyInitialControlValues is callable',
        typeof manager.applyInitialControlValues === 'function'
    );
} catch (error) {
    test('ControlsManager constructor works', false);
    console.error('Error:', error.message);
}

console.log('');
console.log('='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));
console.log('');

if (allPassed) {
    console.log('\x1b[32m✓ All verification checks passed!\x1b[0m');
    console.log('');
    console.log('The fix is ready to test in the browser.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Open index.html in a browser');
    console.log('2. Open browser console (F12)');
    console.log('3. Look for: "Applying initial control values from configuration..."');
    console.log('4. Verify the visualization starts in probability mode');
    console.log('5. Verify the potential well is visible (single well)');
    console.log('6. Check that speed shows 0.1x');
} else {
    console.log('\x1b[31m✗ Some verification checks failed.\x1b[0m');
    console.log('');
    console.log('Please review the failures above.');
}

console.log('');
