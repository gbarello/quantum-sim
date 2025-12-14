# TextInputControl

A production-ready text/numeric input control with comprehensive validation, real-time feedback, and flexible configuration options.

## Overview

`TextInputControl` extends `BaseControl` to provide text input fields with:
- Text or numeric input types
- Real-time validation with visual feedback
- Min/max enforcement for numbers
- Step support for numeric inputs
- Unit suffix display
- Pattern matching
- Custom validation functions
- Keyboard shortcuts (Enter to submit, Escape to revert)

## Features

### Core Capabilities
- **Multiple Input Types**: text, number, email, url, tel, etc.
- **Validation**: Built-in and custom validation with visual feedback
- **Number Support**: Min/max ranges, step increments, precision control
- **Unit Display**: Suffix labels (e.g., "px", "°", "σ")
- **Error Handling**: Clear error messages and invalid state management
- **Keyboard Support**: Enter to submit, Escape to revert
- **Auto-parsing**: Automatic string-to-number conversion for numeric inputs

### Visual States
- **Normal**: Default state with border color
- **Valid**: Green border after successful validation
- **Invalid**: Red border with error message
- **Disabled**: Grayed out, non-interactive
- **Focus**: Highlighted border with glow

## Configuration Options

```javascript
const config = {
  // BaseControl options
  label: 'Input Label',
  description: 'Helpful description text',

  // TextInputControl specific
  type: 'text',              // Input type: text, number, email, url, etc.
  placeholder: 'Enter text', // Placeholder text
  value: '',                 // Initial value
  min: 0,                    // Minimum value (number type only)
  max: 100,                  // Maximum value (number type only)
  step: 1,                   // Step increment (number type only)
  pattern: '^[0-9]+$',       // Regex pattern for validation
  validate: (value) => {...},// Custom validation function
  unit: 'px',                // Unit suffix to display
  precision: 2,              // Decimal precision for display
  parseNumber: true          // Auto-parse strings to numbers
};
```

## Usage Examples

### 1. Simple Text Input

```javascript
import TextInputControl from './js/controls/types/TextInputControl.js';

const usernameInput = new TextInputControl({
  label: 'Username',
  description: 'Enter your username',
  type: 'text',
  placeholder: 'Enter username...',
  value: ''
});

usernameInput.on('change', (data) => {
  console.log('Username changed:', data.value);
});

usernameInput.render(container);
```

### 2. Numeric Input with Range

```javascript
const speedSlider = new TextInputControl({
  label: 'Speed Multiplier',
  description: 'Value must be between 0 and 10',
  type: 'number',
  value: 1.0,
  min: 0,
  max: 10,
  step: 0.1,
  precision: 1
});

speedSlider.on('change', (data) => {
  console.log('Speed:', data.value); // data.value is a number
});

speedSlider.render(container);
```

### 3. Input with Unit Suffix

```javascript
const packetSize = new TextInputControl({
  label: 'Packet Size',
  description: 'Wavepacket width',
  type: 'number',
  value: 1.0,
  min: 0.1,
  max: 5.0,
  step: 0.1,
  precision: 1,
  unit: 'σ'  // Greek sigma
});

packetSize.render(container);
```

### 4. Email Validation

```javascript
const emailInput = new TextInputControl({
  label: 'Email Address',
  description: 'Must be a valid email format',
  type: 'email',
  placeholder: 'user@example.com',
  pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
});

emailInput.on('invalid', (data) => {
  console.error('Invalid email:', data.message);
});

emailInput.render(container);
```

### 5. Custom Validation Function

```javascript
const positionInput = new TextInputControl({
  label: 'Position X',
  description: 'Position coordinate in physical units',
  type: 'number',
  value: 0.0,
  precision: 2,
  unit: 'units',
  validate: (value) => {
    const num = parseFloat(value);

    if (isNaN(num)) {
      return { valid: false, message: 'Must be a number' };
    }

    if (num < -5.0 || num > 5.0) {
      return {
        valid: false,
        message: 'Must be between -5.0 and 5.0'
      };
    }

    return { valid: true, message: '' };
  }
});

positionInput.on('change', (data) => {
  simulation.setPosition(data.value);
});

positionInput.render(container);
```

### 6. Quantum Playground Use Cases

#### Packet Size Control
```javascript
const packetSizeControl = new TextInputControl({
  label: 'Packet Width',
  description: 'Initial wavepacket width',
  type: 'number',
  value: 1.0,
  min: 0.1,
  max: 5.0,
  step: 0.1,
  precision: 1,
  unit: 'σ',
  validate: (value) => {
    if (value < 0.1) {
      return { valid: false, message: 'Too narrow (min: 0.1σ)' };
    }
    if (value > 5.0) {
      return { valid: false, message: 'Too wide (max: 5.0σ)' };
    }
    return { valid: true };
  }
});
```

#### Position Coordinate
```javascript
const positionX = new TextInputControl({
  label: 'Initial X Position',
  description: 'Starting X coordinate',
  type: 'number',
  value: 0.0,
  min: 0,
  max: 10,
  step: 0.01,
  precision: 2,
  unit: 'units'
});
```

#### Momentum Control
```javascript
const momentumPx = new TextInputControl({
  label: 'Momentum px',
  description: 'Initial momentum in x-direction',
  type: 'number',
  value: 0.0,
  step: 0.1,
  precision: 2,
  unit: 'ℏ/Å'
});
```

## API Reference

### Constructor

```javascript
new TextInputControl(config)
```

Creates a new text input control with the specified configuration.

### Methods

#### `render(container)`
Renders the control to the specified container element.

**Parameters:**
- `container` (HTMLElement): The container to render into

**Returns:** `HTMLElement` - The rendered control element

#### `getValue()`
Gets the current value of the input.

**Returns:** `*` - The current value (parsed to number if `parseNumber` is true)

#### `setValue(value)`
Sets the value programmatically (with validation).

**Parameters:**
- `value` (*): The value to set

**Note:** Only sets the value if it passes validation. Logs a warning if invalid.

#### `enable()`
Enables the input control.

#### `disable()`
Disables the input control.

#### `focus()`
Focuses the input element.

#### `destroy()`
Cleans up the control and removes event listeners.

### Events

#### `change`
Emitted when the input value changes and passes validation.

**Event data:**
```javascript
{
  value: *,              // The new value
  control: TextInputControl  // Reference to control
}
```

#### `invalid`
Emitted when validation fails.

**Event data:**
```javascript
{
  value: *,              // The invalid value
  message: string,       // Error message
  control: TextInputControl  // Reference to control
}
```

#### `input`
Emitted on every keystroke (before validation).

**Event data:**
```javascript
{
  value: string,         // Current input value
  control: TextInputControl  // Reference to control
}
```

### Properties

#### `inputType`
The HTML input type (text, number, email, etc.)

#### `currentValue`
The current value of the input

#### `isValid`
Boolean indicating if the current value is valid

#### `lastValidValue`
The last value that passed validation

## Validation System

### Built-in Validation

1. **Empty Value Check**: Ensures value is not empty
2. **Numeric Range**: Validates min/max for number types
3. **Pattern Matching**: Validates against regex patterns
4. **Custom Function**: Runs user-provided validation function

### Validation Function Signature

```javascript
function validate(value) {
  // Return boolean
  return true; // or false

  // OR return object with details
  return {
    valid: boolean,
    message: string  // Error message if invalid
  };
}
```

### Validation Flow

1. User types in input
2. On blur or Enter key:
   - Parse value (if numeric)
   - Run validation checks
   - Update visual state
   - Emit events
3. On validation success:
   - Update `currentValue`
   - Set valid state (green border)
   - Emit `change` event
4. On validation failure:
   - Keep `currentValue` unchanged
   - Set invalid state (red border + message)
   - Emit `invalid` event

### Visual Feedback

- **Valid**: Green border (`--success-color`)
- **Invalid**: Red border + error message (`--error-color`)
- **Focus**: Blue glow (`--accent-color`)
- **Disabled**: Grayed out (`opacity: 0.5`)

## Keyboard Shortcuts

- **Enter**: Submit the current value (trigger validation)
- **Escape**: Revert to last valid value and blur
- **Tab**: Normal focus behavior

## Styling

The control uses CSS variables from `styles.css` and specific classes from `controls.css`:

### CSS Classes

- `.control-input` - Main wrapper
- `.input-field` - The input element
- `.input-valid` - Valid state
- `.input-invalid` - Invalid state
- `.input-unit` - Unit suffix label
- `.input-validation-message` - Error message container

### CSS Variables

```css
--accent-color       /* Border color on focus */
--success-color      /* Valid state color */
--error-color        /* Invalid state color */
--bg-light           /* Input background */
--border-color       /* Default border */
--text-color         /* Text color */
--text-light         /* Placeholder color */
--font-family        /* Font family */
--font-mono          /* Monospace font for numbers */
```

## Best Practices

### 1. Always Provide Labels
```javascript
// Good
new TextInputControl({
  label: 'Speed',
  type: 'number'
});

// Bad - no context for user
new TextInputControl({
  type: 'number'
});
```

### 2. Use Appropriate Input Types
```javascript
// Good - semantic types
new TextInputControl({ type: 'email' });
new TextInputControl({ type: 'number' });
new TextInputControl({ type: 'tel' });

// Bad - always using 'text'
new TextInputControl({ type: 'text' }); // for email
```

### 3. Provide Clear Validation Messages
```javascript
// Good
validate: (value) => {
  if (value < 0) {
    return { valid: false, message: 'Must be positive' };
  }
  return { valid: true };
}

// Bad - unclear messages
validate: (value) => {
  return { valid: value >= 0, message: 'Invalid' };
}
```

### 4. Use Units for Physical Quantities
```javascript
// Good
new TextInputControl({
  label: 'Position',
  type: 'number',
  unit: 'units'
});

// Less clear
new TextInputControl({
  label: 'Position (units)',
  type: 'number'
});
```

### 5. Set Reasonable Precision
```javascript
// Good
new TextInputControl({
  type: 'number',
  precision: 2,  // 0.01 precision
  value: 3.14
});

// Bad - too many decimals
new TextInputControl({
  type: 'number',
  precision: 8,  // 0.00000001 precision
  value: 3.14159265
});
```

## Error Handling

### Common Issues

1. **Invalid value on setValue()**
   - Logs warning to console
   - Value not updated
   - No visual change

2. **Empty value**
   - Shows "Value is required" message
   - Emits `invalid` event

3. **Out of range (numbers)**
   - Shows specific min/max message
   - Emits `invalid` event

4. **Pattern mismatch**
   - Shows "Invalid format" message
   - Emits `invalid` event

### Error Recovery

The control provides automatic error recovery:
- Press Escape to revert to last valid value
- Continue typing to clear error state
- Valid input automatically removes error

## Performance Considerations

1. **Validation Timing**: Validation runs on blur/enter, not every keystroke
2. **Number Parsing**: Only parses on validation, not during typing
3. **Event Throttling**: Consider throttling `input` events if using for real-time updates
4. **DOM Updates**: Minimal DOM manipulation, efficient state updates

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Focus Indicators**: Clear focus states
- **Error Announcements**: Error messages visible and screen-reader friendly
- **Label Association**: Proper label-input association
- **Touch Targets**: Minimum 44px touch target height

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Features used:**
- ES6 modules
- CSS custom properties
- :has() selector (progressive enhancement)
- Input validation API

## Testing

Test file: `test-textinput.html`

Run tests:
```bash
python3 -m http.server 8765
# Open http://localhost:8765/test-textinput.html
```

Test coverage:
1. Simple text input
2. Numeric input with min/max
3. Email validation with pattern
4. Input with unit suffix
5. Complex custom validation
6. Enable/disable functionality

## Integration Example

```javascript
import ControlPanel from './js/controls/core/ControlPanel.js';
import TextInputControl from './js/controls/types/TextInputControl.js';

// Create control panel
const panel = new ControlPanel({
  title: 'Initial Conditions',
  collapsible: true
});

// Add position inputs
const posX = new TextInputControl({
  label: 'Position X',
  type: 'number',
  value: 0.0,
  min: 0,
  max: 10,
  precision: 2,
  unit: 'units'
});

const posY = new TextInputControl({
  label: 'Position Y',
  type: 'number',
  value: 0.0,
  min: 0,
  max: 10,
  precision: 2,
  unit: 'units'
});

// Add to panel
panel.addControl(posX);
panel.addControl(posY);

// Listen for changes
posX.on('change', (data) => {
  simulation.setInitialPositionX(data.value);
});

posY.on('change', (data) => {
  simulation.setInitialPositionY(data.value);
});

// Render
panel.render(container);
```

## License

Part of Quantum Particle Playground - MIT License

## See Also

- `BaseControl.js` - Base control class
- `SliderControl.js` - Slider control alternative
- `ControlRegistry.js` - Control registration system
- `ControlPanel.js` - Panel container for controls
