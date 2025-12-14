/**
 * Validation script for ControlPanel implementation
 * Run this to verify the ControlPanel class meets all requirements
 */

import { ControlPanel } from './ControlPanel.js';
import { ControlRegistry } from './ControlRegistry.js';
import { SliderControl } from './types/SliderControl.js';
import { ButtonControl } from './types/ButtonControl.js';
import { DisplayControl } from './types/DisplayControl.js';

// Register control types
ControlRegistry.register('slider', SliderControl);
ControlRegistry.register('button', ButtonControl);
ControlRegistry.register('display', DisplayControl);

// Test results collector
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    results.failed++;
    results.errors.push({ name, error: error.message });
    console.error(`✗ ${name}: ${error.message}`);
  }
}

console.log('='.repeat(70));
console.log('ControlPanel Validation Suite');
console.log('='.repeat(70));
console.log();

// =================================================================
// Constructor Tests
// =================================================================
console.log('Constructor Tests:');
console.log('-'.repeat(70));

test('Constructor requires id', () => {
  try {
    new ControlPanel({ title: 'Test' });
    throw new Error('Should have thrown error for missing id');
  } catch (error) {
    if (!error.message.includes('id is required')) {
      throw new Error('Wrong error message');
    }
  }
});

test('Constructor requires title', () => {
  try {
    new ControlPanel({ id: 'test' });
    throw new Error('Should have thrown error for missing title');
  } catch (error) {
    if (!error.message.includes('title is required')) {
      throw new Error('Wrong error message');
    }
  }
});

test('Constructor accepts valid config', () => {
  const panel = new ControlPanel({
    id: 'test-panel',
    title: 'Test Panel'
  });

  if (panel.id !== 'test-panel') throw new Error('ID not set correctly');
  if (panel.title !== 'Test Panel') throw new Error('Title not set correctly');
});

test('Constructor sets optional properties', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    icon: '🔧',
    collapsible: true,
    collapsed: true,
    className: 'custom-class'
  });

  if (panel.icon !== '🔧') throw new Error('Icon not set');
  if (!panel.collapsible) throw new Error('Collapsible not set');
  if (!panel.collapsed) throw new Error('Collapsed not set');
  if (panel.className !== 'custom-class') throw new Error('ClassName not set');
});

test('Constructor creates controls from config', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    controls: [
      { type: 'slider', id: 'slider1', label: 'Slider 1', min: 0, max: 100 },
      { type: 'button', id: 'button1', label: 'Button 1', onClick: () => {} }
    ]
  });

  if (panel.getControlCount() !== 2) {
    throw new Error(`Expected 2 controls, got ${panel.getControlCount()}`);
  }
});

console.log();

// =================================================================
// Control Management Tests
// =================================================================
console.log('Control Management Tests:');
console.log('-'.repeat(70));

test('addControl() adds control to panel', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  const control = ControlRegistry.create({
    type: 'slider',
    id: 'test-slider',
    label: 'Test',
    min: 0,
    max: 100
  });

  panel.addControl(control);

  if (panel.getControlCount() !== 1) throw new Error('Control not added');
  if (!panel.hasControl('test-slider')) throw new Error('Control not in map');
});

test('addControl() rejects duplicate IDs', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  const control1 = ControlRegistry.create({
    type: 'slider',
    id: 'test-slider',
    label: 'Test',
    min: 0,
    max: 100
  });
  const control2 = ControlRegistry.create({
    type: 'button',
    id: 'test-slider', // Same ID
    label: 'Test',
    onClick: () => {}
  });

  panel.addControl(control1);

  try {
    panel.addControl(control2);
    throw new Error('Should have rejected duplicate ID');
  } catch (error) {
    if (!error.message.includes('already exists')) {
      throw new Error('Wrong error message');
    }
  }
});

test('getControl() retrieves control by ID', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  const control = ControlRegistry.create({
    type: 'slider',
    id: 'my-slider',
    label: 'Test',
    min: 0,
    max: 100
  });

  panel.addControl(control);

  const retrieved = panel.getControl('my-slider');
  if (retrieved !== control) throw new Error('Retrieved wrong control');
});

test('getControl() returns undefined for non-existent ID', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  const result = panel.getControl('non-existent');

  if (result !== undefined) throw new Error('Should return undefined');
});

test('removeControl() removes control', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  const control = ControlRegistry.create({
    type: 'slider',
    id: 'remove-me',
    label: 'Test',
    min: 0,
    max: 100
  });

  panel.addControl(control);
  if (panel.getControlCount() !== 1) throw new Error('Control not added');

  const removed = panel.removeControl('remove-me');
  if (!removed) throw new Error('removeControl returned false');
  if (panel.getControlCount() !== 0) throw new Error('Control not removed');
  if (panel.hasControl('remove-me')) throw new Error('Control still in map');
});

test('removeControl() returns false for non-existent control', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  const result = panel.removeControl('non-existent');

  if (result !== false) throw new Error('Should return false');
});

test('getAllControls() returns array of controls', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });

  panel.addControl(ControlRegistry.create({
    type: 'slider',
    id: 's1',
    label: 'Test',
    min: 0,
    max: 100
  }));

  panel.addControl(ControlRegistry.create({
    type: 'button',
    id: 'b1',
    label: 'Test',
    onClick: () => {}
  }));

  const controls = panel.getAllControls();
  if (!Array.isArray(controls)) throw new Error('Should return array');
  if (controls.length !== 2) throw new Error('Wrong array length');
});

console.log();

// =================================================================
// Lifecycle Tests
// =================================================================
console.log('Lifecycle Tests:');
console.log('-'.repeat(70));

test('render() creates DOM structure', () => {
  const panel = new ControlPanel({
    id: 'render-test',
    title: 'Render Test'
  });

  const container = document.createElement('div');
  const element = panel.render(container);

  if (!element) throw new Error('render() did not return element');
  if (!element.classList.contains('control-panel')) {
    throw new Error('Wrong class on element');
  }
  if (element.id !== 'panel-render-test') {
    throw new Error('Wrong ID on element');
  }
});

test('render() requires parentElement', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });

  try {
    panel.render(null);
    throw new Error('Should have thrown error for null parent');
  } catch (error) {
    if (!error.message.includes('parentElement is required')) {
      throw new Error('Wrong error message');
    }
  }
});

test('destroy() cleans up resources', () => {
  const panel = new ControlPanel({
    id: 'destroy-test',
    title: 'Test',
    controls: [
      { type: 'slider', id: 's1', label: 'Test', min: 0, max: 100 }
    ]
  });

  const container = document.createElement('div');
  panel.render(container);

  if (!panel.isRendered()) throw new Error('Panel not rendered');
  if (panel.getControlCount() !== 1) throw new Error('Controls not added');

  panel.destroy();

  if (!panel.isDestroyed()) throw new Error('Panel not marked as destroyed');
  if (panel.getControlCount() !== 0) throw new Error('Controls not cleared');
  if (panel.container !== null) throw new Error('Container reference not cleared');
});

test('destroy() is idempotent', () => {
  const panel = new ControlPanel({ id: 'test', title: 'Test' });
  panel.destroy();
  panel.destroy(); // Should not throw

  if (!panel.isDestroyed()) throw new Error('Not marked as destroyed');
});

console.log();

// =================================================================
// Collapsible Tests
// =================================================================
console.log('Collapsible Tests:');
console.log('-'.repeat(70));

test('Collapsible panel can be collapsed', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    collapsible: true,
    collapsed: false
  });

  if (panel.isCollapsed()) throw new Error('Should start expanded');

  panel.collapse();

  if (!panel.isCollapsed()) throw new Error('Should be collapsed');
});

test('Collapsible panel can be expanded', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    collapsible: true,
    collapsed: true
  });

  if (!panel.isCollapsed()) throw new Error('Should start collapsed');

  panel.expand();

  if (panel.isCollapsed()) throw new Error('Should be expanded');
});

test('toggle() switches state', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    collapsible: true,
    collapsed: false
  });

  panel.toggle();
  if (!panel.isCollapsed()) throw new Error('Should be collapsed after toggle');

  panel.toggle();
  if (panel.isCollapsed()) throw new Error('Should be expanded after toggle');
});

test('Non-collapsible panel ignores collapse/expand', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    collapsible: false
  });

  panel.collapse();
  if (panel.isCollapsed()) throw new Error('Should not be collapsed');

  panel.expand();
  // Just verify it doesn't throw
});

console.log();

// =================================================================
// Bulk Operations Tests
// =================================================================
console.log('Bulk Operations Tests:');
console.log('-'.repeat(70));

test('getValues() returns all control values', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    controls: [
      { type: 'slider', id: 'slider1', label: 'S1', min: 0, max: 100, defaultValue: 50 },
      { type: 'display', id: 'display1', label: 'D1', defaultValue: 'test value' }
    ]
  });

  const values = panel.getValues();

  if (typeof values !== 'object') throw new Error('Should return object');
  if (values['slider1'] !== 50) throw new Error('Wrong slider value');
  if (values['display1'] !== 'test value') throw new Error('Wrong display value');
});

test('setValues() updates control values', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    controls: [
      { type: 'slider', id: 'slider1', label: 'S1', min: 0, max: 100, defaultValue: 50 },
      { type: 'display', id: 'display1', label: 'D1', defaultValue: 'old' }
    ]
  });

  panel.setValues({
    slider1: 75,
    display1: 'new'
  });

  const slider = panel.getControl('slider1');
  const display = panel.getControl('display1');

  if (slider.getValue() !== 75) throw new Error('Slider value not updated');
  if (display.getValue() !== 'new') throw new Error('Display value not updated');
});

test('enableAll() enables all controls', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    controls: [
      { type: 'slider', id: 's1', label: 'S1', min: 0, max: 100, enabled: false },
      { type: 'button', id: 'b1', label: 'B1', onClick: () => {}, enabled: false }
    ]
  });

  panel.enableAll();

  panel.getAllControls().forEach(control => {
    if (!control.isEnabled()) {
      throw new Error(`Control ${control.id} not enabled`);
    }
  });
});

test('disableAll() disables all controls', () => {
  const panel = new ControlPanel({
    id: 'test',
    title: 'Test',
    controls: [
      { type: 'slider', id: 's1', label: 'S1', min: 0, max: 100 },
      { type: 'button', id: 'b1', label: 'B1', onClick: () => {} }
    ]
  });

  panel.disableAll();

  panel.getAllControls().forEach(control => {
    if (control.isEnabled()) {
      throw new Error(`Control ${control.id} not disabled`);
    }
  });
});

console.log();

// =================================================================
// Summary
// =================================================================
console.log('='.repeat(70));
console.log('Test Summary:');
console.log('='.repeat(70));
console.log(`Total Tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);

if (results.failed > 0) {
  console.log();
  console.log('Failed Tests:');
  results.errors.forEach(({ name, error }) => {
    console.log(`  - ${name}: ${error}`);
  });
  console.log();
  console.log('❌ VALIDATION FAILED');
  process.exit(1);
} else {
  console.log();
  console.log('✅ ALL TESTS PASSED');
  process.exit(0);
}
