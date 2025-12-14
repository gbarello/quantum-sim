# Controls System - Quick Reference Card

## Phase 1: Foundation ✅ Complete

### BaseControl API

```javascript
import { BaseControl } from './BaseControl.js';

// Extend BaseControl
class MyControl extends BaseControl {
  // Required: Implement these 3 methods
  render(parentElement) { /* Create DOM */ }
  getValue() { /* Return value */ }
  setValue(value) { /* Set value, emit change */ }
}

// Use inherited methods
control.on('change', handler)      // Subscribe to event
control.emit('change', data)        // Emit event
control.enable() / disable()        // Enable/disable
control.show() / hide()            // Show/hide
control.isEnabled() / isVisible()  // Check state
control.update()                    // Refresh display
control.destroy()                   // Cleanup

// Protected helpers
this._createLabel(forId)           // Create label
this._createContainer()            // Create wrapper
this._applyAttributes(element)     // Apply config
```

### ControlRegistry API

```javascript
import { ControlRegistry } from './ControlRegistry.js';

// Register types
ControlRegistry.register('slider', SliderControl);

// Create controls
const control = ControlRegistry.create({
  type: 'slider',
  id: 'my-slider',
  label: 'My Slider',
  // ... type-specific config
});

// Batch create
const controls = ControlRegistry.createMany([
  { type: 'slider', id: 's1', label: 'Slider 1' },
  { type: 'button', id: 'b1', label: 'Button 1' }
]);

// Validation
const result = ControlRegistry.validate(config);
if (!result.valid) {
  console.error(result.errors);
}

// Introspection
ControlRegistry.has('slider')      // Check if registered
ControlRegistry.getTypes()         // List all types
ControlRegistry.getClass('slider') // Get class
```

### Configuration Schema

```javascript
{
  // Required
  type: 'control-type',
  id: 'unique-id',
  label: 'Display Label',

  // Optional - Base
  defaultValue: any,
  enabled: true,
  visible: true,
  onChange: function,
  className: 'css-class',
  tooltip: 'Help text',
  attributes: { ... },

  // Type-specific options
  // (varies by control type)
}
```

### Event System

```javascript
// Subscribe
control.on('change', (value) => {
  console.log('Changed to:', value);
});

// Multiple subscribers
control.on('custom', handler1);
control.on('custom', handler2);

// Unsubscribe
control.off('change', handler);
control.off('change');  // Remove all

// Emit
control.emit('custom', { data: 'value' });

// Standard events
- 'change'    // Value changed
- 'enabled'   // Control enabled
- 'disabled'  // Control disabled
- 'shown'     // Control shown
- 'hidden'    // Control hidden
```

### Quick Start

```javascript
// 1. Import
import { BaseControl } from './BaseControl.js';
import { ControlRegistry } from './ControlRegistry.js';

// 2. Define control type
class TextControl extends BaseControl {
  render(parent) {
    this.container = this._createContainer();
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.id = this.id;

    this.input.addEventListener('input', () => {
      this.emit('change', this.input.value);
    });

    this.container.appendChild(this._createLabel(this.id));
    this.container.appendChild(this.input);
    if (parent) parent.appendChild(this.container);
    return this.container;
  }

  getValue() {
    return this.input.value;
  }

  setValue(value) {
    this.input.value = value;
    this.emit('change', value);
  }
}

// 3. Register
ControlRegistry.register('text', TextControl);

// 4. Create and use
const input = ControlRegistry.create({
  type: 'text',
  id: 'name',
  label: 'Name',
  onChange: (v) => console.log(v)
});

input.render(document.body);
```

### Files

```
js/controls/
├── BaseControl.js          9.4 KB   Core abstract class
├── ControlRegistry.js      7.0 KB   Factory & registry
├── README.md              13 KB     Full documentation
├── example.js             9.6 KB    Working examples
├── test.html              13 KB     Browser tests
├── verify.js              8.6 KB    Automated tests
├── PHASE1_COMPLETE.md     9.8 KB    Status report
└── IMPLEMENTATION_SUMMARY.md 14 KB  Complete summary
```

### Testing

```bash
# Run automated tests
node js/controls/verify.js

# Open browser tests
open js/controls/test.html
```

### Error Handling

All methods validate inputs and throw helpful errors:

```javascript
// Missing required field
ControlRegistry.create({ type: 'slider' });
// Error: config.id is required

// Unknown type
ControlRegistry.create({ type: 'unknown', id: 'x', label: 'X' });
// Error: Unknown control type 'unknown'. Available types: slider, button

// Using destroyed control
control.destroy();
control.emit('test');
// Warning: Cannot emit event 'test' on destroyed control 'my-control'
```

### Best Practices

1. **Always register before creating**
   ```javascript
   ControlRegistry.register('type', TypeClass);
   const control = ControlRegistry.create({ type: 'type', ... });
   ```

2. **Use helpers in render()**
   ```javascript
   render(parent) {
     this.container = this._createContainer();
     const label = this._createLabel(this.id);
     // ...
   }
   ```

3. **Emit change events**
   ```javascript
   setValue(value) {
     this._value = value;
     this.emit('change', value);  // Always emit!
   }
   ```

4. **Clean up properly**
   ```javascript
   // When done
   control.destroy();
   ```

5. **Validate configs**
   ```javascript
   const validation = ControlRegistry.validate(config);
   if (!validation.valid) {
     console.error(validation.errors);
     return;
   }
   ```

### Common Patterns

#### Custom Events
```javascript
class MyControl extends BaseControl {
  someAction() {
    this.emit('action', { detail: 'info' });
  }
}

control.on('action', (data) => {
  console.log('Action:', data.detail);
});
```

#### State Management
```javascript
// Toggle enabled
if (control.isEnabled()) {
  control.disable();
} else {
  control.enable();
}

// Conditional visibility
if (someCondition) {
  control.show();
} else {
  control.hide();
}
```

#### Batch Operations
```javascript
// Create many controls
const configs = [
  { type: 'slider', id: 's1', label: 'Slider 1' },
  { type: 'slider', id: 's2', label: 'Slider 2' },
  { type: 'button', id: 'b1', label: 'Button 1' }
];

const controls = ControlRegistry.createMany(configs);

// Render all
controls.forEach(c => c.render(container));

// Cleanup all
controls.forEach(c => c.destroy());
```

### Verification

✅ **All 41 automated tests passing**

- BaseControl class structure
- ControlRegistry functionality
- Registration system
- Control creation
- Value operations
- Event system
- State management
- Configuration validation
- Error handling
- Cleanup and destruction
- Batch operations

---

**Version**: 1.0 (Phase 1 Complete)
**Status**: Production Ready
**Next**: Phase 2 - Concrete Controls
