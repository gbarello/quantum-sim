#!/usr/bin/env node

/**
 * SelectControl - Node.js Test Suite
 * Tests the SelectControl implementation without browser dependencies
 */

import { BaseControl } from '../BaseControl.js';
import { ControlRegistry } from '../ControlRegistry.js';

// Mock DOM implementation for Node.js testing
global.document = {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      className: '',
      classList: {
        add: function(...classes) {
          classes.forEach(c => {
            if (!this.contains(c)) {
              this._list = this._list || [];
              this._list.push(c);
              element.className = this._list.join(' ');
            }
          });
        },
        remove: function(c) {
          this._list = this._list || [];
          this._list = this._list.filter(cls => cls !== c);
          element.className = this._list.join(' ');
        },
        contains: function(c) {
          this._list = this._list || [];
          return this._list.includes(c);
        },
        _list: []
      },
      style: {},
      attributes: {},
      children: [],
      options: [],
      get innerHTML() {
        return this._innerHTML || '';
      },
      set innerHTML(value) {
        this._innerHTML = value;
        // Clear children and options when innerHTML is set to empty
        if (value === '') {
          this.children = [];
          this.options = [];
        }
      },
      textContent: '',
      value: '',
      disabled: false,
      selected: false,
      selectedIndex: 0,
      setAttribute: function(key, value) {
        this.attributes[key] = value;
        if (key === 'class') this.className = value;
      },
      getAttribute: function(key) {
        return this.attributes[key];
      },
      appendChild: function(child) {
        this.children.push(child);
        if (this.tagName === 'SELECT' && child.tagName === 'OPTION') {
          this.options.push(child);
        }
        child.parentNode = this;
        return child;
      },
      removeChild: function(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
          child.parentNode = null;
        }
      },
      querySelector: function(selector) {
        if (selector === 'select') {
          return this.children.find(c => c.tagName === 'SELECT');
        }
        return null;
      },
      querySelectorAll: function(selector) {
        // Simple mock implementation - find matching elements recursively
        const results = [];
        const tags = selector.split(',').map(s => s.trim().toUpperCase());

        const findInChildren = (element) => {
          if (tags.includes(element.tagName)) {
            results.push(element);
          }
          if (element.children) {
            element.children.forEach(child => findInChildren(child));
          }
        };

        findInChildren(this);

        return results;
      },
      addEventListener: function() {},
      dispatchEvent: function() {}
    };
    return element;
  }
};

// Import SelectControl (this will also register it)
const { SelectControl } = await import('./SelectControl.js');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`✗ ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual:   ${JSON.stringify(actual)}`);
    testsFailed++;
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    console.error(`✗ ${message} (did not throw)`);
    testsFailed++;
  } catch (error) {
    console.log(`✓ ${message}`);
    testsPassed++;
  }
}

console.log('\n========================================');
console.log('SelectControl Test Suite');
console.log('========================================\n');

// Test 1: Registration
console.log('Test 1: Control Registration');
assert(
  ControlRegistry.has('select'),
  'SelectControl should be registered with type "select"'
);
console.log();

// Test 2: Basic instantiation
console.log('Test 2: Basic Instantiation');
const basicConfig = {
  id: 'test-select',
  label: 'Test Select',
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ],
  value: 'a'
};

let basicControl;
try {
  basicControl = new SelectControl(basicConfig);
  assert(true, 'Should create SelectControl instance');
  assertEquals(basicControl.id, 'test-select', 'Should set id correctly');
  assertEquals(basicControl.label, 'Test Select', 'Should set label correctly');
  assertEquals(basicControl._value, 'a', 'Should set initial value correctly');
} catch (error) {
  assert(false, `Should create SelectControl instance: ${error.message}`);
}
console.log();

// Test 3: Config validation
console.log('Test 3: Configuration Validation');
assertThrows(
  () => new SelectControl({ id: 'test', label: 'Test' }),
  'Should throw if options are missing'
);
assertThrows(
  () => new SelectControl({ id: 'test', label: 'Test', options: [] }),
  'Should throw if options array is empty'
);
assertThrows(
  () => new SelectControl({ id: 'test', label: 'Test', options: 'not-array' }),
  'Should throw if options is not an array'
);
console.log();

// Test 4: ControlRegistry.create
console.log('Test 4: Creating via ControlRegistry');
const registryConfig = {
  type: 'select',
  id: 'registry-select',
  label: 'Registry Select',
  options: [
    { value: 'x', label: 'Option X' },
    { value: 'y', label: 'Option Y' }
  ]
};

try {
  const registryControl = ControlRegistry.create(registryConfig);
  assert(true, 'Should create control via ControlRegistry.create');
  assert(
    registryControl instanceof SelectControl,
    'Should be instance of SelectControl'
  );
  assert(
    registryControl instanceof BaseControl,
    'Should be instance of BaseControl'
  );
} catch (error) {
  assert(false, `Should create via registry: ${error.message}`);
}
console.log();

// Test 5: Render
console.log('Test 5: Rendering');
const renderConfig = {
  id: 'render-test',
  label: 'Render Test',
  options: [
    { value: '1', label: 'One' },
    { value: '2', label: 'Two' },
    { value: '3', label: 'Three' }
  ],
  value: '2'
};

try {
  const renderControl = new SelectControl(renderConfig);
  const parent = document.createElement('div');
  const container = renderControl.render(parent);

  assert(container !== null, 'Should return container element');
  assert(
    container.classList.contains('select-control'),
    'Container should have select-control class'
  );
  assert(renderControl.selectElement !== null, 'Should create select element');
  assertEquals(
    renderControl.selectElement.options.length,
    3,
    'Should have correct number of options'
  );
  assertEquals(
    renderControl.selectElement.value,
    '2',
    'Should set initial value in DOM'
  );
} catch (error) {
  assert(false, `Render failed: ${error.message}`);
}
console.log();

// Test 6: getValue/setValue
console.log('Test 6: getValue/setValue');
const valueConfig = {
  id: 'value-test',
  label: 'Value Test',
  options: [
    { value: 'alpha', label: 'Alpha' },
    { value: 'beta', label: 'Beta' },
    { value: 'gamma', label: 'Gamma' }
  ],
  value: 'alpha'
};

try {
  const valueControl = new SelectControl(valueConfig);
  valueControl.render(document.createElement('div'));

  // Test getValue
  const initialValue = valueControl.getValue();
  assertEquals(initialValue, 'alpha', 'getValue should return initial value');

  // Test setValue
  valueControl.setValue('beta');
  assertEquals(valueControl.getValue(), 'beta', 'setValue should update value');

  // Test setValue with non-existent value (should warn but not crash)
  valueControl.setValue('nonexistent');
  // Value should remain unchanged
  assertEquals(
    valueControl.getValue(),
    'beta',
    'Invalid setValue should not change value'
  );
} catch (error) {
  assert(false, `getValue/setValue failed: ${error.message}`);
}
console.log();

// Test 7: Placeholder
console.log('Test 7: Placeholder Support');
const placeholderConfig = {
  id: 'placeholder-test',
  label: 'Placeholder Test',
  options: [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' }
  ],
  placeholder: 'Choose an option...'
};

try {
  const placeholderControl = new SelectControl(placeholderConfig);
  placeholderControl.render(document.createElement('div'));

  // With placeholder and no initial value, getValue should return null
  const value = placeholderControl.getValue();
  assertEquals(value, null, 'getValue should return null when placeholder selected');

  // Should have one extra option for placeholder
  assertEquals(
    placeholderControl.selectElement.options.length,
    3,
    'Should have placeholder + 2 regular options'
  );

  // First option should be placeholder
  const firstOption = placeholderControl.selectElement.options[0];
  assertEquals(firstOption.value, '', 'Placeholder option should have empty value');
  assert(firstOption.disabled, 'Placeholder option should be disabled');
} catch (error) {
  assert(false, `Placeholder test failed: ${error.message}`);
}
console.log();

// Test 8: Disabled options
console.log('Test 8: Disabled Options');
const disabledConfig = {
  id: 'disabled-test',
  label: 'Disabled Test',
  options: [
    { value: 'enabled1', label: 'Enabled 1' },
    { value: 'disabled1', label: 'Disabled 1', disabled: true },
    { value: 'enabled2', label: 'Enabled 2' }
  ],
  value: 'enabled1'
};

try {
  const disabledControl = new SelectControl(disabledConfig);
  disabledControl.render(document.createElement('div'));

  const disabledOption = disabledControl.selectElement.options[1];
  assert(disabledOption.disabled, 'Disabled option should be disabled');

  const enabledOption = disabledControl.selectElement.options[0];
  assert(!enabledOption.disabled, 'Enabled option should not be disabled');
} catch (error) {
  assert(false, `Disabled options test failed: ${error.message}`);
}
console.log();

// Test 9: setOptions
console.log('Test 9: Dynamic Options Update');
const dynamicConfig = {
  id: 'dynamic-test',
  label: 'Dynamic Test',
  options: [
    { value: 'original1', label: 'Original 1' },
    { value: 'original2', label: 'Original 2' }
  ],
  value: 'original1'
};

try {
  const dynamicControl = new SelectControl(dynamicConfig);
  dynamicControl.render(document.createElement('div'));

  assertEquals(
    dynamicControl.selectElement.options.length,
    2,
    'Should have 2 initial options'
  );

  // Update options
  const newOptions = [
    { value: 'new1', label: 'New 1' },
    { value: 'new2', label: 'New 2' },
    { value: 'new3', label: 'New 3' }
  ];
  dynamicControl.setOptions(newOptions);

  assertEquals(
    dynamicControl.selectElement.options.length,
    3,
    'Should have 3 options after update'
  );

  // Value should be reset since old value doesn't exist
  const newValue = dynamicControl.getValue();
  assertEquals(
    dynamicControl.selectElement.options[0].value,
    'new1',
    'First option should be new1'
  );
} catch (error) {
  assert(false, `Dynamic options test failed: ${error.message}`);
}
console.log();

// Test 10: Event emission
console.log('Test 10: Event System');
const eventConfig = {
  id: 'event-test',
  label: 'Event Test',
  options: [
    { value: 'e1', label: 'Event 1' },
    { value: 'e2', label: 'Event 2' }
  ],
  value: 'e1'
};

try {
  let changeEmitted = false;
  let emittedValue = null;

  const eventControl = new SelectControl(eventConfig);
  eventControl.render(document.createElement('div'));

  eventControl.on('change', (value) => {
    changeEmitted = true;
    emittedValue = value;
  });

  // Trigger change via setValue
  eventControl.setValue('e2');

  assert(changeEmitted, 'Should emit change event on setValue');
  assertEquals(emittedValue, 'e2', 'Should emit correct value');
} catch (error) {
  assert(false, `Event test failed: ${error.message}`);
}
console.log();

// Test 11: Viz-mode config from defaultConfig.js
console.log('Test 11: Viz-Mode Config (from defaultConfig.js)');
const vizModeConfig = {
  type: 'select',
  id: 'viz-mode',
  label: 'Visualization',
  options: [
    { value: 'complex', label: 'Complex (Phase + Amplitude)' },
    { value: 'probability', label: 'Probability Density Only' }
  ],
  value: 'probability'
};

try {
  const vizControl = ControlRegistry.create(vizModeConfig);
  vizControl.render(document.createElement('div'));

  assertEquals(
    vizControl.getValue(),
    'probability',
    'Should have correct initial value'
  );

  vizControl.setValue('complex');
  assertEquals(
    vizControl.getValue(),
    'complex',
    'Should update to complex mode'
  );

  vizControl.setValue('probability');
  assertEquals(
    vizControl.getValue(),
    'probability',
    'Should update to probability mode'
  );
} catch (error) {
  assert(false, `Viz-mode config test failed: ${error.message}`);
}
console.log();

// Test 12: Enable/Disable
console.log('Test 12: Enable/Disable');
const enableConfig = {
  id: 'enable-test',
  label: 'Enable Test',
  options: [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' }
  ],
  enabled: false
};

try {
  const enableControl = new SelectControl(enableConfig);
  enableControl.render(document.createElement('div'));

  assert(!enableControl.isEnabled(), 'Should start disabled');
  assert(enableControl.selectElement.disabled, 'Select element should be disabled');

  enableControl.enable();
  assert(enableControl.isEnabled(), 'Should be enabled after enable()');
  assert(!enableControl.selectElement.disabled, 'Select element should be enabled');

  enableControl.disable();
  assert(!enableControl.isEnabled(), 'Should be disabled after disable()');
  assert(enableControl.selectElement.disabled, 'Select element should be disabled');
} catch (error) {
  assert(false, `Enable/disable test failed: ${error.message}`);
}
console.log();

// Summary
console.log('========================================');
console.log('Test Summary');
console.log('========================================');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`\n✗ ${testsFailed} test(s) failed\n`);
  process.exit(1);
}
