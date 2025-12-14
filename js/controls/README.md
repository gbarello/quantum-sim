# Controls System

A modular, configuration-driven UI framework for managing interactive controls in the Quantum Particle Playground.

## Architecture

The controls system consists of five main components:

```
ControlsManager (top-level coordinator)
    ↓
TabManager (organizes panels into tabs)
    ↓
ControlPanel (groups related controls)
    ↓
BaseControl (abstract base class)
    ↓
Concrete Controls (SliderControl, ButtonControl, etc.)
```

**Key Design Principles:**
- Configuration-driven: Controls defined declaratively in `defaultConfig.js`
- Component-based: Each control is an independent, reusable component
- Event-driven: Controls communicate via events, not direct coupling
- Registry pattern: `ControlRegistry` acts as factory for creating controls

## Quick Start

### Using the System

```javascript
import { ControlsManager } from './controls/ControlsManager.js';

// Initialize with configuration
const controlsManager = new ControlsManager(config, callbacks);

// Access controls by ID
const speedSlider = controlsManager.getControl('speed');
speedSlider.setValue(2.5);

// Subscribe to events
speedSlider.on('change', (value) => {
  console.log('Speed changed:', value);
});
```

### Creating a Custom Control

```javascript
import { BaseControl } from './BaseControl.js';
import { ControlRegistry } from './ControlRegistry.js';

class MyControl extends BaseControl {
  // Required: Render the DOM structure
  render(parentElement) {
    this.container = this._createContainer();
    const label = this._createLabel(this.id);
    const input = document.createElement('input');
    // ... configure input

    this.container.appendChild(label);
    this.container.appendChild(input);
    parentElement?.appendChild(this.container);
    return this.container;
  }

  // Required: Get current value
  getValue() {
    return this.container.querySelector('input').value;
  }

  // Required: Set value and emit change event
  setValue(value) {
    this.container.querySelector('input').value = value;
    this.emit('change', value);
  }
}

// Register your control type
ControlRegistry.register('mycontrol', MyControl);

// Use it
const control = ControlRegistry.create({
  type: 'mycontrol',
  id: 'my-control',
  label: 'My Control'
});
```

## Core APIs

### BaseControl

All controls extend `BaseControl` and must implement:
- `render(parentElement)` - Create and attach DOM
- `getValue()` - Return current value
- `setValue(value)` - Set value and emit change event

Inherited methods:
- `enable()`, `disable()`, `isEnabled()`
- `show()`, `hide()`, `isVisible()`
- `on(event, handler)`, `off(event, handler)`, `emit(event, data)`
- `update()` - Refresh display (override if needed)
- `destroy()` - Clean up and remove

### ControlRegistry

Factory for creating controls from configuration:
- `register(type, ControlClass)` - Register a control type
- `create(config)` - Create single control from config
- `createMany(configs)` - Create multiple controls
- `validate(config)` - Validate configuration
- `has(type)`, `getTypes()`, `getClass(type)` - Introspection

### ControlsManager

Top-level coordinator:
- `getControl(id)` - Get control by ID
- `update()` - Update all display controls
- `togglePlayPause()` - Toggle simulation state
- `handleReset()` - Reset simulation to initial conditions

## Available Control Types

| Type | Description | Key Config |
|------|-------------|-----------|
| `button` | Action button | `onClick` |
| `slider` | Numeric slider | `min`, `max`, `step`, `unit` |
| `radio` | Radio button group | `options` |
| `select` | Dropdown menu | `options` |
| `display` | Read-only text display | `getValue` callback |
| `canvas` | Interactive canvas widget | `draw` callback |
| `textinput` | Text input field | `placeholder`, `validation` |

See individual files in `types/` for implementation details.

## Configuration Schema

Controls are defined in `defaultConfig.js` with this structure:

```javascript
{
  type: 'slider',           // Control type (must be registered)
  id: 'speed',              // Unique identifier
  label: 'Speed',           // Display label
  defaultValue: 1.0,        // Initial value

  // Type-specific options
  min: 0.1,
  max: 5.0,
  step: 0.1,
  unit: 'x',

  // Callbacks
  onChange: (value) => { /* handler */ }
}
```

Panels and tabs are defined similarly:

```javascript
{
  tabs: [
    {
      id: 'simulation',
      label: 'Simulation',
      controls: [/* control configs */]
    }
  ]
}
```

## File Structure

```
js/controls/
├── BaseControl.js          # Abstract base class for all controls
├── ControlRegistry.js      # Factory and registry for control types
├── ControlPanel.js         # Container for grouping controls
├── TabManager.js           # Tab-based panel navigation
├── ControlsManager.js      # Top-level coordinator
├── defaultConfig.js        # Default control configuration
├── types/                  # Concrete control implementations
│   ├── ButtonControl.js
│   ├── SliderControl.js
│   ├── RadioControl.js
│   ├── SelectControl.js
│   ├── DisplayControl.js
│   ├── CanvasControl.js
│   └── TextInputControl.js
└── styles/                 # Control-specific styling
    └── controls.css
```

## Best Practices

1. **Always clean up:** Call `destroy()` on controls when done
2. **Validate configs:** Use `ControlRegistry.validate()` before creating
3. **Use events:** Prefer event system over direct callbacks
4. **Extend BaseControl:** All custom controls should extend `BaseControl`
5. **Register early:** Register control types before creating instances
6. **Keep it simple:** Controls should do one thing well

## Testing

Each control type has its own test file in `types/`. Run tests with:

```bash
# Node.js tests
node js/controls/types/ButtonControl.test.js

# Browser tests
open test-controls.html
```

## Documentation

The code is the primary documentation - each class and method includes JSDoc comments explaining its purpose and usage. This README provides the architectural overview; for implementation details, read the source files directly.
