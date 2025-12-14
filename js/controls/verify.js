#!/usr/bin/env node

/**
 * Verification Script for Phase 1 Implementation
 *
 * This script verifies that the Phase 1 implementation is complete
 * and working correctly by running a series of automated tests.
 */

import { BaseControl } from './BaseControl.js';
import { ControlRegistry } from './ControlRegistry.js';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ${colors.reset} ${msg}`);
}

function section(msg) {
  console.log(`\n${colors.cyan}${msg}${colors.reset}`);
  console.log('='.repeat(60));
}

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    pass(message);
    testsPassed++;
  } else {
    fail(message);
    testsFailed++;
  }
}

// ============================================================================
// Define Test Control
// ============================================================================

class TestControl extends BaseControl {
  render(parentElement) {
    this.container = this._createContainer();
    const label = this._createLabel(this.id);
    const div = document.createElement('div');
    div.textContent = this.getValue();

    this.container.appendChild(label);
    this.container.appendChild(div);

    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  getValue() {
    return this._value !== undefined ? this._value : this.defaultValue;
  }

  setValue(value) {
    this._value = value;
    this.emit('change', value);
  }
}

// ============================================================================
// Tests
// ============================================================================

section('Phase 1 Verification Tests');

// Test 1: BaseControl exists and is a class
section('Test 1: BaseControl Class');
assert(typeof BaseControl === 'function', 'BaseControl is a function/class');
assert(BaseControl.name === 'BaseControl', 'BaseControl has correct name');

// Test 2: ControlRegistry exists and has static methods
section('Test 2: ControlRegistry Class');
assert(typeof ControlRegistry === 'function', 'ControlRegistry is a function/class');
assert(typeof ControlRegistry.register === 'function', 'ControlRegistry.register exists');
assert(typeof ControlRegistry.create === 'function', 'ControlRegistry.create exists');
assert(typeof ControlRegistry.has === 'function', 'ControlRegistry.has exists');
assert(typeof ControlRegistry.getTypes === 'function', 'ControlRegistry.getTypes exists');
assert(typeof ControlRegistry.validate === 'function', 'ControlRegistry.validate exists');

// Test 3: Registration
section('Test 3: Control Registration');
try {
  ControlRegistry.register('test', TestControl);
  pass('Successfully registered control type');
  testsPassed++;
} catch (error) {
  fail('Failed to register control type: ' + error.message);
  testsFailed++;
}

assert(ControlRegistry.has('test'), 'Registry has registered type');
assert(ControlRegistry.getTypes().includes('test'), 'Type appears in getTypes()');

// Test 4: Creation
section('Test 4: Control Creation');
let control;
try {
  control = ControlRegistry.create({
    type: 'test',
    id: 'test-control',
    label: 'Test Control',
    defaultValue: 'initial'
  });
  pass('Successfully created control');
  testsPassed++;
} catch (error) {
  fail('Failed to create control: ' + error.message);
  testsFailed++;
}

assert(control instanceof BaseControl, 'Control is instance of BaseControl');
assert(control instanceof TestControl, 'Control is instance of TestControl');
assert(control.id === 'test-control', 'Control has correct id');
assert(control.label === 'Test Control', 'Control has correct label');

// Test 5: Value Operations
section('Test 5: Value Operations');
assert(control.getValue() === 'initial', 'Initial value is correct');

control.setValue('updated');
assert(control.getValue() === 'updated', 'Updated value is correct');

// Test 6: Event System
section('Test 6: Event System');
let eventFired = false;
let eventData = null;

control.on('change', (data) => {
  eventFired = true;
  eventData = data;
});

control.setValue('test-value');
assert(eventFired, 'Event was fired');
assert(eventData === 'test-value', 'Event data is correct');

// Test multiple listeners
let listener1Called = false;
let listener2Called = false;

control.on('custom', () => { listener1Called = true; });
control.on('custom', () => { listener2Called = true; });
control.emit('custom');

assert(listener1Called && listener2Called, 'Multiple listeners called');

// Test 7: State Management
section('Test 7: State Management');
assert(control.isEnabled(), 'Control initially enabled');
control.disable();
assert(!control.isEnabled(), 'Control disabled');
control.enable();
assert(control.isEnabled(), 'Control re-enabled');

assert(control.isVisible(), 'Control initially visible');
control.hide();
assert(!control.isVisible(), 'Control hidden');
control.show();
assert(control.isVisible(), 'Control visible again');

// Test 8: Validation
section('Test 8: Configuration Validation');
const validConfig = {
  type: 'test',
  id: 'valid',
  label: 'Valid'
};
const validResult = ControlRegistry.validate(validConfig);
assert(validResult.valid === true, 'Valid config passes validation');
assert(validResult.errors.length === 0, 'Valid config has no errors');

const invalidConfig = {
  type: 'test'
  // Missing id and label
};
const invalidResult = ControlRegistry.validate(invalidConfig);
assert(invalidResult.valid === false, 'Invalid config fails validation');
assert(invalidResult.errors.length > 0, 'Invalid config has errors');

// Test 9: Error Handling
section('Test 9: Error Handling');
let errorCaught = false;

try {
  ControlRegistry.create({
    type: 'test'
    // Missing required fields
  });
} catch (error) {
  errorCaught = true;
  pass('Missing required fields throws error');
  testsPassed++;
}

if (!errorCaught) {
  fail('Missing required fields should throw error');
  testsFailed++;
}

errorCaught = false;
try {
  ControlRegistry.create({
    type: 'nonexistent',
    id: 'test',
    label: 'Test'
  });
} catch (error) {
  errorCaught = true;
  pass('Unknown type throws error');
  testsPassed++;
}

if (!errorCaught) {
  fail('Unknown type should throw error');
  testsFailed++;
}

// Test 10: Cleanup
section('Test 10: Cleanup');
assert(!control.isDestroyed(), 'Control not destroyed initially');
control.destroy();
assert(control.isDestroyed(), 'Control destroyed');
assert(control.container === null, 'Container reference cleared');

// Try to use destroyed control
let warningLogged = false;
const originalWarn = console.warn;
console.warn = (msg) => {
  if (msg.includes('destroyed')) {
    warningLogged = true;
  }
};

control.emit('test');
console.warn = originalWarn;

assert(warningLogged, 'Warning logged when using destroyed control');

// Test 11: Batch Creation
section('Test 11: Batch Operations');
const configs = [
  { type: 'test', id: 'batch-1', label: 'Batch 1' },
  { type: 'test', id: 'batch-2', label: 'Batch 2' },
  { type: 'test', id: 'batch-3', label: 'Batch 3' }
];

let batchControls;
try {
  batchControls = ControlRegistry.createMany(configs);
  pass('Successfully created multiple controls');
  testsPassed++;
} catch (error) {
  fail('Failed to create multiple controls: ' + error.message);
  testsFailed++;
}

assert(Array.isArray(batchControls), 'createMany returns array');
assert(batchControls.length === 3, 'Created correct number of controls');
assert(batchControls.every(c => c instanceof BaseControl), 'All are BaseControl instances');

// Cleanup batch controls
batchControls.forEach(c => c.destroy());

// ============================================================================
// Summary
// ============================================================================

section('Test Summary');
const total = testsPassed + testsFailed;
console.log(`\nTotal Tests: ${total}`);
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

if (testsFailed === 0) {
  console.log(`\n${colors.green}✓ All tests passed! Phase 1 is complete.${colors.reset}`);
  console.log(`\n${colors.cyan}Ready to proceed to Phase 2.${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.red}✗ Some tests failed. Please review the implementation.${colors.reset}`);
  process.exit(1);
}
