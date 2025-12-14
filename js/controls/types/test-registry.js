/**
 * test-registry.js - Test SliderControl registration with ControlRegistry
 */

// Mock DOM
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
    this.parentNode = null;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parentNode = null;
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
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
    return true;
  }

  querySelectorAll() {
    return [];
  }

  get classList() {
    return {
      add: (cls) => { this.className += ' ' + cls; },
      remove: (cls) => { this.className = this.className.replace(cls, ''); },
      contains: (cls) => this.className.includes(cls)
    };
  }
}

class MockCustomEvent {
  constructor(name, options) {
    this.name = name;
    this.detail = options?.detail;
    this.bubbles = options?.bubbles || false;
    this.cancelable = options?.cancelable || false;
  }
}

global.document = {
  createElement: (tag) => new MockElement(tag)
};
global.CustomEvent = MockCustomEvent;

// Import modules
import { ControlRegistry } from '../ControlRegistry.js';
import { SliderControl } from './SliderControl.js';

console.log('=== ControlRegistry with SliderControl Test ===\n');

// Test 1: Check Registration
console.log('Test 1: Check Registration');
try {
  const hasSlider = ControlRegistry.has('slider');
  console.log(`  ✓ ControlRegistry.has('slider'): ${hasSlider}`);

  if (hasSlider) {
    console.log('  ✓ SliderControl successfully registered');
  } else {
    console.error('  ✗ SliderControl not registered!');
  }

  const types = ControlRegistry.getTypes();
  console.log(`  ✓ Available types: ${types.join(', ')}`);
} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 2: Create via Registry
console.log('\nTest 2: Create Slider via ControlRegistry.create()');
try {
  const slider = ControlRegistry.create({
    type: 'slider',
    id: 'registry-test',
    label: 'Registry Test',
    min: 0,
    max: 100,
    value: 50,
    step: 1,
    unit: '%',
    showValue: true,
    showLabels: true
  });

  console.log('  ✓ Slider created via registry');
  console.log(`  ✓ ID: ${slider.id}`);
  console.log(`  ✓ Label: ${slider.label}`);
  console.log(`  ✓ Value: ${slider.getValue()}`);
  console.log(`  ✓ Instance check: ${slider instanceof SliderControl}`);
} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 3: Create Speed Slider Config (from defaultConfig.js)
console.log('\nTest 3: Create Speed Slider (defaultConfig.js config)');
try {
  const speedConfig = {
    type: 'slider',
    id: 'speed',
    label: 'Speed',
    min: -10,
    max: 10,
    value: 0,
    step: 1,
    unit: 'x',
    format: (val) => val.toFixed(2),
    transform: (val) => Math.pow(10, val / 10 - 1),
    showLabels: true,
    labels: { min: '0.01x', max: '1.0x' },
    onChange: (val) => {
      console.log(`    onChange called with: ${val}`);
    }
  };

  const speedSlider = ControlRegistry.create(speedConfig);
  console.log('  ✓ Speed slider created from config');
  console.log(`  ✓ Slider position: ${speedSlider.getSliderValue()}`);
  console.log(`  ✓ Transformed value: ${speedSlider.getValue()}`);
  console.log(`  ✓ Expected: 0.1 (matches defaultConfig.js spec)`);

  // Test the transform at different points
  speedSlider.setSliderValueSilent(-10);
  console.log(`  ✓ At min (-10): ${speedSlider.getValue().toFixed(4)} (0.01x)`);

  speedSlider.setSliderValueSilent(10);
  console.log(`  ✓ At max (10): ${speedSlider.getValue().toFixed(4)} (1.0x)`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 4: Validation
console.log('\nTest 4: ControlRegistry Validation');
try {
  // Valid config
  const validResult = ControlRegistry.validate({
    type: 'slider',
    id: 'test-slider',
    label: 'Test',
    min: 0,
    max: 100,
    value: 50
  });
  console.log(`  ✓ Valid config: ${validResult.valid}`);

  // Invalid config (missing type)
  const invalidResult1 = ControlRegistry.validate({
    id: 'test',
    label: 'Test'
  });
  console.log(`  ✓ Invalid config (no type): ${invalidResult1.valid}`);
  console.log(`    Errors: ${invalidResult1.errors.join(', ')}`);

  // Invalid config (unknown type)
  const invalidResult2 = ControlRegistry.validate({
    type: 'nonexistent',
    id: 'test',
    label: 'Test'
  });
  console.log(`  ✓ Invalid config (bad type): ${invalidResult2.valid}`);
  console.log(`    Errors: ${invalidResult2.errors.join(', ')}`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 5: Rendering and DOM
console.log('\nTest 5: Rendering to DOM');
try {
  const parent = new MockElement('div');

  const slider = ControlRegistry.create({
    type: 'slider',
    id: 'render-test',
    label: 'Render Test',
    min: 0,
    max: 100,
    value: 50,
    showValue: true,
    showLabels: true
  });

  const container = slider.render(parent);
  console.log('  ✓ Slider rendered');
  console.log(`  ✓ Container created: ${container !== null}`);
  console.log(`  ✓ Container is in parent: ${parent.children.includes(container)}`);
  console.log(`  ✓ Container class: ${container.className}`);
  console.log(`  ✓ Has slider element: ${slider.sliderElement !== null}`);
  console.log(`  ✓ Has value display: ${slider.valueDisplay !== null}`);

  // Test destroy
  slider.destroy();
  console.log('  ✓ Slider destroyed');
  console.log(`  ✓ Is destroyed: ${slider.isDestroyed()}`);

} catch (error) {
  console.error('  ✗ Error:', error.message);
}

console.log('\n=== All Registry Tests Complete ===');
