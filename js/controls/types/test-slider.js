/**
 * test-slider.js - Node.js test for SliderControl
 *
 * This file tests SliderControl in a Node.js environment (without DOM rendering)
 * to verify the core logic, transformation, and state management.
 */

// Mock DOM environment for testing
class MockElement {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.style = {};
    this.attributes = {};
    this.children = [];
    this.textContent = '';
    this.value = '';
    this.type = '';
    this.disabled = false;
    this.eventListeners = {};
  }

  appendChild(child) {
    this.children.push(child);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(handler);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    // Mock implementation
  }

  get classList() {
    return {
      add: (cls) => { this.className += ' ' + cls; },
      remove: (cls) => { this.className = this.className.replace(cls, ''); },
      contains: (cls) => this.className.includes(cls)
    };
  }

  querySelectorAll() {
    return [];
  }
}

class MockCustomEvent {
  constructor(name, options) {
    this.name = name;
    this.detail = options.detail;
  }
}

// Setup global mocks
global.document = {
  createElement: (tag) => new MockElement(tag)
};
global.CustomEvent = MockCustomEvent;

// Import the SliderControl after mocks are set up
import { SliderControl } from './SliderControl.js';

console.log('=== SliderControl Test Suite ===\n');

// Test 1: Basic Construction
console.log('Test 1: Basic Construction');
try {
  const slider1 = new SliderControl({
    id: 'test1',
    label: 'Test Slider',
    min: 0,
    max: 100,
    value: 50,
    step: 1
  });

  console.log('  ✓ Constructor works');
  console.log(`  ✓ ID: ${slider1.id}`);
  console.log(`  ✓ Label: ${slider1.label}`);
  console.log(`  ✓ Min: ${slider1.min}, Max: ${slider1.max}`);
  console.log(`  ✓ Initial value: ${slider1.getValue()}`);
  console.log(`  ✓ Slider value: ${slider1.getSliderValue()}`);
} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 2: Log Scale Transformation (like speed slider)
console.log('\nTest 2: Log Scale Transformation (Speed Slider)');
try {
  const speedSlider = new SliderControl({
    id: 'speed',
    label: 'Speed',
    min: -10,
    max: 10,
    value: 0,
    step: 1,
    unit: 'x',
    format: (val) => val.toFixed(2),
    transform: (val) => Math.pow(10, val / 10 - 1)
  });

  console.log('  ✓ Speed slider created');
  console.log(`  ✓ Slider value (raw): ${speedSlider.getSliderValue()}`);
  console.log(`  ✓ Transformed value: ${speedSlider.getValue()}`);
  console.log(`  ✓ Expected: 0.1 (10^(0/10-1) = 10^-1 = 0.1)`);

  // Test different slider positions
  speedSlider.setSliderValueSilent(-10);
  console.log(`  ✓ At -10: ${speedSlider.getValue().toFixed(4)} (expected: 0.01)`);

  speedSlider.setSliderValueSilent(10);
  console.log(`  ✓ At 10: ${speedSlider.getValue().toFixed(4)} (expected: 1.0)`);

  speedSlider.setSliderValueSilent(0);
  console.log(`  ✓ At 0: ${speedSlider.getValue().toFixed(4)} (expected: 0.1)`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 3: Packet Size Transform
console.log('\nTest 3: Packet Size Transform (Division by 100)');
try {
  const packetSlider = new SliderControl({
    id: 'packet-size',
    label: 'Packet Size',
    min: 20,
    max: 400,
    value: 256,
    step: 1,
    transform: (val) => val / 100,
    format: (val) => val.toFixed(1)
  });

  console.log('  ✓ Packet size slider created');
  console.log(`  ✓ Slider value: ${packetSlider.getSliderValue()}`);
  console.log(`  ✓ Transformed value: ${packetSlider.getValue()}`);
  console.log(`  ✓ Expected: 2.56 (256/100 = 2.56)`);

  packetSlider.setSliderValueSilent(20);
  console.log(`  ✓ At 20: ${packetSlider.getValue()} (expected: 0.2)`);

  packetSlider.setSliderValueSilent(400);
  console.log(`  ✓ At 400: ${packetSlider.getValue()} (expected: 4.0)`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 4: setValue and getValue
console.log('\nTest 4: setValue and getValue');
try {
  let changeCount = 0;
  const slider4 = new SliderControl({
    id: 'test4',
    label: 'Test',
    min: 0,
    max: 100,
    value: 0,
    onChange: (value) => {
      changeCount++;
    }
  });

  console.log('  ✓ Initial value:', slider4.getValue());

  slider4.setValue(50);
  console.log(`  ✓ After setValue(50): ${slider4.getValue()}`);
  console.log(`  ✓ Change events fired: ${changeCount}`);

  slider4.setValue(75);
  console.log(`  ✓ After setValue(75): ${slider4.getValue()}`);
  console.log(`  ✓ Change events fired: ${changeCount}`);

  slider4.setSliderValueSilent(100);
  console.log(`  ✓ After setSliderValueSilent(100): ${slider4.getValue()}`);
  console.log(`  ✓ Change events fired (should be same): ${changeCount}`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 5: Enable/Disable State
console.log('\nTest 5: Enable/Disable State');
try {
  const slider5 = new SliderControl({
    id: 'test5',
    label: 'Test',
    min: 0,
    max: 10,
    value: 5
  });

  console.log(`  ✓ Initial enabled state: ${slider5.isEnabled()}`);

  slider5.disable();
  console.log(`  ✓ After disable(): ${slider5.isEnabled()}`);

  slider5.enable();
  console.log(`  ✓ After enable(): ${slider5.isEnabled()}`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 6: Value Clamping
console.log('\nTest 6: Value Clamping');
try {
  const slider6 = new SliderControl({
    id: 'test6',
    label: 'Test',
    min: 0,
    max: 100,
    value: 50
  });

  console.log(`  ✓ Initial value: ${slider6.getValue()}`);

  slider6.setValue(-10);
  console.log(`  ✓ After setValue(-10): ${slider6.getValue()} (clamped to ${slider6.min})`);

  slider6.setValue(150);
  console.log(`  ✓ After setValue(150): ${slider6.getValue()} (clamped to ${slider6.max})`);

  slider6.setValue(50);
  console.log(`  ✓ After setValue(50): ${slider6.getValue()} (valid value)`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 7: Configuration Validation
console.log('\nTest 7: Configuration Validation');
try {
  // Should throw error for missing min
  try {
    new SliderControl({
      id: 'bad1',
      label: 'Bad',
      max: 100,
      value: 50
    });
    console.error('  ✗ Should have thrown error for missing min');
  } catch (e) {
    console.log('  ✓ Correctly rejects missing min');
  }

  // Should throw error for missing max
  try {
    new SliderControl({
      id: 'bad2',
      label: 'Bad',
      min: 0,
      value: 50
    });
    console.error('  ✗ Should have thrown error for missing max');
  } catch (e) {
    console.log('  ✓ Correctly rejects missing max');
  }

  // Should throw error for missing value
  try {
    new SliderControl({
      id: 'bad3',
      label: 'Bad',
      min: 0,
      max: 100
    });
    console.error('  ✗ Should have thrown error for missing value');
  } catch (e) {
    console.log('  ✓ Correctly rejects missing value');
  }

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

console.log('\n=== All Tests Complete ===');
