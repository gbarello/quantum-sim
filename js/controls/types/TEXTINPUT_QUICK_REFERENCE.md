# TextInputControl Quick Reference

## Import

```javascript
import TextInputControl from './js/controls/types/TextInputControl.js';
```

## Basic Usage

```javascript
const input = new TextInputControl({
  label: 'Label Text',
  type: 'text',           // or 'number', 'email', etc.
  value: 'initial value'
});

input.on('change', (data) => {
  console.log(data.value);
});

input.render(container);
```

## Common Configurations

### Text Input
```javascript
new TextInputControl({
  label: 'Username',
  type: 'text',
  placeholder: 'Enter username...',
  value: ''
})
```

### Number Input
```javascript
new TextInputControl({
  label: 'Speed',
  type: 'number',
  value: 1.0,
  min: 0,
  max: 10,
  step: 0.1,
  precision: 1
})
```

### Number with Unit
```javascript
new TextInputControl({
  label: 'Packet Size',
  type: 'number',
  value: 1.0,
  min: 0.1,
  max: 5.0,
  unit: 'σ'
})
```

### Email Input
```javascript
new TextInputControl({
  label: 'Email',
  type: 'email',
  placeholder: 'user@example.com',
  pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
})
```

### Custom Validation
```javascript
new TextInputControl({
  label: 'Position X',
  type: 'number',
  validate: (value) => {
    if (value < -5 || value > 5) {
      return {
        valid: false,
        message: 'Must be between -5 and 5'
      };
    }
    return { valid: true };
  }
})
```

## All Configuration Options

```javascript
{
  // From BaseControl
  label: string,              // Label text (required)
  description: string,        // Help text below control
  className: string,          // Additional CSS class

  // TextInputControl specific
  type: string,               // 'text', 'number', 'email', etc. (default: 'text')
  placeholder: string,        // Placeholder text
  value: any,                 // Initial value (default: '')
  min: number,                // Minimum value (numbers only)
  max: number,                // Maximum value (numbers only)
  step: number,               // Step increment (numbers only)
  pattern: string,            // Regex pattern for validation
  validate: function,         // Custom validation: (value) => {valid, message}
  unit: string,               // Unit suffix (e.g., 'px', 'σ', 'units')
  precision: number,          // Decimal places for display (default: 2)
  parseNumber: boolean        // Auto-parse to number (default: true for type='number')
}
```

## Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `render(container)` | Render to container | HTMLElement |
| `getValue()` | Get current value | any |
| `setValue(value)` | Set value (with validation) | void |
| `enable()` | Enable control | void |
| `disable()` | Disable control | void |
| `focus()` | Focus input | void |
| `destroy()` | Clean up | void |

## Events

| Event | When | Data |
|-------|------|------|
| `change` | Valid input change | `{value, control}` |
| `invalid` | Validation fails | `{value, message, control}` |
| `input` | Every keystroke | `{value, control}` |

## Validation States

| State | Border | Message | Trigger |
|-------|--------|---------|---------|
| Normal | Gray | None | Initial/typing |
| Valid | Green | None | Passes validation |
| Invalid | Red | Error text | Fails validation |
| Focus | Blue glow | None | User focus |
| Disabled | Gray faded | None | `disable()` called |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Submit/validate current value |
| Escape | Revert to last valid value |
| Tab | Normal focus navigation |

## Validation Function

### Simple (boolean return)
```javascript
validate: (value) => {
  return value >= 0; // true or false
}
```

### Detailed (object return)
```javascript
validate: (value) => {
  if (value < 0) {
    return {
      valid: false,
      message: 'Must be positive'
    };
  }
  return { valid: true };
}
```

## CSS Classes

| Class | Purpose |
|-------|---------|
| `.control-input` | Main wrapper |
| `.input-field` | Input element |
| `.input-valid` | Valid state styling |
| `.input-invalid` | Invalid state styling |
| `.input-unit` | Unit suffix label |
| `.input-validation-message` | Error message |

## Quantum Playground Examples

### Position Input
```javascript
new TextInputControl({
  label: 'Position X',
  type: 'number',
  value: 0.0,
  min: 0,
  max: 10,
  precision: 2,
  unit: 'units'
})
```

### Momentum Input
```javascript
new TextInputControl({
  label: 'Momentum px',
  type: 'number',
  value: 0.0,
  step: 0.1,
  precision: 2,
  unit: 'ℏ/Å'
})
```

### Packet Size
```javascript
new TextInputControl({
  label: 'Packet Width',
  type: 'number',
  value: 1.0,
  min: 0.1,
  max: 5.0,
  step: 0.1,
  precision: 1,
  unit: 'σ',
  validate: (value) => {
    if (value < 0.1) return { valid: false, message: 'Too narrow' };
    if (value > 5.0) return { valid: false, message: 'Too wide' };
    return { valid: true };
  }
})
```

## Common Patterns

### Get/Set Pattern
```javascript
// Create
const input = new TextInputControl({...});

// Get value
const value = input.getValue();

// Set value
input.setValue(5.0);

// Listen for changes
input.on('change', (data) => {
  console.log('New value:', data.value);
});
```

### Validation Pattern
```javascript
const input = new TextInputControl({
  validate: (value) => {
    // Your validation logic
    if (/* condition */) {
      return { valid: false, message: 'Error message' };
    }
    return { valid: true };
  }
});

// Listen for validation failures
input.on('invalid', (data) => {
  console.error('Validation failed:', data.message);
});
```

### Enable/Disable Pattern
```javascript
// Disable when processing
input.disable();

// Re-enable when done
input.enable();

// Check state
if (input.isEnabled) {
  // ...
}
```

## Tips

1. **Always provide a label** - Users need context
2. **Use semantic types** - `number`, `email`, etc.
3. **Set reasonable ranges** - Use `min`/`max` for numbers
4. **Provide clear error messages** - Help users fix issues
5. **Use units for clarity** - Makes values unambiguous
6. **Set appropriate precision** - Avoid too many decimals
7. **Listen to both events** - `change` for valid, `invalid` for errors

## Testing

Test page: `test-textinput.html`

```bash
python3 -m http.server 8765
# Open http://localhost:8765/test-textinput.html
```

## Full Documentation

See `TextInputControl.README.md` for complete documentation.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
