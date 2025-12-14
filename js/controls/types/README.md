# Control Types

This directory contains concrete implementations of control types that extend BaseControl.

## Available Controls

### SelectControl

A dropdown selection control with configurable options.

**File**: `SelectControl.js` (276 lines)

**Features**:
- Dropdown select element
- Configurable options with labels and values
- Support for disabled options
- Optional placeholder text
- Dynamic option updates
- Type preservation for values
- Full integration with BaseControl

**Configuration**:
```javascript
{
  type: 'select',
  id: 'my-select',
  label: 'Select Label',
  options: [
    { value: 'val1', label: 'Label 1', disabled: false },
    { value: 'val2', label: 'Label 2' }
  ],
  value: 'val1',           // Initial value
  placeholder: 'Choose...' // Optional
}
```

**Methods**:
- `render(parentElement)` - Render the control
- `getValue()` - Get selected value
- `setValue(value)` - Set selected value
- `setOptions(options)` - Update options dynamically

**Events**:
- `change` - Selection changed
- `focus` - Select gained focus
- `blur` - Select lost focus

**Tests**:
- Node.js: `node test-select.js` (39 tests, all passing)
- Browser: Open `test-select.html`

**Documentation**: See `SELECT_IMPLEMENTATION.md` for full details

## Usage

### Import and Use Directly

```javascript
import { SelectControl } from './js/controls/types/SelectControl.js';

const control = new SelectControl({
  id: 'my-select',
  label: 'Choose',
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ]
});

control.render(document.getElementById('container'));
```

### Use via ControlRegistry

```javascript
import { ControlRegistry } from './js/controls/ControlRegistry.js';
// SelectControl auto-registers when imported

const control = ControlRegistry.create({
  type: 'select',
  id: 'my-select',
  label: 'Choose',
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ]
});
```

## Creating New Control Types

To create a new control type:

1. **Extend BaseControl**:
   ```javascript
   import { BaseControl } from '../BaseControl.js';

   export class MyControl extends BaseControl {
     constructor(config) {
       super(config);
       // Your initialization
     }

     render(parentElement) {
       // Create and return DOM
     }

     getValue() {
       // Return current value
     }

     setValue(value) {
       // Set value
     }
   }
   ```

2. **Register with ControlRegistry**:
   ```javascript
   import { ControlRegistry } from '../ControlRegistry.js';
   ControlRegistry.register('mytype', MyControl);
   ```

3. **Create tests**:
   - Node.js test file (test-mycontrol.js)
   - Browser test file (test-mycontrol.html)

4. **Document**:
   - Add JSDoc comments
   - Update this README
   - Create implementation summary if needed

## Testing

Each control type should include:

1. **Node.js tests** (`test-*.js`)
   - Unit tests with mock DOM
   - Run with: `node test-*.js`

2. **Browser tests** (`test-*.html`)
   - Interactive visual tests
   - Open in browser for manual testing

## File Naming

- Control implementation: `ControlName.js` (PascalCase)
- Node.js tests: `test-controlname.js` (lowercase)
- Browser tests: `test-controlname.html` (lowercase)
- Documentation: `CONTROLNAME_IMPLEMENTATION.md` (uppercase)

## Standards

All control types must:

- ✓ Extend BaseControl
- ✓ Implement render(), getValue(), setValue()
- ✓ Include JSDoc documentation
- ✓ Register with ControlRegistry
- ✓ Include comprehensive tests
- ✓ Use CSS classes from controls.css
- ✓ Follow BaseControl patterns
- ✓ Support enable/disable states
- ✓ Emit appropriate events

## Related Files

- Base class: `../BaseControl.js`
- Registry: `../ControlRegistry.js`
- Styles: `../styles/controls.css`
- Config: `../defaultConfig.js`
- Documentation: `../README.md`
