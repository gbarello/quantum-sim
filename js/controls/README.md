# Controls System - Modular UI Framework

This directory contains a modular, extensible control system for building user interfaces in the Quantum Particle Playground.

## Architecture Overview

The controls system is built on a component-based architecture with the following key concepts:

1. **BaseControl**: Abstract base class providing common functionality
2. **ControlRegistry**: Central registry for control types and factory
3. **Concrete Controls**: Specific implementations (SliderControl, ButtonControl, etc.)
4. **ControlPanel**: Container for grouping related controls
5. **TabManager**: Manages multiple panels as tabs
6. **ControlsManager**: Top-level coordinator

## Core Components

### BaseControl (Abstract Base Class)

`BaseControl` is the foundation for all control types. It provides:

- **Lifecycle Management**: render(), update(), destroy()
- **Event System**: emit(), on(), off()
- **State Management**: enable(), disable(), show(), hide()
- **Value Interface**: getValue(), setValue() (abstract)

#### Creating a New Control Type

All control types must extend `BaseControl` and implement three abstract methods:

```javascript
import { BaseControl } from './BaseControl.js';

class MyControl extends BaseControl {
  constructor(config) {
    super(config);
    // Initialize your control-specific properties
  }

  // Required: Render the control
  render(parentElement) {
    // Create your DOM structure
    this.container = this._createContainer();

    // Add your UI elements
    const input = document.createElement('input');
    input.id = this.id;
    // ... configure input

    this.container.appendChild(this._createLabel(this.id));
    this.container.appendChild(input);

    // Attach to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  // Required: Get current value
  getValue() {
    const input = this.container.querySelector('input');
    return input.value;
  }

  // Required: Set value
  setValue(value) {
    const input = this.container.querySelector('input');
    input.value = value;
    this.emit('change', value);
  }
}
```

#### BaseControl API

**Constructor:**
```javascript
new BaseControl({
  id: 'my-control',           // Required: Unique identifier
  label: 'My Control',        // Required: Display label
  defaultValue: null,         // Optional: Initial value
  enabled: true,              // Optional: Initial enabled state
  visible: true,              // Optional: Initial visibility
  onChange: (value) => {},    // Optional: Change handler
  className: 'custom-class',  // Optional: CSS classes
  tooltip: 'Help text',       // Optional: Tooltip
  attributes: { ... }         // Optional: HTML attributes
})
```

**Methods:**
- `render(parentElement)` - Create and attach DOM elements (abstract)
- `getValue()` - Get current value (abstract)
- `setValue(value)` - Set value (abstract)
- `emit(eventName, data)` - Emit custom event
- `on(eventName, handler)` - Subscribe to event
- `off(eventName, handler)` - Unsubscribe from event
- `enable()` - Enable the control
- `disable()` - Disable the control
- `show()` - Show the control
- `hide()` - Hide the control
- `update()` - Refresh display (override if needed)
- `destroy()` - Cleanup and remove control
- `isEnabled()` - Check if enabled
- `isVisible()` - Check if visible
- `isDestroyed()` - Check if destroyed

**Protected Helpers:**
- `_createLabel(forId)` - Create a label element
- `_createContainer()` - Create wrapper div
- `_applyAttributes(element)` - Apply classes and attributes

**Events:**
- `'change'` - Value changed
- `'enabled'` - Control enabled
- `'disabled'` - Control disabled
- `'shown'` - Control shown
- `'hidden'` - Control hidden
- Custom events via `emit()`

---

### ControlRegistry

`ControlRegistry` is a static class that manages control type registration and provides a factory for creating controls from configuration.

#### Registering Control Types

```javascript
import { ControlRegistry } from './ControlRegistry.js';
import { SliderControl } from './types/SliderControl.js';

// Register a control type
ControlRegistry.register('slider', SliderControl);
ControlRegistry.register('button', ButtonControl);
ControlRegistry.register('radio', RadioControl);
```

#### Creating Controls

```javascript
// Create from configuration
const control = ControlRegistry.create({
  type: 'slider',
  id: 'speed-slider',
  label: 'Speed',
  min: 0,
  max: 100,
  value: 50
});

// Create multiple controls
const controls = ControlRegistry.createMany([
  { type: 'slider', id: 'slider1', label: 'Slider 1' },
  { type: 'button', id: 'btn1', label: 'Button 1' }
]);
```

#### ControlRegistry API

**Static Methods:**
- `register(type, controlClass)` - Register a control type
- `create(config)` - Create a control from config
- `createMany(configs, ignoreErrors)` - Create multiple controls
- `has(type)` - Check if type is registered
- `getTypes()` - Get all registered types
- `getClass(type)` - Get class for a type
- `validate(config)` - Validate configuration
- `unregister(type)` - Remove a registration
- `clear()` - Clear all registrations

**Example Validation:**
```javascript
const validation = ControlRegistry.validate({
  type: 'slider',
  id: 'my-slider',
  label: 'My Slider'
});

if (validation.valid) {
  const control = ControlRegistry.create(config);
} else {
  console.error('Invalid config:', validation.errors);
}
```

---

## Usage Examples

### Example 1: Simple Control Creation

```javascript
import { BaseControl } from './BaseControl.js';
import { ControlRegistry } from './ControlRegistry.js';

// Define a simple text input control
class TextControl extends BaseControl {
  render(parentElement) {
    this.container = this._createContainer();

    const label = this._createLabel(this.id);
    const input = document.createElement('input');
    input.type = 'text';
    input.id = this.id;
    input.value = this.defaultValue || '';

    input.addEventListener('input', () => {
      this.emit('change', input.value);
    });

    this.container.appendChild(label);
    this.container.appendChild(input);

    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  getValue() {
    return this.container.querySelector('input').value;
  }

  setValue(value) {
    this.container.querySelector('input').value = value;
    this.emit('change', value);
  }
}

// Register and use
ControlRegistry.register('text', TextControl);

const nameInput = ControlRegistry.create({
  type: 'text',
  id: 'name-input',
  label: 'Name',
  defaultValue: 'John Doe',
  onChange: (value) => console.log('Name changed:', value)
});

nameInput.render(document.body);
```

### Example 2: Control with Events

```javascript
const slider = ControlRegistry.create({
  type: 'slider',
  id: 'volume-slider',
  label: 'Volume',
  min: 0,
  max: 100,
  value: 50
});

// Subscribe to events
slider.on('change', (value) => {
  console.log('Volume:', value);
});

slider.on('enabled', () => {
  console.log('Slider enabled');
});

// Render and manipulate
slider.render(document.getElementById('controls'));
slider.setValue(75);
slider.disable();
```

### Example 3: Dynamic Control Management

```javascript
// Create controls from configuration
const config = [
  {
    type: 'slider',
    id: 'speed',
    label: 'Speed',
    min: 0,
    max: 10,
    value: 5
  },
  {
    type: 'button',
    id: 'reset',
    label: 'Reset',
    onClick: () => console.log('Reset clicked')
  }
];

// Create all controls
const controls = ControlRegistry.createMany(config);

// Render to container
const container = document.getElementById('control-panel');
controls.forEach(control => control.render(container));

// Later: cleanup
controls.forEach(control => control.destroy());
```

---

## Configuration Schema

### Base Configuration (All Controls)

```javascript
{
  type: string,              // Control type (must be registered)
  id: string,                // Unique identifier
  label: string,             // Display label
  defaultValue: any,         // Initial value
  enabled: boolean,          // Initial enabled state (default: true)
  visible: boolean,          // Initial visibility (default: true)
  onChange: function,        // Change event handler
  className: string,         // Additional CSS classes
  tooltip: string,           // Tooltip text
  attributes: object         // Additional HTML attributes
}
```

### Control-Specific Configuration

Each control type may have additional configuration options. See individual control type documentation for details.

---

## Best Practices

### 1. Always Register Before Creating

```javascript
// Good
ControlRegistry.register('slider', SliderControl);
const slider = ControlRegistry.create({ type: 'slider', ... });

// Bad - will throw error
const slider = ControlRegistry.create({ type: 'slider', ... });
ControlRegistry.register('slider', SliderControl);
```

### 2. Validate Configuration

```javascript
// Validate before creating
const validation = ControlRegistry.validate(config);
if (!validation.valid) {
  console.error('Invalid config:', validation.errors);
  return;
}

const control = ControlRegistry.create(config);
```

### 3. Clean Up Properly

```javascript
// Always destroy controls when done
control.destroy();

// Or destroy multiple
controls.forEach(c => c.destroy());
```

### 4. Use Event System

```javascript
// Use event system instead of direct callbacks
control.on('change', handleChange);

// Instead of
control.onChange = handleChange;
```

### 5. Leverage Protected Helpers

```javascript
class MyControl extends BaseControl {
  render(parentElement) {
    // Use helpers for consistency
    this.container = this._createContainer();
    const label = this._createLabel(this.id);

    // Build your control
    // ...
  }
}
```

---

## Error Handling

The control system provides comprehensive error handling:

```javascript
try {
  // Missing required field
  const control = ControlRegistry.create({
    type: 'slider',
    // Missing id and label
  });
} catch (error) {
  console.error(error.message);
  // "ControlRegistry.create: config.id is required"
}

try {
  // Unknown type
  const control = ControlRegistry.create({
    type: 'unknown',
    id: 'test',
    label: 'Test'
  });
} catch (error) {
  console.error(error.message);
  // "Unknown control type 'unknown'. Available types: slider, button, ..."
}
```

---

## Testing

### Unit Testing a Control

```javascript
describe('MyControl', () => {
  let control;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    control = new MyControl({
      id: 'test-control',
      label: 'Test'
    });
  });

  afterEach(() => {
    control.destroy();
  });

  it('should render correctly', () => {
    control.render(container);
    expect(control.container).toBeTruthy();
    expect(container.children.length).toBe(1);
  });

  it('should emit change event', (done) => {
    control.on('change', (value) => {
      expect(value).toBe('test-value');
      done();
    });
    control.setValue('test-value');
  });

  it('should enable/disable', () => {
    control.disable();
    expect(control.isEnabled()).toBe(false);

    control.enable();
    expect(control.isEnabled()).toBe(true);
  });
});
```

---

## Implementation Status

### Phase 1: Foundation ✓ (Complete)
- [x] BaseControl abstract class
- [x] ControlRegistry singleton
- [x] Documentation and examples
- [x] Error handling and validation

### Phase 2: Concrete Controls (Not Started)
- [ ] SliderControl
- [ ] ButtonControl
- [ ] RadioControl
- [ ] SelectControl
- [ ] CanvasControl
- [ ] DisplayControl

### Phase 3: Containers (Not Started)
- [ ] ControlPanel
- [ ] TabManager

### Phase 4: Manager (Not Started)
- [ ] ControlsManager
- [ ] defaultConfig.js

### Phase 5: Migration (Not Started)
- [ ] Update main.js
- [ ] Update HTML/CSS
- [ ] Remove old Controller

### Phase 6: Enhancement (Not Started)
- [ ] Advanced features
- [ ] Presets system
- [ ] Additional control types

---

## File Structure

```
js/controls/
├── BaseControl.js          (150 lines) ✓ Complete
├── ControlRegistry.js      (100 lines) ✓ Complete
├── README.md              (This file) ✓ Complete
│
├── types/                 (Future: Concrete controls)
│   ├── SliderControl.js   (200 lines)
│   ├── ButtonControl.js   (120 lines)
│   ├── RadioControl.js    (150 lines)
│   ├── SelectControl.js   (130 lines)
│   ├── CanvasControl.js   (180 lines)
│   └── DisplayControl.js  (100 lines)
│
├── ControlPanel.js        (Future: Panel container)
├── TabManager.js          (Future: Tab management)
├── ControlsManager.js     (Future: Main coordinator)
└── defaultConfig.js       (Future: Default configuration)
```

---

## Contributing

When adding new control types:

1. Extend `BaseControl`
2. Implement all abstract methods
3. Register with `ControlRegistry`
4. Add documentation
5. Write tests
6. Update this README

---

## License

Part of the Quantum Particle Playground project.

**Last Updated**: 2025-12-14
**Status**: Phase 1 Complete
