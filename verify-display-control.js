/**
 * Verify DisplayControl implementation against specification
 * Reference: controls-refactor.md lines 482-495
 */

import { DisplayControl } from './js/controls/types/DisplayControl.js';
import { ControlRegistry } from './js/controls/ControlRegistry.js';

console.log('=== DisplayControl Specification Verification ===\n');

const checks = [];

// Check 1: Extends BaseControl
checks.push({
  name: 'Extends BaseControl',
  pass: DisplayControl.prototype.constructor.name === 'DisplayControl' &&
        Object.getPrototypeOf(DisplayControl.prototype).constructor.name === 'BaseControl'
});

// Check 2: render() method exists
checks.push({
  name: 'render() method implemented',
  pass: typeof DisplayControl.prototype.render === 'function'
});

// Check 3: getValue() method exists
checks.push({
  name: 'getValue() method implemented',
  pass: typeof DisplayControl.prototype.getValue === 'function'
});

// Check 4: setValue() method exists
checks.push({
  name: 'setValue(value) method implemented',
  pass: typeof DisplayControl.prototype.setValue === 'function'
});

// Check 5: Supports value config
const testControl = new DisplayControl({
  id: 'test',
  label: 'Test',
  value: 42
});
checks.push({
  name: 'Supports value property',
  pass: testControl.value === 42
});

// Check 6: Supports format function
const formatControl = new DisplayControl({
  id: 'format-test',
  label: 'Format Test',
  value: 3.14159,
  format: (val) => val.toFixed(2)
});
checks.push({
  name: 'Supports format function',
  pass: formatControl.format(3.14159) === '3.14'
});

// Check 7: Supports updateInterval
const intervalControl = new DisplayControl({
  id: 'interval-test',
  label: 'Interval Test',
  updateInterval: 100
});
checks.push({
  name: 'Supports updateInterval property',
  pass: intervalControl.updateInterval === 100
});

// Check 8: Supports className
const classControl = new DisplayControl({
  id: 'class-test',
  label: 'Class Test',
  className: 'stat-display'
});
checks.push({
  name: 'Supports className property',
  pass: classControl.className === 'stat-display'
});

// Check 9: Registered with ControlRegistry
checks.push({
  name: 'Registered with ControlRegistry as "display"',
  pass: ControlRegistry.has('display')
});

// Check 10: Destroy clears interval
const destroyControl = new DisplayControl({
  id: 'destroy-test',
  label: 'Destroy Test',
  updateInterval: 100,
  getValue: () => 42
});
destroyControl._startAutoUpdate();
const hadInterval = destroyControl._intervalId !== null;
destroyControl.destroy();
const clearedInterval = destroyControl._intervalId === null;
checks.push({
  name: 'destroy() clears interval',
  pass: hadInterval && clearedInterval
});

// Check 11: Unit property support
const unitControl = new DisplayControl({
  id: 'unit-test',
  label: 'Unit Test',
  value: 100,
  unit: 'ms'
});
checks.push({
  name: 'Supports unit property',
  pass: unitControl.unit === 'ms'
});

// Check 12: setManager method exists
checks.push({
  name: 'setManager() method implemented',
  pass: typeof DisplayControl.prototype.setManager === 'function'
});

// Print results
console.log('Verification Results:\n');
checks.forEach((check, index) => {
  const status = check.pass ? '✓' : '✗';
  console.log(`${index + 1}. [${status}] ${check.name}`);
});

const passCount = checks.filter(c => c.pass).length;
const totalCount = checks.length;
console.log(`\n${passCount}/${totalCount} checks passed\n`);

if (passCount === totalCount) {
  console.log('=== All Specification Requirements Met ===');
  process.exit(0);
} else {
  console.log('=== Some Requirements Not Met ===');
  process.exit(1);
}
