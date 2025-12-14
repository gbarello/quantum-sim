# ControlsManager - Complete Integration Guide

## Overview

The **ControlsManager** is the central coordinator for the quantum playground controls system. It replaces the monolithic `Controller` class with a clean, modular architecture that integrates all control components into a cohesive system.

## Key Features

- **Declarative Configuration**: Build entire control system from `defaultConfig.js`
- **Automatic Control Creation**: Creates controls from config using ControlRegistry
- **Tab Management**: Organizes controls into tabbed panels via TabManager
- **State Management**: Centralized state for app (playing, time, measurements, etc.)
- **Canvas Integration**: Handles click/hover for measurement interactions
- **Simulation Bridge**: Connects controls to simulation/visualizer with minimal coupling
- **Lifecycle Management**: Complete initialization and cleanup

## Architecture

```
ControlsManager
  ├── TabManager (manages tabs and panel visibility)
  │   ├── Tab 1: Initial Conditions (ControlPanel)
  │   │   ├── Position Selector (CanvasControl)
  │   │   ├── Momentum Selector (CanvasControl)
  │   │   ├── Packet Size (SliderControl)
  │   │   └── Reset Button (ButtonControl)
  │   │
  │   ├── Tab 2: Simulation (ControlPanel)
  │   │   ├── Play/Pause Button (ButtonControl)
  │   │   ├── Speed Slider (SliderControl)
  │   │   ├── Measurement Radius (SliderControl)
  │   │   ├── Potential Type (RadioControl)
  │   │   ├── Potential Strength (SliderControl)
  │   │   └── Visualization Mode (SelectControl)
  │   │
  │   └── Tab 3: Statistics (ControlPanel)
  │       ├── Total Probability (DisplayControl)
  │       ├── Time Elapsed (DisplayControl)
  │       ├── Grid Size (DisplayControl)
  │       └── Measurement Count (DisplayControl)
  │
  ├── State (global app state)
  │   ├── isPlaying
  │   ├── elapsedTime
  │   ├── measurementCount
  │   ├── initialPosition
  │   ├── initialMomentum
  │   └── packetSize
  │
  └── Integration Points
      ├── simulation (QuantumSimulation instance)
      ├── visualizer (Visualizer instance)
      └── canvas (for click/hover handling)
```

## Usage

### Basic Setup

```javascript
import { ControlsManager } from './controls/ControlsManager.js';
import { QuantumSimulation } from './quantum.js';
import { Visualizer } from './visualization/VisualizerV2.js';

// Create simulation and visualizer
const simulation = new QuantumSimulation(...);
const visualizer = new Visualizer(canvas, simulation);

// Create controls manager
const manager = new ControlsManager(simulation, visualizer);

// Initialize controls into a container
const controlsRoot = document.getElementById('controls-container');
manager.initialize(controlsRoot);
```

### Animation Loop Integration

```javascript
function animationLoop(currentTime) {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update simulation if playing
  if (manager.getState().isPlaying) {
    simulation.step();
  }

  // Update controls (display controls refresh their values)
  manager.update(deltaTime);

  // Render visualization
  visualizer.render();

  requestAnimationFrame(animationLoop);
}
```

### Canvas Interaction

```javascript
// Handle clicks for quantum measurements
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  manager.handleCanvasClick(x, y);
});

// Handle hover for measurement preview
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  manager.handleCanvasHover(x, y);
});
```

## API Reference

### Constructor

```javascript
new ControlsManager(simulation, visualizer, config = null)
```

**Parameters:**
- `simulation` (QuantumSimulation) - Required. The quantum simulation instance
- `visualizer` (Visualizer) - Required. The visualization instance
- `config` (Object) - Optional. Configuration object (defaults to defaultControlsConfig)

**Throws:**
- Error if simulation or visualizer is missing

---

### initialize(containerElement)

Initialize the control system and render it into a container.

```javascript
manager.initialize(containerElement)
```

**Parameters:**
- `containerElement` (HTMLElement) - Required. Parent element to render controls into

**Returns:**
- (HTMLElement) The rendered controls container

**Throws:**
- Error if already destroyed
- Error if containerElement is not provided

**Side Effects:**
- Creates all control panels from config
- Creates TabManager with panels
- Renders controls into DOM
- Initializes selector canvases

---

### getState()

Get a copy of the current application state.

```javascript
const state = manager.getState()
```

**Returns:**
- (Object) Copy of state object with properties:
  - `isPlaying` (boolean) - Whether simulation is running
  - `elapsedTime` (number) - Time elapsed in simulation
  - `measurementInProgress` (boolean) - Whether a measurement is being performed
  - `measurementCount` (number) - Total number of measurements performed
  - `initialPosition` (Object) - {x, y} normalized position (0-1)
  - `initialMomentum` (Object) - {x, y} normalized momentum (0-1)
  - `packetSize` (number) - Wavepacket size parameter

---

### setState(updates)

Update state with new values.

```javascript
manager.setState({ measurementCount: 5 })
```

**Parameters:**
- `updates` (Object) - Object with state properties to update

**Note:** This performs a shallow merge with existing state.

---

### togglePlayPause()

Toggle between playing and paused states.

```javascript
const isPlaying = manager.togglePlayPause()
```

**Returns:**
- (boolean) New playing state (true = playing, false = paused)

**Side Effects:**
- Updates `state.isPlaying`
- Play/pause button should update its appearance via its onClick handler

---

### handleReset()

Reset the simulation to initial conditions using current state values.

```javascript
manager.handleReset()
```

**Side Effects:**
- Calls `simulation.initialize()` with current state values
- Converts normalized position (0-1) to grid coordinates
- Converts normalized momentum (0-1) to physical momentum (-5 to +5)
- Resets simulation time to 0
- Resets measurement count to 0

**Example:**
```javascript
// Set initial conditions
manager.setState({
  initialPosition: { x: 0.3, y: 0.7 },
  initialMomentum: { x: 0.6, y: 0.4 },
  packetSize: 1.5
});

// Reset simulation with these conditions
manager.handleReset();
```

---

### handleCanvasClick(canvasX, canvasY)

Handle canvas click for quantum measurement.

```javascript
manager.handleCanvasClick(canvasX, canvasY)
```

**Parameters:**
- `canvasX` (number) - Canvas X coordinate in pixels
- `canvasY` (number) - Canvas Y coordinate in pixels

**Side Effects:**
- Converts canvas coords to grid coordinates
- Calls `simulation.measure(gridX, gridY)`
- Increments measurement count if measurement succeeds
- Triggers measurement feedback in visualizer
- Sets `measurementInProgress` flag temporarily

**Notes:**
- Coordinates must be within the wavefunction visualization region
- Measurement is ignored if already in progress
- Measurement probability and outcome logged to console

---

### handleCanvasHover(canvasX, canvasY)

Handle canvas hover for measurement preview.

```javascript
manager.handleCanvasHover(canvasX, canvasY)
```

**Parameters:**
- `canvasX` (number) - Canvas X coordinate in pixels
- `canvasY` (number) - Canvas Y coordinate in pixels

**Side Effects:**
- Converts canvas coords to grid coordinates
- Updates hover state in visualizer
- May trigger hover preview circle rendering

---

### update(deltaTime)

Update controls each frame.

```javascript
manager.update(deltaTime)
```

**Parameters:**
- `deltaTime` (number) - Time elapsed since last update in seconds

**Side Effects:**
- Updates elapsed time if playing
- Calls `update()` on all panels (which updates display controls)
- Display controls pull fresh values via their `getValue` functions

**Usage:**
Call this each animation frame to keep display controls synchronized.

---

### destroy()

Destroy the control system and clean up resources.

```javascript
manager.destroy()
```

**Side Effects:**
- Destroys TabManager
- Destroys all panels and controls
- Removes all event listeners
- Clears all references
- Sets internal destroyed flag

**Note:** Manager cannot be used after destruction.

---

### Additional Methods

#### getControl(controlId)

Get a control by ID from any panel.

```javascript
const speedSlider = manager.getControl('speed')
```

**Returns:**
- (BaseControl|null) Control instance or null if not found

---

#### getPanel(panelId)

Get a panel by ID.

```javascript
const simPanel = manager.getPanel('simulation')
```

**Returns:**
- (ControlPanel|null) Panel instance or null if not found

---

#### getAllPanels()

Get all panels.

```javascript
const panels = manager.getAllPanels()
```

**Returns:**
- (Array<ControlPanel>) Array of all panel instances

---

#### switchToTab(tabId)

Switch to a specific tab.

```javascript
manager.switchToTab('statistics')
```

**Parameters:**
- `tabId` (string) - ID of tab to activate

---

#### getActiveTab()

Get the currently active tab ID.

```javascript
const activeTab = manager.getActiveTab()
```

**Returns:**
- (string|null) Active tab ID or null

---

#### isDestroyed()

Check if manager is destroyed.

```javascript
const destroyed = manager.isDestroyed()
```

**Returns:**
- (boolean) True if destroyed

---

## State Management

The ControlsManager maintains global application state that controls and the animation loop can read and modify.

### State Properties

| Property | Type | Description |
|----------|------|-------------|
| `isPlaying` | boolean | Whether simulation is running |
| `elapsedTime` | number | Time elapsed in simulation (seconds) |
| `measurementInProgress` | boolean | Whether a measurement is being performed |
| `measurementCount` | number | Total measurements performed |
| `initialPosition` | Object | {x, y} normalized (0-1) |
| `initialMomentum` | Object | {x, y} normalized (0-1) |
| `packetSize` | number | Wavepacket width parameter |

### State Access Patterns

**Read state:**
```javascript
const state = manager.getState();
if (state.isPlaying) {
  simulation.step();
}
```

**Modify state:**
```javascript
manager.setState({ measurementCount: state.measurementCount + 1 });
```

**Toggle boolean:**
```javascript
const isPlaying = manager.togglePlayPause();
```

---

## Configuration

The controls system is driven by a declarative configuration in `defaultConfig.js`. This makes it easy to add, remove, or modify controls without touching the ControlsManager code.

### Config Structure

```javascript
{
  settings: {
    theme: 'light',
    persistState: true,
    keyboardShortcuts: true
  },

  tabs: [
    {
      id: 'tab-id',
      title: 'Tab Title',
      icon: '⚙️',
      controls: [
        {
          type: 'slider',
          id: 'control-id',
          label: 'Control Label',
          min: 0,
          max: 100,
          value: 50,
          transform: (val) => val / 100,
          onChange: (val, manager) => {
            // Handle change
          }
        },
        // More controls...
      ]
    },
    // More tabs...
  ],

  defaultTab: 'simulation'
}
```

### Control Handler Binding

The ControlsManager automatically binds handlers with the manager reference:

**onChange handler:**
```javascript
onChange: (value, manager, control) => {
  // value: transformed value from the control
  // manager: ControlsManager instance
  // control: the control instance itself
  manager.simulation.setTimeScale(value);
}
```

**onClick handler:**
```javascript
onClick: (manager, control) => {
  // manager: ControlsManager instance
  // control: the control instance itself
  manager.handleReset();
}
```

**onSelect handler (for canvas controls):**
```javascript
onSelect: (x, y, manager, control) => {
  // x, y: normalized coordinates (0-1)
  // manager: ControlsManager instance
  // control: the control instance itself
  manager.state.initialPosition = { x, y };
  manager.drawPositionSelector();
}
```

**getValue function (for display controls):**
```javascript
getValue: (manager) => {
  // manager: ControlsManager instance
  // return: value to display
  return manager.simulation.psi.norm();
}
```

---

## Integration with Existing Code

### Replacing Old Controller

The ControlsManager is a drop-in replacement for the old Controller class.

**Old code:**
```javascript
const controller = new Controller(simulation, visualizer, config);
controller.initialize(canvas, controlsContainer);
controller.update();
```

**New code:**
```javascript
const manager = new ControlsManager(simulation, visualizer);
manager.initialize(controlsContainer);
manager.update(deltaTime);
```

### Key Differences

1. **No canvas parameter in initialize()**: Canvas interaction is handled via event handlers
2. **update() takes deltaTime**: For accurate timing in display controls
3. **State is explicit**: Use `getState()` and `setState()` instead of direct property access
4. **Control access is via methods**: Use `getControl()` instead of direct property access

---

## Canvas Selector Controls

The ControlsManager includes special handling for canvas selector controls used in the Initial Conditions tab.

### Position Selector

Shows a grid with a crosshair indicating the selected starting position.

**Visualization:**
- 10×10 grid overlay
- Green crosshair at selected position
- Green circle around selection point

**Interaction:**
- Click to set new position
- Position stored as normalized coords (0-1)
- Automatically redrawn when position changes

### Momentum Selector

Shows a grid with an arrow indicating the momentum direction and magnitude.

**Visualization:**
- 10×10 grid overlay
- Gray dot at center (zero momentum)
- Orange arrow showing momentum vector
- Arrow length proportional to magnitude

**Interaction:**
- Click to set new momentum
- Momentum stored as normalized coords (0-1)
- Maps to physical momentum range (-5 to +5)
- Automatically redrawn when momentum changes

### Drawing Methods

```javascript
manager.drawPositionSelector()
manager.drawMomentumSelector()
```

These are called automatically when the selection changes, but can also be called manually to refresh the display.

---

## Display Controls

Display controls automatically update by pulling values from the simulation via their `getValue` functions.

### Example: Total Probability Display

```javascript
{
  type: 'display',
  id: 'total-probability',
  label: 'Total Probability',
  format: (val) => `${(val * 100).toFixed(4)}%`,
  updateInterval: 100,  // Update every 100ms
  getValue: (manager) => {
    return manager.simulation.psi.norm();
  }
}
```

**How it works:**
1. `manager.update()` calls `panel.update()` for each panel
2. `panel.update()` calls `control.update()` for each control
3. Display controls check if it's time to update (based on `updateInterval`)
4. If yes, calls `getValue(manager)` to get fresh value
5. Formats value with `format()` function
6. Updates DOM with formatted value

---

## Event Flow

### Initialization Flow

```
main.js creates simulation and visualizer
  ↓
main.js creates ControlsManager(simulation, visualizer)
  ↓
main.js calls manager.initialize(controlsContainer)
  ↓
ControlsManager._registerControlTypes()
  ↓
ControlsManager.createFromConfig(defaultControlsConfig)
  ↓
For each tab config:
  - Process control configs (inject manager refs)
  - Create ControlPanel with processed controls
  - ControlPanel creates controls via ControlRegistry
  ↓
Create TabManager with panels
  ↓
Render TabManager into container
  ↓
Initialize selector canvases
  ↓
Controls system ready!
```

### Animation Loop Flow

```
requestAnimationFrame(animationLoop)
  ↓
Calculate deltaTime
  ↓
Check manager.getState().isPlaying
  ↓
If playing:
  - simulation.step() (5 times per frame)
  ↓
manager.update(deltaTime)
  - Updates elapsed time
  - Calls panel.update() on each panel
    - Display controls refresh their values
  ↓
visualizer.render()
  ↓
requestAnimationFrame(animationLoop)
```

### Measurement Flow

```
User clicks canvas
  ↓
Canvas click event handler
  ↓
manager.handleCanvasClick(canvasX, canvasY)
  ↓
Convert canvas coords to grid coords
  ↓
Check if valid and not already measuring
  ↓
Set measurementInProgress = true
  ↓
Call simulation.measure(gridX, gridY)
  ↓
If measurement succeeds:
  - Increment measurementCount
  - Trigger visualizer feedback
  - Log to console
  ↓
Clear measurementInProgress after 100ms
```

---

## Testing

### Interactive Test

Run the interactive test in a browser:

```bash
# Open in browser
open js/controls/test-controls-manager.html
```

**Test Coverage:**
- ✓ All tabs created correctly
- ✓ TabManager initialization
- ✓ All controls present in each panel
- ✓ State management (get/set)
- ✓ Play/pause toggle
- ✓ Reset functionality
- ✓ Canvas click handling
- ✓ Control lookup by ID
- ✓ Tab switching

### Manual Testing Checklist

1. **Initial Conditions Tab:**
   - [ ] Click position selector to change starting position
   - [ ] Click momentum selector to change starting momentum
   - [ ] Drag packet size slider
   - [ ] Click reset button → simulation resets

2. **Simulation Tab:**
   - [ ] Click play/pause → simulation starts/stops
   - [ ] Drag speed slider → simulation speed changes
   - [ ] Drag measurement radius slider → measurement circle size changes
   - [ ] Select potential type radio → potential changes
   - [ ] Drag potential strength slider → potential strength changes
   - [ ] Select visualization mode → display changes

3. **Statistics Tab:**
   - [ ] Total probability displays and updates
   - [ ] Time elapsed displays and updates
   - [ ] Grid size displays correctly
   - [ ] Measurement count increments when clicking canvas

4. **Canvas Interactions:**
   - [ ] Click canvas → performs measurement
   - [ ] Hover canvas → shows preview circle
   - [ ] Measurement count increments
   - [ ] Measurement feedback appears

5. **Tab Switching:**
   - [ ] Click tabs to switch between panels
   - [ ] Active tab is highlighted
   - [ ] Tab content shows/hides correctly
   - [ ] State persists across tab switches

---

## Troubleshooting

### Controls Not Appearing

**Symptom:** Controls container is empty after initialization.

**Possible Causes:**
1. Container element not found
2. Config is invalid
3. Control types not registered

**Solution:**
```javascript
// Check container exists
const container = document.getElementById('controls-root');
if (!container) {
  console.error('Container not found!');
}

// Check config
console.log('Config:', defaultControlsConfig);

// Check control types registered
console.log('Registered types:', ControlRegistry.getTypes());
```

---

### Display Controls Not Updating

**Symptom:** Display controls show initial value but don't update.

**Possible Causes:**
1. `manager.update()` not being called
2. `getValue` function returning null/undefined
3. Update interval too high

**Solution:**
```javascript
// Verify update is being called
console.log('Update called');

// Check getValue returns valid value
const control = manager.getControl('total-probability');
const value = control.config.getValue(manager);
console.log('Display value:', value);

// Reduce update interval
control.config.updateInterval = 50; // Update every 50ms
```

---

### Canvas Measurements Not Working

**Symptom:** Clicking canvas doesn't perform measurements.

**Possible Causes:**
1. Click handler not attached
2. Coordinates out of bounds
3. Measurement already in progress

**Solution:**
```javascript
// Verify handler attached
canvas.addEventListener('click', (e) => {
  console.log('Canvas clicked at', e.clientX, e.clientY);
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  console.log('Relative coords:', x, y);
  manager.handleCanvasClick(x, y);
});

// Check measurement state
console.log('Measurement in progress:', manager.getState().measurementInProgress);
```

---

### State Not Persisting

**Symptom:** Tab selection or other state resets on page reload.

**Possible Causes:**
1. TabManager persistent option not set
2. localStorage disabled
3. StorageKey conflict

**Solution:**
```javascript
// Enable persistent tabs
this.tabManager = new TabManager({
  panels: panelArray,
  persistent: true,
  storageKey: 'quantumPlayground.activeTab'
});

// Check localStorage
console.log('Active tab:', localStorage.getItem('quantumPlayground.activeTab'));
```

---

## Performance Considerations

### Update Frequency

Display controls have an `updateInterval` property (default 100ms). This prevents excessive DOM updates.

**Optimization:**
```javascript
{
  type: 'display',
  updateInterval: 200,  // Update every 200ms instead of every frame
  // ...
}
```

### Control Creation

Controls are created once during initialization. Adding/removing controls dynamically is possible but not recommended during animation.

**Best Practice:**
- Create all controls at initialization
- Use `show()`/`hide()` to toggle visibility
- Use `enable()`/`disable()` to toggle interactivity

---

## Extension Points

### Adding New Control Types

1. Create control class extending BaseControl
2. Register with ControlRegistry
3. Add to config
4. Manager automatically creates it

```javascript
class CustomControl extends BaseControl {
  // Implementation
}

ControlRegistry.register('custom', CustomControl);
```

### Adding New Tabs

Add to config:

```javascript
{
  id: 'new-tab',
  title: 'New Tab',
  icon: '✨',
  controls: [
    // Control configs
  ]
}
```

Manager automatically creates the tab and panel.

### Custom State Properties

Add to initial state in constructor:

```javascript
this.state = {
  // Existing properties
  isPlaying: false,
  elapsedTime: 0,
  // ... etc

  // Add custom properties
  customProperty: 'value'
};
```

Access via `getState()` and `setState()`.

---

## Best Practices

1. **Always use getState()/setState()** instead of direct property access
2. **Call manager.update()** in every animation frame
3. **Bind canvas handlers** for click and hover
4. **Check isDestroyed()** before using manager after potential cleanup
5. **Use control IDs** that are descriptive and unique
6. **Keep handlers in config** instead of creating them elsewhere
7. **Let controls manage their own DOM** - don't manipulate control elements directly
8. **Use transform functions** to convert slider values to physical units
9. **Use format functions** to control display formatting
10. **Test with the interactive test** before integrating

---

## Summary

The ControlsManager provides a complete, declarative control system for the quantum playground:

- **Easy to configure** - Edit defaultConfig.js to change controls
- **Modular architecture** - Tab → Panel → Control hierarchy
- **Clean integration** - Simple API for simulation and visualizer
- **State management** - Centralized state with getState/setState
- **Extensible** - Easy to add new controls and tabs
- **Maintainable** - Small, focused classes with clear responsibilities

Total implementation: ~700 lines of clean, well-documented code.

**Next Steps:**
- Run test-controls-manager.html to verify functionality
- Integrate with main.js to replace old Controller
- Customize defaultConfig.js for your needs
- Add custom controls as needed
