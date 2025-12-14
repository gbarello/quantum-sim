# ControlPanel Quick Reference

## Import

```javascript
import { ControlPanel } from './ControlPanel.js';
import { ControlRegistry } from './ControlRegistry.js';
```

## Basic Usage

### Create a Simple Panel

```javascript
const panel = new ControlPanel({
  id: 'my-panel',
  title: 'My Panel',
  icon: '🎨'
});

panel.render(document.getElementById('container'));
```

### Create Panel with Controls

```javascript
const panel = new ControlPanel({
  id: 'settings-panel',
  title: 'Settings',
  icon: '⚙️',
  controls: [
    {
      type: 'slider',
      id: 'volume',
      label: 'Volume',
      min: 0,
      max: 100,
      value: 50
    },
    {
      type: 'button',
      id: 'apply',
      label: 'Apply',
      text: 'Apply Changes',
      onClick: () => console.log('Applied!')
    }
  ]
});
```

### Create Collapsible Panel

```javascript
const panel = new ControlPanel({
  id: 'advanced',
  title: 'Advanced Options',
  icon: '🔧',
  collapsible: true,
  collapsed: true  // Start collapsed
});
```

## Configuration Options

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | string | ✅ Yes | - | Unique panel identifier |
| `title` | string | ✅ Yes | - | Panel title text |
| `icon` | string | No | `''` | Icon/emoji for header |
| `collapsible` | boolean | No | `false` | Can panel be collapsed |
| `collapsed` | boolean | No | `false` | Initial collapsed state |
| `controls` | Array | No | `[]` | Control configuration objects |
| `className` | string | No | `''` | Additional CSS classes |

## Methods

### Control Management

```javascript
// Add a control
const control = ControlRegistry.create({...});
panel.addControl(control);

// Get a control
const myControl = panel.getControl('control-id');

// Remove a control
panel.removeControl('control-id');

// Get all controls
const allControls = panel.getAllControls();

// Check if has control
if (panel.hasControl('control-id')) { ... }

// Get control count
const count = panel.getControlCount();
```

### Lifecycle

```javascript
// Render panel
panel.render(parentElement);

// Check if rendered
if (panel.isRendered()) { ... }

// Destroy panel
panel.destroy();

// Check if destroyed
if (panel.isDestroyed()) { ... }
```

### Collapsibility

```javascript
// Collapse panel
panel.collapse();

// Expand panel
panel.expand();

// Toggle state
panel.toggle();

// Check state
if (panel.isCollapsed()) { ... }
if (panel.isCollapsible()) { ... }
```

### Bulk Operations

```javascript
// Get all values
const values = panel.getValues();
// Returns: { controlId1: value1, controlId2: value2, ... }

// Set multiple values
panel.setValues({
  'control-id-1': newValue1,
  'control-id-2': newValue2
});

// Enable/disable all
panel.enableAll();
panel.disableAll();

// Show/hide all
panel.showAll();
panel.hideAll();

// Update all controls
panel.update();
```

## Common Patterns

### Dynamic Panel Building

```javascript
// Start with empty panel
const panel = new ControlPanel({
  id: 'dynamic',
  title: 'Dynamic Panel'
});

panel.render(container);

// Add controls later
function addControl(config) {
  const control = ControlRegistry.create(config);
  panel.addControl(control);
}

addControl({ type: 'slider', id: 's1', label: 'Speed', ... });
addControl({ type: 'button', id: 'b1', label: 'Reset', ... });
```

### Control Communication

```javascript
const panel = new ControlPanel({
  id: 'linked',
  title: 'Linked Controls',
  controls: [
    {
      type: 'slider',
      id: 'input',
      label: 'Input',
      min: 0,
      max: 100,
      value: 50,
      onChange: (data) => {
        // Update display when slider changes
        const display = panel.getControl('output');
        display.setValue(`Value: ${data.value}`);
      }
    },
    {
      type: 'display',
      id: 'output',
      label: 'Output',
      defaultValue: 'Value: 50'
    }
  ]
});
```

### Form-like Panel

```javascript
const formPanel = new ControlPanel({
  id: 'user-form',
  title: 'User Settings',
  controls: [
    { type: 'slider', id: 'age', label: 'Age', min: 18, max: 100, value: 25 },
    { type: 'select', id: 'country', label: 'Country', options: [...], defaultValue: 'US' },
    { type: 'button', id: 'submit', label: 'Submit', text: 'Save Settings', onClick: handleSubmit }
  ]
});

function handleSubmit() {
  const values = formPanel.getValues();
  console.log('Form data:', values);
  // { age: 25, country: 'US' }
}
```

### Accordion-style Layout

```javascript
const panel1 = new ControlPanel({
  id: 'section-1',
  title: 'Section 1',
  collapsible: true,
  controls: [...]
});

const panel2 = new ControlPanel({
  id: 'section-2',
  title: 'Section 2',
  collapsible: true,
  collapsed: true,
  controls: [...]
});

// Render both
panel1.render(container);
panel2.render(container);

// Make them mutually exclusive
panel1.container.addEventListener('control:expanded', () => panel2.collapse());
panel2.container.addEventListener('control:expanded', () => panel1.collapse());
```

## DOM Structure Generated

```html
<div class="control-panel" id="panel-{id}">
  <div class="panel-header">
    <span class="panel-icon">{icon}</span>
    <h3 class="panel-title">{title}</h3>
    <button class="panel-toggle">▶</button> <!-- if collapsible -->
  </div>
  <div class="panel-content">
    <div class="panel-body">
      <!-- Controls rendered here -->
    </div>
  </div>
</div>
```

## CSS Classes Used

- `.control-panel` - Base container
- `.collapsible-panel` - Collapsible variant
- `.expanded` - Expanded state
- `.panel-header` / `.collapsible-header` - Header
- `.panel-title` / `.collapsible-title` - Title
- `.panel-icon` - Icon
- `.panel-toggle` / `.collapsible-icon` - Toggle button
- `.panel-content` / `.collapsible-content` - Content wrapper
- `.panel-body` / `.collapsible-body` - Inner content

## Tips & Best Practices

### 1. Always Destroy Panels When Done
```javascript
// Clean up when no longer needed
panel.destroy();
```

### 2. Check Rendered State Before Operations
```javascript
if (panel.isRendered()) {
  // Safe to call render-dependent methods
}
```

### 3. Handle Control Creation Errors
```javascript
// Panel catches errors but logs them
// Check control count to verify success
const panel = new ControlPanel({ id: 'test', title: 'Test', controls: [...] });
console.log(`Created ${panel.getControlCount()} controls`);
```

### 4. Use Collapsible for Long Panels
```javascript
// For panels with many controls, make them collapsible
// to save screen space
const panel = new ControlPanel({
  collapsible: true,
  collapsed: false, // But start expanded
  ...
});
```

### 5. Group Related Controls
```javascript
// Use panels to logically group controls
const simulationPanel = new ControlPanel({ id: 'sim', title: 'Simulation', ... });
const visualizationPanel = new ControlPanel({ id: 'viz', title: 'Visualization', ... });
```

## Error Handling

```javascript
// Constructor throws on missing required fields
try {
  const panel = new ControlPanel({ id: 'test' }); // Missing title
} catch (error) {
  console.error(error); // "ControlPanel: config.title is required"
}

// addControl throws on invalid input
try {
  panel.addControl(null); // Invalid control
} catch (error) {
  console.error(error); // "Invalid control object"
}

// Control creation errors are caught and logged
const panel = new ControlPanel({
  id: 'test',
  title: 'Test',
  controls: [
    { type: 'invalid-type', id: 'bad', label: 'Bad' } // Logs error, continues
  ]
});
```

## Performance Notes

- **Fast Lookup:** Uses Map for O(1) control lookup by ID
- **Lazy Rendering:** Controls only rendered when panel is rendered
- **Batch Updates:** Use `setValues()` instead of multiple `setValue()` calls
- **Memory:** Proper cleanup with `destroy()` prevents leaks

## See Also

- **Full Documentation:** `CONTROLPANEL_IMPLEMENTATION.md`
- **Test Suite:** `test-panel.html`
- **Refactor Plan:** `../../controls-refactor.md` (lines 498-541)
- **Base Control:** `BaseControl.js`
- **Control Registry:** `ControlRegistry.js`
