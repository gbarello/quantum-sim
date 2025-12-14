# ControlsManager - Quick Reference

## Setup (5 lines)

```javascript
import { ControlsManager } from './controls/ControlsManager.js';

const manager = new ControlsManager(simulation, visualizer);
manager.initialize(document.getElementById('controls-root'));
```

## Animation Loop (3 lines)

```javascript
if (manager.getState().isPlaying) simulation.step();
manager.update(deltaTime);
visualizer.render();
```

## Canvas Handlers (2 handlers)

```javascript
canvas.onclick = (e) => {
  const rect = canvas.getBoundingClientRect();
  manager.handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
};

canvas.onmousemove = (e) => {
  const rect = canvas.getBoundingClientRect();
  manager.handleCanvasHover(e.clientX - rect.left, e.clientY - rect.top);
};
```

## State Access

```javascript
// Read state
const state = manager.getState();
const isPlaying = state.isPlaying;
const time = state.elapsedTime;

// Update state
manager.setState({ measurementCount: 10 });

// Toggle play/pause
const playing = manager.togglePlayPause();
```

## Control Access

```javascript
// Get a control by ID
const speedSlider = manager.getControl('speed');
const value = speedSlider.getValue();

// Get a panel by ID
const simPanel = manager.getPanel('simulation');
const allControls = simPanel.getAllControls();
```

## Tab Management

```javascript
// Switch tab
manager.switchToTab('statistics');

// Get active tab
const activeTab = manager.getActiveTab();
```

## Key Methods

| Method | Purpose |
|--------|---------|
| `initialize(container)` | Setup and render controls |
| `update(deltaTime)` | Update display controls each frame |
| `getState()` | Get current state |
| `setState(updates)` | Update state |
| `togglePlayPause()` | Toggle play/pause |
| `handleReset()` | Reset simulation |
| `handleCanvasClick(x, y)` | Perform measurement |
| `handleCanvasHover(x, y)` | Update hover preview |
| `getControl(id)` | Find control by ID |
| `getPanel(id)` | Find panel by ID |
| `switchToTab(id)` | Switch active tab |
| `destroy()` | Cleanup resources |

## State Properties

| Property | Type | Description |
|----------|------|-------------|
| `isPlaying` | boolean | Simulation running |
| `elapsedTime` | number | Time elapsed (s) |
| `measurementInProgress` | boolean | Currently measuring |
| `measurementCount` | number | Total measurements |
| `initialPosition` | {x, y} | Start position (0-1) |
| `initialMomentum` | {x, y} | Start momentum (0-1) |
| `packetSize` | number | Wavepacket width |

## Config Structure

```javascript
{
  tabs: [
    {
      id: 'tab-id',
      title: 'Tab Title',
      icon: '⚙️',
      controls: [
        {
          type: 'slider',
          id: 'control-id',
          label: 'Label',
          min: 0,
          max: 100,
          value: 50,
          transform: (val) => val / 100,
          onChange: (val, manager) => {
            manager.simulation.setSomething(val);
          }
        }
      ]
    }
  ],
  defaultTab: 'simulation'
}
```

## Handler Signatures

```javascript
// onChange (for sliders, selects, radio, etc.)
onChange: (value, manager, control) => { }

// onClick (for buttons)
onClick: (manager, control) => { }

// onSelect (for canvas controls)
onSelect: (x, y, manager, control) => { }

// getValue (for display controls)
getValue: (manager) => manager.simulation.someValue
```

## Coordinate Conversions

```javascript
// Canvas to grid (handled internally)
const gridCoords = manager._canvasToGridCoords(canvasX, canvasY);
// Returns: { x: gridX, y: gridY } or null

// Normalized to grid (for initial conditions)
const gridX = Math.floor(normalizedX * simulation.gridSize);
const gridY = Math.floor(normalizedY * simulation.gridSize);

// Normalized to physical (for momentum)
const momentumX = (normalizedX - 0.5) * 10;  // Maps 0-1 to -5 to +5
const momentumY = (normalizedY - 0.5) * 10;
```

## Control Types Available

| Type | Class | Description |
|------|-------|-------------|
| `slider` | SliderControl | Numeric slider with transform |
| `button` | ButtonControl | Clickable button with icon |
| `radio` | RadioControl | Radio button group |
| `select` | SelectControl | Dropdown select |
| `canvas` | CanvasControl | Interactive canvas |
| `display` | DisplayControl | Read-only display |

## Test

```bash
# Open interactive test
open js/controls/test-controls-manager.html
```

## Architecture

```
ControlsManager
  ├── TabManager (tab switching)
  │   └── ControlPanel[] (grouped controls)
  │       └── BaseControl[] (individual controls)
  ├── State (app state)
  ├── Simulation (physics)
  └── Visualizer (rendering)
```

## Integration Example

```javascript
// main.js
import { QuantumSimulation } from './quantum.js';
import { Visualizer } from './visualization/VisualizerV2.js';
import { ControlsManager } from './controls/ControlsManager.js';

class QuantumPlaygroundApp {
  init() {
    // Setup canvas
    this.canvas = document.getElementById('quantum-canvas');

    // Create simulation
    this.simulation = new QuantumSimulation(128, 0.078125, 0.01);
    this.simulation.initialize();

    // Create visualizer
    this.visualizer = new Visualizer(this.canvas, this.simulation);

    // Create controls
    this.controls = new ControlsManager(this.simulation, this.visualizer);
    this.controls.initialize(document.getElementById('controls-root'));

    // Setup canvas handlers
    this.canvas.onclick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.controls.handleCanvasClick(e.clientX - rect.left, e.clientY - rect.top);
    };

    this.canvas.onmousemove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.controls.handleCanvasHover(e.clientX - rect.left, e.clientY - rect.top);
    };

    // Start animation
    this.mainLoop();
  }

  mainLoop(currentTime = 0) {
    const deltaTime = (currentTime - this.lastTime) / 1000 || 0;
    this.lastTime = currentTime;

    // Update simulation
    if (this.controls.getState().isPlaying) {
      for (let i = 0; i < 5; i++) {
        this.simulation.step();
      }
    }

    // Update controls
    this.controls.update(deltaTime);

    // Render
    this.visualizer.render();

    requestAnimationFrame((t) => this.mainLoop(t));
  }
}

// Initialize
const app = new QuantumPlaygroundApp();
app.init();
```

## Common Tasks

### Add New Tab
Edit `defaultConfig.js`, add tab object to `tabs` array.

### Add New Control
Add control config to tab's `controls` array.

### Change Control Behavior
Modify control's `onChange`, `onClick`, or `onSelect` handler in config.

### Access Simulation
Use `manager.simulation` in handler functions.

### Access Visualizer
Use `manager.visualizer` in handler functions.

### Programmatic Control
```javascript
manager.setState({ isPlaying: true });
manager.handleReset();
manager.switchToTab('statistics');
```

## Cleanup

```javascript
// When done
manager.destroy();
```

---

**Complete implementation:** ~700 lines
**Dependencies:** TabManager, ControlPanel, ControlRegistry, Control types
**Config:** defaultConfig.js (326 lines)
**Test:** test-controls-manager.html
