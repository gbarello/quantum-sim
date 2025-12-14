/**
 * ButtonControl Unit Tests
 *
 * Tests all functionality specified in controls-refactor.md lines 359-389
 */

import { ButtonControl } from './ButtonControl.js';
import { ControlRegistry } from '../ControlRegistry.js';

// Test results accumulator
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, message) {
  if (condition) {
    results.passed++;
    results.tests.push({ status: 'PASS', message });
    console.log('✓', message);
  } else {
    results.failed++;
    results.tests.push({ status: 'FAIL', message });
    console.error('✗', message);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    results.failed++;
    results.tests.push({ status: 'FAIL', message: `${message} (expected to throw)` });
    console.error('✗', message, '(expected to throw)');
  } catch (error) {
    results.passed++;
    results.tests.push({ status: 'PASS', message });
    console.log('✓', message);
  }
}

console.log('Running ButtonControl Tests...\n');

// ============================================================================
// Test 1: Constructor Validation
// ============================================================================
console.log('Test Suite 1: Constructor Validation');

assertThrows(() => {
  new ButtonControl({ id: 'test', label: 'Test' }); // Missing text
}, 'Should throw error when text is missing');

const btn1 = new ButtonControl({
  id: 'test-btn',
  label: 'Test Button',
  text: 'Click Me'
});
assert(btn1.id === 'test-btn', 'Should set id correctly');
assert(btn1.text === 'Click Me', 'Should set text correctly');
assert(btn1.icon === '', 'Should default icon to empty string');
assert(btn1.variant === 'primary', 'Should default variant to primary');
assert(btn1.fullWidth === false, 'Should default fullWidth to false');

// ============================================================================
// Test 2: Render Method
// ============================================================================
console.log('\nTest Suite 2: Render Method');

const container = document.createElement('div');
const btn2 = new ButtonControl({
  id: 'render-test',
  label: 'Render Test',
  text: 'Test Button',
  icon: '▶',
  variant: 'primary'
});
const rendered = btn2.render(container);

assert(rendered instanceof HTMLElement, 'Should return HTMLElement');
assert(rendered.querySelector('button') !== null, 'Should contain button element');
assert(btn2.buttonElement !== null, 'Should set buttonElement property');
assert(btn2.buttonElement.id === 'render-test', 'Button should have correct id');
assert(btn2.buttonElement.className.includes('btn'), 'Button should have btn class');
assert(btn2.buttonElement.className.includes('btn-primary'), 'Button should have variant class');
assert(container.contains(rendered), 'Should append to parent element');

// ============================================================================
// Test 3: Button Classes
// ============================================================================
console.log('\nTest Suite 3: Button CSS Classes');

const btn3a = new ButtonControl({
  id: 'btn-primary',
  label: 'Primary',
  text: 'Primary',
  variant: 'primary'
});
btn3a.render();
assert(btn3a.buttonElement.className.includes('btn-primary'), 'Should apply primary variant class');

const btn3b = new ButtonControl({
  id: 'btn-secondary',
  label: 'Secondary',
  text: 'Secondary',
  variant: 'secondary'
});
btn3b.render();
assert(btn3b.buttonElement.className.includes('btn-secondary'), 'Should apply secondary variant class');

const btn3c = new ButtonControl({
  id: 'btn-full',
  label: 'Full Width',
  text: 'Full',
  fullWidth: true
});
btn3c.render();
assert(btn3c.buttonElement.className.includes('btn-full'), 'Should apply full width class');

// ============================================================================
// Test 4: Icon and Text Layout
// ============================================================================
console.log('\nTest Suite 4: Icon and Text Layout');

const btn4 = new ButtonControl({
  id: 'icon-test',
  label: 'Icon Test',
  text: 'Play',
  icon: '▶'
});
btn4.render();

const children = Array.from(btn4.buttonElement.childNodes);
assert(children.length === 2, 'Button should have 2 children (icon span + text node)');

const firstChild = children[0];
assert(firstChild.nodeName === 'SPAN', 'First child should be span element');
assert(firstChild.className.includes('btn-icon'), 'Icon span should have btn-icon class');
assert(firstChild.textContent === '▶', 'Icon should be displayed correctly');

const secondChild = children[1];
assert(secondChild.nodeType === Node.TEXT_NODE, 'Second child should be text node');
assert(secondChild.textContent === 'Play', 'Text should be displayed correctly');

// ============================================================================
// Test 5: Click Event Handling
// ============================================================================
console.log('\nTest Suite 5: Click Event Handling');

let clickCount = 0;
const btn5 = new ButtonControl({
  id: 'click-test',
  label: 'Click Test',
  text: 'Click',
  onClick: (btn) => {
    clickCount++;
  }
});
btn5.render();

btn5.buttonElement.click();
assert(clickCount === 1, 'Should call onClick handler on click');

btn5.buttonElement.click();
assert(clickCount === 2, 'Should call onClick handler multiple times');

// ============================================================================
// Test 6: getValue and setValue
// ============================================================================
console.log('\nTest Suite 6: getValue and setValue');

const btn6 = new ButtonControl({
  id: 'value-test',
  label: 'Value Test',
  text: 'Initial',
  icon: '▶'
});
btn6.render();

const value = btn6.getValue();
assert(value.text === 'Initial', 'getValue should return current text');
assert(value.icon === '▶', 'getValue should return current icon');

btn6.setValue({ text: 'Updated', icon: '⏸' });
assert(btn6.text === 'Updated', 'setValue should update text');
assert(btn6.icon === '⏸', 'setValue should update icon');
assert(btn6.buttonElement.querySelector('.btn-icon').textContent === '⏸', 'Should update icon in DOM');
assert(Array.from(btn6.buttonElement.childNodes)[1].textContent === 'Updated', 'Should update text in DOM');

// ============================================================================
// Test 7: setText and setIcon
// ============================================================================
console.log('\nTest Suite 7: setText and setIcon Methods');

const btn7 = new ButtonControl({
  id: 'setters-test',
  label: 'Setters Test',
  text: 'Play',
  icon: '▶'
});
btn7.render();

btn7.setText('Pause');
assert(btn7.text === 'Pause', 'setText should update text property');
assert(Array.from(btn7.buttonElement.childNodes)[1].textContent === 'Pause', 'setText should update DOM');

btn7.setIcon('⏸');
assert(btn7.icon === '⏸', 'setIcon should update icon property');
assert(btn7.buttonElement.querySelector('.btn-icon').textContent === '⏸', 'setIcon should update DOM');

// ============================================================================
// Test 8: setVariant
// ============================================================================
console.log('\nTest Suite 8: setVariant Method');

const btn8 = new ButtonControl({
  id: 'variant-test',
  label: 'Variant Test',
  text: 'Button',
  variant: 'primary'
});
btn8.render();

assert(btn8.buttonElement.className.includes('btn-primary'), 'Should start with primary variant');

btn8.setVariant('secondary');
assert(btn8.variant === 'secondary', 'setVariant should update variant property');
assert(btn8.buttonElement.className.includes('btn-secondary'), 'setVariant should update DOM class');
assert(!btn8.buttonElement.className.includes('btn-primary'), 'setVariant should remove old variant class');

// ============================================================================
// Test 9: Update Method
// ============================================================================
console.log('\nTest Suite 9: Update Method');

const btn9 = new ButtonControl({
  id: 'update-test',
  label: 'Update Test',
  text: 'Initial',
  icon: '▶'
});
btn9.render();

btn9.text = 'Modified';
btn9.icon = '⏸';
btn9.update();

assert(Array.from(btn9.buttonElement.childNodes)[1].textContent === 'Modified', 'update() should refresh text display');
assert(btn9.buttonElement.querySelector('.btn-icon').textContent === '⏸', 'update() should refresh icon display');

// ============================================================================
// Test 10: Enable/Disable
// ============================================================================
console.log('\nTest Suite 10: Enable/Disable');

const btn10 = new ButtonControl({
  id: 'enable-test',
  label: 'Enable Test',
  text: 'Button'
});
btn10.render();

assert(btn10.isEnabled() === true, 'Should be enabled by default');
assert(btn10.buttonElement.disabled === false, 'Button element should not be disabled');

btn10.disable();
assert(btn10.isEnabled() === false, 'Should be disabled after disable()');
assert(btn10.buttonElement.disabled === true, 'Button element should be disabled');

btn10.enable();
assert(btn10.isEnabled() === true, 'Should be enabled after enable()');
assert(btn10.buttonElement.disabled === false, 'Button element should not be disabled after enable()');

// ============================================================================
// Test 11: Click Event Emission
// ============================================================================
console.log('\nTest Suite 11: Click Event Emission');

let emittedData = null;
const btn11 = new ButtonControl({
  id: 'emit-test',
  label: 'Emit Test',
  text: 'Button'
});
btn11.render();

btn11.on('click', (data) => {
  emittedData = data;
});

btn11.buttonElement.click();
assert(emittedData !== null, 'Should emit click event');
assert(emittedData.button === btn11, 'Should pass button reference in event data');

// ============================================================================
// Test 12: ControlRegistry Integration
// ============================================================================
console.log('\nTest Suite 12: ControlRegistry Integration');

assert(ControlRegistry.has('button'), 'Should be registered with ControlRegistry');

const factoryBtn = ControlRegistry.create({
  type: 'button',
  id: 'factory-test',
  label: 'Factory Test',
  text: 'From Factory',
  icon: '🏭',
  variant: 'success'
});

assert(factoryBtn instanceof ButtonControl, 'Factory should create ButtonControl instance');
assert(factoryBtn.id === 'factory-test', 'Factory button should have correct id');
assert(factoryBtn.text === 'From Factory', 'Factory button should have correct text');
assert(factoryBtn.icon === '🏭', 'Factory button should have correct icon');
assert(factoryBtn.variant === 'success', 'Factory button should have correct variant');

// ============================================================================
// Test 13: Play/Pause Toggle Pattern (from defaultConfig)
// ============================================================================
console.log('\nTest Suite 13: Play/Pause Toggle Pattern');

let isPlaying = false;
const playPauseBtn = new ButtonControl({
  id: 'play-pause',
  label: 'Play/Pause',
  text: 'Play',
  icon: '▶',
  variant: 'primary',
  fullWidth: true,
  onClick: (btn) => {
    isPlaying = !isPlaying;
    btn.setText(isPlaying ? 'Pause' : 'Play');
    btn.setIcon(isPlaying ? '⏸' : '▶');
  }
});
playPauseBtn.render();

assert(playPauseBtn.text === 'Play', 'Should start with Play text');
assert(playPauseBtn.icon === '▶', 'Should start with play icon');

playPauseBtn.buttonElement.click();
assert(playPauseBtn.text === 'Pause', 'Should change to Pause after click');
assert(playPauseBtn.icon === '⏸', 'Should change to pause icon after click');

playPauseBtn.buttonElement.click();
assert(playPauseBtn.text === 'Play', 'Should change back to Play after second click');
assert(playPauseBtn.icon === '▶', 'Should change back to play icon after second click');

// ============================================================================
// Test 14: Destroy Method
// ============================================================================
console.log('\nTest Suite 14: Destroy Method');

const btn14 = new ButtonControl({
  id: 'destroy-test',
  label: 'Destroy Test',
  text: 'Button'
});
const btn14Container = document.createElement('div');
btn14.render(btn14Container);

assert(btn14.buttonElement !== null, 'buttonElement should be set before destroy');
assert(btn14Container.childNodes.length > 0, 'Container should have children before destroy');

btn14.destroy();
assert(btn14.isDestroyed() === true, 'Should be marked as destroyed');
assert(btn14.buttonElement === null, 'buttonElement should be null after destroy');
assert(btn14Container.childNodes.length === 0, 'Container should be empty after destroy');

assertThrows(() => {
  btn14.render();
}, 'Should throw error when rendering destroyed control');

// ============================================================================
// Print Results
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('Test Results:');
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Total: ${results.passed + results.failed}`);
console.log('='.repeat(60));

if (results.failed > 0) {
  console.log('\nFailed tests:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  ✗ ${t.message}`);
  });
}

// Export for use in browser
export { results };
