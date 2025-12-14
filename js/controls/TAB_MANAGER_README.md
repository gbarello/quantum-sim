# TabManager - Complete Implementation

## Overview

The `TabManager` class manages multiple control panels as tabs, providing tab switching, keyboard navigation, animations, and persistent state management.

**Location:** `/js/controls/TabManager.js`
**Size:** 586 lines
**Status:** ✅ Complete and tested

## Features

### Core Features
- ✅ Tab bar with icon + title buttons
- ✅ Panel visibility management (only active panel visible)
- ✅ Tab switching with active state indication
- ✅ Custom event emission (`tabchange`)
- ✅ Complete lifecycle management (add/remove/destroy)

### Keyboard Navigation
- ✅ Arrow Left/Up - Navigate to previous tab
- ✅ Arrow Right/Down - Navigate to next tab
- ✅ Home - Jump to first tab
- ✅ End - Jump to last tab
- ✅ Enter/Space - Activate focused tab
- ✅ Tab key focus management

### Advanced Features
- ✅ Animated transitions (slide, fade, scale)
- ✅ Persistent state (localStorage)
- ✅ Dynamic panel add/remove
- ✅ Tab disable/enable support
- ✅ Flexible tab positioning (top, bottom, left, right)

## API Reference

### Constructor

```javascript
const tabManager = new TabManager({
  panels: Array<Panel>,           // Required: Array of panel objects
  defaultPanel: string,            // Optional: Initially active panel ID
  tabPosition: string,             // Optional: 'top', 'bottom', 'left', 'right' (default: 'top')
  animated: boolean,               // Optional: Enable animations (default: true)
  persistent: boolean,             // Optional: Remember last active tab (default: false)
  animationType: string,           // Optional: 'slide', 'fade', 'scale' (default: 'slide')
  storageKey: string              // Optional: localStorage key (default: 'tabManager.activePanel')
});
```

### Panel Object

```javascript
{
  id: string,              // Required: Unique panel identifier
  title: string,           // Required: Display title for tab
  icon: string,            // Optional: Icon (emoji or HTML)
  element: HTMLElement,    // Optional: Panel DOM element
  disabled: boolean        // Optional: Whether tab is disabled (default: false)
}
```

### Methods

#### `addPanel(panel)`
Add a panel to the tab manager.

```javascript
tabManager.addPanel({
  id: 'my-panel',
  title: 'My Panel',
  icon: '🎨',
  element: myElement
});
```

#### `removePanel(panelId)`
Remove a panel from the tab manager.

```javascript
tabManager.removePanel('my-panel');
```

#### `switchToPanel(panelId, force = false)`
Switch to a specific panel.

```javascript
tabManager.switchToPanel('simulation');
tabManager.switchToPanel('simulation', true); // Force switch even if already active
```

#### `getPanel(panelId)`
Get a panel object by ID.

```javascript
const panel = tabManager.getPanel('simulation');
console.log(panel.title); // "Simulation"
```

#### `render(parentElement)`
Render the tab manager into a parent element.

```javascript
const container = document.getElementById('controls');
tabManager.render(container);
```

#### `destroy()`
Destroy the tab manager and clean up resources.

```javascript
tabManager.destroy();
```

#### `getActivePanel()`
Get the currently active panel ID.

```javascript
const activeId = tabManager.getActivePanel();
```

#### `getAllPanelIds()`
Get all panel IDs.

```javascript
const ids = tabManager.getAllPanelIds();
// ['initial-conditions', 'simulation', 'statistics']
```

#### `hasPanel(panelId)`
Check if a panel exists.

```javascript
if (tabManager.hasPanel('simulation')) {
  // Panel exists
}
```

#### `setPanelDisabled(panelId, disabled)`
Enable or disable a panel.

```javascript
tabManager.setPanelDisabled('statistics', true);  // Disable
tabManager.setPanelDisabled('statistics', false); // Enable
```

#### `isDestroyed()`
Check if manager is destroyed.

```javascript
if (tabManager.isDestroyed()) {
  console.log('Manager is destroyed');
}
```

## Events

### `tabchange`

Emitted when the active tab changes.

```javascript
container.addEventListener('tabchange', (e) => {
  console.log('Tab changed from', e.detail.from, 'to', e.detail.to);
});
```

Event detail:
```javascript
{
  from: string,  // Previous panel ID (or null)
  to: string     // New panel ID
}
```

## DOM Structure

```html
<div class="tab-manager tab-container">
  <div class="tab-bar" role="tablist">
    <button class="tab-button active"
            data-panel-id="simulation"
            role="tab"
            aria-selected="true"
            aria-label="Simulation">
      <span class="tab-icon">▶️</span>
      <span class="tab-label">Simulation</span>
    </button>
    <!-- More tab buttons... -->
  </div>

  <div class="tab-content-container anim-slide">
    <div class="tab-content active"
         data-panel-id="simulation"
         role="tabpanel">
      <!-- Panel content here -->
    </div>
    <!-- More panels... -->
  </div>
</div>
```

## CSS Classes

### Layout Classes
- `.tab-manager` - Main container
- `.tab-container` - Container with flexbox layout
- `.tab-container.vertical` - Vertical layout (for left/right positioning)
- `.tab-bar` - Tab button container
- `.tab-content-container` - Panel content container

### Tab Button Classes
- `.tab-button` - Tab button
- `.tab-button.active` - Active tab button
- `.tab-icon` - Icon span
- `.tab-label` - Label span

### Panel Classes
- `.tab-content` - Panel wrapper
- `.tab-content.active` - Active panel (visible)

### Animation Classes
- `.anim-slide` - Slide animation
- `.anim-fade` - Fade animation
- `.anim-scale` - Scale animation

## Usage Examples

### Basic Usage

```javascript
import { TabManager } from './TabManager.js';

// Create panels
const panels = [
  {
    id: 'tab1',
    title: 'First Tab',
    icon: '📄',
    element: document.getElementById('panel1')
  },
  {
    id: 'tab2',
    title: 'Second Tab',
    icon: '📊',
    element: document.getElementById('panel2')
  }
];

// Create tab manager
const tabManager = new TabManager({
  panels: panels,
  defaultPanel: 'tab1'
});

// Render
tabManager.render(document.getElementById('container'));

// Listen for changes
document.getElementById('container').addEventListener('tabchange', (e) => {
  console.log('Switched to', e.detail.to);
});
```

### With Animations

```javascript
const tabManager = new TabManager({
  panels: panels,
  defaultPanel: 'tab1',
  animated: true,
  animationType: 'slide'  // 'slide', 'fade', or 'scale'
});
```

### With Persistence

```javascript
const tabManager = new TabManager({
  panels: panels,
  defaultPanel: 'tab1',
  persistent: true,
  storageKey: 'myApp.activeTab'
});

// Last active tab is automatically restored from localStorage
```

### Dynamic Panel Management

```javascript
// Add a panel dynamically
tabManager.addPanel({
  id: 'new-panel',
  title: 'New Panel',
  icon: '🆕',
  element: createPanelElement()
});

// Remove a panel
tabManager.removePanel('old-panel');

// Disable a panel
tabManager.setPanelDisabled('tab2', true);
```

### Programmatic Tab Switching

```javascript
// Switch to a specific tab
tabManager.switchToPanel('tab2');

// Get current active tab
const active = tabManager.getActivePanel();
console.log('Current tab:', active);

// Check if tab exists
if (tabManager.hasPanel('tab3')) {
  tabManager.switchToPanel('tab3');
}
```

## Integration with defaultConfig.js

The TabManager is designed to work with the three tabs defined in `defaultConfig.js`:

```javascript
import { defaultControlsConfig } from './defaultConfig.js';
import { TabManager } from './TabManager.js';

// Extract tabs from config
const panels = defaultControlsConfig.tabs.map(tab => ({
  id: tab.id,
  title: tab.title,
  icon: tab.icon,
  element: createPanelFromConfig(tab)  // Your panel creation logic
}));

// Create tab manager
const tabManager = new TabManager({
  panels: panels,
  defaultPanel: defaultControlsConfig.defaultTab,
  animated: true,
  persistent: true
});

tabManager.render(document.getElementById('controls'));
```

## Testing

### Browser Tests
Open `test-tabs.html` in a browser to see four different test scenarios:

1. **Basic Tab Manager** - Simple tab switching
2. **Animated Transitions** - Slide animations
3. **Persistent State** - localStorage persistence
4. **Dynamic Management** - Add/remove panels

```bash
# Open in browser
open js/controls/test-tabs.html
```

### API Verification
Run the Node.js verification script:

```bash
cd js/controls
node test-tab-manager.js
```

## Accessibility

The TabManager follows ARIA best practices:

- ✅ `role="tablist"` on tab bar
- ✅ `role="tab"` on tab buttons
- ✅ `role="tabpanel"` on panel content
- ✅ `aria-selected` indicates active tab
- ✅ `aria-label` provides accessible labels
- ✅ Keyboard navigation support
- ✅ Focus management
- ✅ Proper tabindex values

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers

Requires:
- ES6+ (classes, arrow functions, Map, Set)
- CustomEvent API
- localStorage API (for persistence)
- CSS custom properties (variables)

## Performance

- **Lightweight:** 586 lines, ~17KB
- **Efficient rendering:** Only active panel is visible
- **Minimal reflows:** Uses CSS classes for visibility
- **Event cleanup:** All listeners removed on destroy
- **Memory efficient:** Maps for O(1) lookups

## Known Limitations

1. Panel elements must be provided or added after creation
2. Tab position changes require re-render
3. Animation type changes require re-render
4. Icons are plain text/emojis (no SVG support built-in)

## Future Enhancements

Possible improvements:
- SVG icon support
- Drag-to-reorder tabs
- Tab overflow scrolling indicators
- Tab close buttons
- Tab badges/notifications
- More animation types
- Tab groups/categories

## Related Files

- `TabManager.js` - Main implementation (586 lines)
- `test-tabs.html` - Browser tests
- `test-tab-manager.js` - API verification script
- `styles/tabs.css` - Tab styling (558 lines)
- `defaultConfig.js` - Configuration with tab definitions

## Status

✅ **Complete and tested**

All requirements from `controls-refactor.md` (lines 543-583) have been implemented:

- ✅ Tab switching and navigation
- ✅ Panel visibility management
- ✅ Tab lifecycle (add/remove/destroy)
- ✅ Keyboard navigation support
- ✅ Configuration schema
- ✅ DOM structure
- ✅ Active tab indication
- ✅ Event emission
- ✅ Animations
- ✅ Persistence
- ✅ Multiple tab positions

## Notes

The implementation is larger than the target ~300 lines due to:
- Comprehensive JSDoc comments (~100 lines)
- Complete keyboard navigation (~60 lines)
- Robust error handling (~40 lines)
- Additional utility methods (~80 lines)
- Detailed lifecycle management (~60 lines)

Core functionality is approximately 300-350 lines, with additional features and documentation adding the rest.
