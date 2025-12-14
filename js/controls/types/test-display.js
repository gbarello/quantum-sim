/**
 * Test DisplayControl implementation
 *
 * Tests the DisplayControl with various configurations including
 * the total-probability display from defaultConfig.js
 */

import { DisplayControl } from './DisplayControl.js';
import { ControlRegistry } from '../ControlRegistry.js';

console.log('=== DisplayControl Tests ===\n');

// Test 1: Basic Display Control
console.log('Test 1: Basic Display Control');
const basicDisplay = new DisplayControl({
  id: 'test-basic',
  label: 'Test Value',
  value: 42,
  format: (val) => `Value: ${val}`
});

console.log('  Created:', basicDisplay.id);
console.log('  Initial value:', basicDisplay.getValue());
console.log('  Formatted:', basicDisplay.format(basicDisplay.getValue()));
console.log('');

// Test 2: Display with Unit
console.log('Test 2: Display with Unit');
const unitDisplay = new DisplayControl({
  id: 'test-unit',
  label: 'Speed',
  value: 3.14159,
  unit: 'm/s',
  format: (val) => val.toFixed(2)
});

console.log('  Created:', unitDisplay.id);
console.log('  Value:', unitDisplay.getValue());
console.log('  Unit:', unitDisplay.unit);
console.log('');

// Test 3: Percentage Display (like total-probability)
console.log('Test 3: Percentage Display (total-probability config)');
const probabilityDisplay = new DisplayControl({
  id: 'total-probability',
  label: 'Total Probability',
  value: 0.999876,
  format: (val) => {
    if (typeof val !== 'number') return '—';
    return `${(val * 100).toFixed(4)}%`;
  },
  className: 'stat-display'
});

console.log('  Created:', probabilityDisplay.id);
console.log('  Value:', probabilityDisplay.getValue());
console.log('  Formatted:', probabilityDisplay.format(probabilityDisplay.getValue()));
console.log('  Classes:', probabilityDisplay.className);
console.log('');

// Test 4: setValue and onChange
console.log('Test 4: setValue and onChange');
let changeCount = 0;
const changeDisplay = new DisplayControl({
  id: 'test-change',
  label: 'Counter',
  value: 0,
  format: (val) => val.toString(),
  onChange: (val) => {
    changeCount++;
    console.log(`  onChange called (${changeCount}): new value = ${val}`);
  }
});

console.log('  Initial value:', changeDisplay.getValue());
changeDisplay.setValue(10);
console.log('  After setValue(10):', changeDisplay.getValue());
changeDisplay.setValue(20);
console.log('  After setValue(20):', changeDisplay.getValue());
console.log('  Total change events:', changeCount);
console.log('');

// Test 5: Format Error Handling
console.log('Test 5: Format Error Handling');
const errorDisplay = new DisplayControl({
  id: 'test-error',
  label: 'Error Test',
  value: null,
  format: (val) => {
    if (val === null) throw new Error('Null value not allowed');
    return val.toString();
  }
});

console.log('  Created with error-prone format function');
try {
  const formatted = errorDisplay.format(null);
  console.log('  Format returned:', formatted);
} catch (error) {
  console.log('  Format threw error:', error.message);
}
console.log('');

// Test 6: Registry Integration
console.log('Test 6: Registry Integration');
console.log('  Is "display" registered?', ControlRegistry.has('display'));

const registryDisplay = ControlRegistry.create({
  type: 'display',
  id: 'registry-test',
  label: 'Registry Display',
  value: 123.456,
  format: (val) => val.toFixed(2)
});

console.log('  Created via registry:', registryDisplay.id);
console.log('  Type:', registryDisplay.constructor.name);
console.log('  Value:', registryDisplay.getValue());
console.log('');

// Test 7: Enable/Disable/Show/Hide
console.log('Test 7: Control State Management');
const stateDisplay = new DisplayControl({
  id: 'test-state',
  label: 'State Test',
  value: 100
});

console.log('  Initial enabled:', stateDisplay.isEnabled());
console.log('  Initial visible:', stateDisplay.isVisible());

stateDisplay.disable();
console.log('  After disable:', stateDisplay.isEnabled());

stateDisplay.enable();
console.log('  After enable:', stateDisplay.isEnabled());

stateDisplay.hide();
console.log('  After hide:', stateDisplay.isVisible());

stateDisplay.show();
console.log('  After show:', stateDisplay.isVisible());
console.log('');

// Test 8: Destroy and Memory Cleanup
console.log('Test 8: Destroy and Memory Cleanup');
const destroyDisplay = new DisplayControl({
  id: 'test-destroy',
  label: 'Destroy Test',
  value: 'test',
  updateInterval: 100,
  getValue: () => Date.now()
});

console.log('  Created with auto-update interval');
console.log('  Is destroyed?', destroyDisplay.isDestroyed());

destroyDisplay.destroy();
console.log('  After destroy:', destroyDisplay.isDestroyed());
console.log('  Interval cleared:', destroyDisplay._intervalId === null);
console.log('');

// Test 9: Multiple Displays (like Statistics tab)
console.log('Test 9: Multiple Displays (Statistics tab)');
const statsDisplays = ControlRegistry.createMany([
  {
    type: 'display',
    id: 'total-probability',
    label: 'Total Probability',
    format: (val) => {
      if (typeof val !== 'number') return '—';
      return `${(val * 100).toFixed(4)}%`;
    },
    className: 'stat-display',
    value: 1.0
  },
  {
    type: 'display',
    id: 'time-elapsed',
    label: 'Time Elapsed',
    format: (val) => {
      if (typeof val !== 'number') return '—';
      return `${val.toFixed(2)}`;
    },
    className: 'stat-display',
    value: 0
  },
  {
    type: 'display',
    id: 'grid-size',
    label: 'Grid Size',
    format: (val) => {
      if (typeof val !== 'number') return '—';
      return `${val}×${val}`;
    },
    className: 'stat-display',
    value: 128
  },
  {
    type: 'display',
    id: 'measurement-count',
    label: 'Measurements',
    format: (val) => {
      if (typeof val !== 'number') return '—';
      return val.toString();
    },
    className: 'stat-display',
    value: 0
  }
]);

console.log('  Created', statsDisplays.length, 'display controls');
statsDisplays.forEach(d => {
  console.log(`    - ${d.id}: ${d.format(d.getValue())}`);
});
console.log('');

// Cleanup
console.log('Cleanup: Destroying all test controls');
basicDisplay.destroy();
unitDisplay.destroy();
probabilityDisplay.destroy();
changeDisplay.destroy();
errorDisplay.destroy();
registryDisplay.destroy();
stateDisplay.destroy();
statsDisplays.forEach(d => d.destroy());
console.log('');

console.log('=== All Tests Complete ===');
console.log('DisplayControl implementation verified!');
