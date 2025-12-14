# Controls System Refactor - Implementation Plan

## Executive Summary

This document outlines a comprehensive refactoring of the quantum playground's control system from a monolithic, tightly-coupled architecture to a modular, tab-based system that supports easy extension and maintenance.

**Current State:**
- Two separate control panels (left: Initial Conditions, right: Simulation Controls)
- 919-line monolithic Controller class with 15+ hardcoded UI elements
- Controls scattered across multiple HTML sections

**Target State:**
- **Single unified control panel with tabs** to switch between different control groups
- Modular, declarative control system with plugin-like extensibility
- Easy addition of new tabs and controls through configuration

---

## Table of Contents

1. [Problem Analysis](#problem-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Component Design](#component-design)
4. [Implementation Phases](#implementation-phases)
5. [Migration Strategy](#migration-strategy)
6. [Testing Strategy](#testing-strategy)
7. [Benefits](#benefits)

---

## UI Transformation Goal

### Current Layout

```
┌─────────────────┬─────────────────────────┬─────────────────┐
│  Left Panel:    │                         │  Right Panel:   │
│  Initial        │    Canvas (center)      │  Simulation     │
│  Conditions     │                         │  Controls       │
│                 │                         │                 │
│  - Position     │                         │  - Play/Pause   │
│  - Momentum     │                         │  - Speed        │
│  - Packet Size  │                         │  - Measurement  │
│  - Reset        │                         │  - Potential    │
│                 │                         │  - Viz Mode     │
└─────────────────┴─────────────────────────┴─────────────────┘
```

### Target Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────┬─────────┬─────────┬─────────┐                 │
│  │ Initial │Simulate │ Measure │ Stats   │  (Tab Bar)       │
│  └─────────┴─────────┴─────────┴─────────┘                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Active Tab Content:                               │    │
│  │                                                     │    │
│  │  [Controls for selected tab rendered here]         │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│                   Canvas (below or beside)                  │
└─────────────────────────────────────────────────────────────┘
```

**Key Changes:**
1. **Merge two panels** → Single unified control container
2. **Add tab navigation** → Switch between control groups
3. **Consolidate controls** → Related controls grouped by function
4. **Flexible positioning** → Can be positioned above, beside, or overlaying canvas

### Design Options

**Option A: Side Panel with Tabs** (Recommended)
- Single panel on the left or right
- Tab bar at top of panel
- Canvas takes remaining space
- Compact, familiar layout

**Option B: Top Bar with Tabs**
- Control panel spans full width at top
- Horizontal tab bar
- Canvas below
- Good for mobile

**Option C: Floating Panel**
- Draggable, resizable panel
- Can overlay or dock
- Most flexible
- More complex implementation

**Recommendation**: Start with Option A (side panel), with CSS to switch to Option B on mobile.

### Tab Organization

The controls will be organized into the following tabs:

**Tab 1: Initial Conditions** 🎯
- Position selector (canvas)
- Momentum selector (canvas)
- Packet size slider
- Reset button

**Tab 2: Simulation** ▶️
- Play/Pause button
- Speed slider
- Measurement radius slider
- Potential type (radio buttons)
- Potential strength slider
- Visualization mode (select)

**Tab 3: Statistics** 📊
- Total probability (display)
- Time elapsed (display)
- Grid size (display)
- Measurement count (display)

**Tab 4: Advanced** ⚙️ (Future enhancement)
- Grid size selector
- Time step control
- Boundary conditions
- Export/import settings
- Keyboard shortcuts reference

### Visual Mockup

```
┌─────────────────────────────────────────────────────────┐
│  Quantum Particle Playground                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐  ┌───────────────────────┐  │
│  │ ┏━━━━┓┌─────┬─────┐  │  │                       │  │
│  │ ┃Init┃│Sim  │Stats│  │  │                       │  │
│  │ ┗━━━━┛└─────┴─────┘  │  │                       │  │
│  │                       │  │       Canvas          │  │
│  │  Position             │  │                       │  │
│  │  ┌─────────┐          │  │                       │  │
│  │  │ • (x,y) │          │  │                       │  │
│  │  └─────────┘          │  │                       │  │
│  │                       │  │                       │  │
│  │  Momentum             │  │                       │  │
│  │  ┌─────────┐          │  │                       │  │
│  │  │  → px   │          │  │                       │  │
│  │  └─────────┘          │  │                       │  │
│  │                       │  │                       │  │
│  │  Packet Size: 2.6    │  │                       │  │
│  │  ━━━━━━━━━━━━━━━     │  │                       │  │
│  │                       │  │                       │  │
│  │  ┌──────────────┐    │  │                       │  │
│  │  │ Reset  ↻     │    │  │                       │  │
│  │  └──────────────┘    │  │                       │  │
│  └──────────────────────┘  └───────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

Note: Active tab shown with solid border/highlight. Canvas and control panel can be arranged side-by-side (desktop) or stacked (mobile).

---

## Problem Analysis

### Current Architecture Issues

1. **Tight Coupling**
   - Controller knows about every single UI element by name
   - main.js must manually query 15+ DOM elements
   - Adding controls requires changes in 3+ files

2. **No Modularity**
   - All control logic in one 919-line class
   - Cannot reuse control types
   - Hard to test individual controls

3. **No Extensibility**
   - No support for tabs or control grouping
   - Cannot easily add new control types
   - No plugin architecture

4. **Poor Maintainability**
   - Event handlers scattered throughout class
   - Complex initialization with many dependencies
   - Difficult to understand control relationships

5. **HTML Coupling**
   - HTML structure must match exact IDs expected by Controller
   - No validation that required elements exist
   - Cannot generate UI from configuration

### Current File Structure

```
js/controls.js (919 lines)
├── Constructor (63 lines of state + 17 bound methods)
├── setupEventListeners() - hardcoded for each control
├── 17 individual event handlers
├── Canvas interaction methods
├── Measurement display methods
├── Selector canvas drawing methods
└── Update/UI methods
```

---

## Architecture Overview

### Design Principles

1. **Separation of Concerns**: Each control manages its own UI, state, and behavior
2. **Composition over Inheritance**: Build complex UIs from simple, reusable components
3. **Declarative Configuration**: Define controls via configuration objects
4. **Event-Driven**: Controls communicate via events, not direct coupling
5. **Progressive Enhancement**: Support runtime addition of controls and tabs

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ControlsManager                          │
│  - Coordinates all control panels and tabs                  │
│  - Manages simulation/visualizer references                 │
│  - Handles global state (playing, time, etc.)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ contains
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      TabManager                             │
│  - Manages multiple control panels as tabs                  │
│  - Handles tab switching and visibility                     │
│  - Optional: can be disabled for single-panel layout        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ contains
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    ControlPanel                             │
│  - Container for a group of related controls                │
│  - Handles layout and control lifecycle                     │
│  - Can be a tab or standalone panel                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ contains
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Individual Controls                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ SliderControl│ │ButtonControl │ │ RadioControl │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │CanvasControl │ │SelectControl │ │ DisplayControl│       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. BaseControl (Abstract)

**Purpose**: Foundation for all control types

**Responsibilities**:
- Lifecycle management (init, update, destroy)
- Event emission and handling
- State management
- DOM element management

**Interface**:
```javascript
class BaseControl {
  constructor(config) {
    this.id = config.id;
    this.label = config.label;
    this.container = null;
    this.enabled = true;
    this.visible = true;
    this.eventListeners = new Map();
  }

  // Abstract methods (must be implemented by subclasses)
  render() { throw new Error('Must implement render()'); }
  getValue() { throw new Error('Must implement getValue()'); }
  setValue(value) { throw new Error('Must implement setValue()'); }

  // Common methods
  emit(eventName, data) { /* Dispatch custom event */ }
  on(eventName, handler) { /* Subscribe to event */ }
  off(eventName, handler) { /* Unsubscribe */ }
  enable() { /* Enable control */ }
  disable() { /* Disable control */ }
  show() { /* Show control */ }
  hide() { /* Hide control */ }
  update() { /* Update display from state */ }
  destroy() { /* Cleanup and remove */ }
}
```

**Configuration Schema**:
```javascript
{
  id: string,              // Unique identifier
  label: string,           // Display label
  defaultValue: any,       // Initial value
  enabled: boolean,        // Initial enabled state
  visible: boolean,        // Initial visibility
  onChange: function,      // Change handler
  className: string,       // Additional CSS classes
  tooltip: string,         // Tooltip text
  attributes: object       // Additional HTML attributes
}
```

---

### 2. Concrete Control Types

#### SliderControl

**Purpose**: Numeric input with range slider

**Additional Config**:
```javascript
{
  min: number,             // Minimum value
  max: number,             // Maximum value
  step: number,            // Step size
  value: number,           // Current value
  unit: string,            // Display unit (e.g., "x", "%")
  format: function,        // Value formatting function
  transform: function,     // Value transformation (e.g., log scale)
  showValue: boolean,      // Show value display
  showLabels: boolean      // Show min/max labels
}
```

**Example Usage**:
```javascript
new SliderControl({
  id: 'speed-slider',
  label: 'Speed',
  min: -10,
  max: 10,
  value: 0,
  step: 1,
  unit: 'x',
  format: (val) => val.toFixed(2),
  transform: (val) => Math.pow(10, val / 10 - 1),
  onChange: (value) => simulation.setTimeScale(value)
});
```

---

#### ButtonControl

**Purpose**: Clickable action button

**Additional Config**:
```javascript
{
  text: string,            // Button text
  icon: string,            // Icon (emoji or class)
  variant: string,         // Style variant (primary, secondary)
  fullWidth: boolean,      // Full width button
  onClick: function        // Click handler
}
```

**Example Usage**:
```javascript
new ButtonControl({
  id: 'play-pause-btn',
  text: 'Play',
  icon: '▶',
  variant: 'primary',
  fullWidth: true,
  onClick: (btn) => {
    const isPlaying = controller.togglePlayPause();
    btn.text = isPlaying ? 'Pause' : 'Play';
    btn.icon = isPlaying ? '⏸' : '▶';
    btn.update();
  }
});
```

---

#### RadioControl

**Purpose**: Multiple choice selection (radio buttons)

**Additional Config**:
```javascript
{
  options: Array<{
    value: any,            // Option value
    label: string,         // Display label
    tooltip: string        // Optional tooltip
  }>,
  value: any,              // Currently selected value
  layout: string           // 'horizontal' or 'vertical'
}
```

**Example Usage**:
```javascript
new RadioControl({
  id: 'potential-type',
  label: 'Potential Type',
  options: [
    { value: 'none', label: 'None' },
    { value: 'single', label: 'Single' },
    { value: 'double', label: 'Double' },
    { value: 'sinusoid', label: 'Sin' }
  ],
  value: 'single',
  layout: 'horizontal',
  onChange: (value) => simulation.setPotentialType(value)
});
```

---

#### SelectControl

**Purpose**: Dropdown selection

**Additional Config**:
```javascript
{
  options: Array<{
    value: any,
    label: string,
    disabled: boolean
  }>,
  value: any,              // Currently selected value
  placeholder: string      // Placeholder text
}
```

---

#### CanvasControl

**Purpose**: Interactive canvas selector

**Additional Config**:
```javascript
{
  width: number,           // Canvas width
  height: number,          // Canvas height
  drawFunction: function,  // Custom draw function
  onSelect: function       // Selection handler
}
```

**Example Usage**:
```javascript
new CanvasControl({
  id: 'position-selector',
  label: 'Position',
  width: 100,
  height: 100,
  drawFunction: (ctx, state) => {
    // Draw grid and selection indicator
    drawGrid(ctx);
    drawPosition(ctx, state.x, state.y);
  },
  onSelect: (x, y) => {
    controller.setInitialPosition(x, y);
  }
});
```

---

#### DisplayControl

**Purpose**: Read-only display of values

**Additional Config**:
```javascript
{
  value: any,              // Display value
  format: function,        // Formatting function
  updateInterval: number,  // Auto-update interval (ms)
  className: string        // Additional CSS classes
}
```

---

### 3. ControlPanel

**Purpose**: Container and layout manager for related controls

**Responsibilities**:
- Group controls logically
- Manage control lifecycle
- Handle layout and styling
- Provide context to child controls

**Interface**:
```javascript
class ControlPanel {
  constructor(config) {
    this.id = config.id;
    this.title = config.title;
    this.controls = [];
    this.container = null;
    this.collapsed = false;
  }

  addControl(control) { /* Add control to panel */ }
  removeControl(controlId) { /* Remove control */ }
  getControl(controlId) { /* Get control by ID */ }
  render(parentElement) { /* Render panel and controls */ }
  collapse() { /* Collapse panel */ }
  expand() { /* Expand panel */ }
  destroy() { /* Cleanup */ }
}
```

**Configuration Schema**:
```javascript
{
  id: string,              // Panel identifier
  title: string,           // Panel title
  icon: string,            // Optional icon
  collapsible: boolean,    // Can be collapsed
  collapsed: boolean,      // Initially collapsed
  controls: Array<Control> // Array of control configs
}
```

---

### 4. TabManager

**Purpose**: Manage multiple control panels as tabs

**Responsibilities**:
- Tab switching and navigation
- Panel visibility management
- Tab lifecycle
- Keyboard navigation support

**Interface**:
```javascript
class TabManager {
  constructor(config) {
    this.panels = new Map();
    this.activePanel = null;
    this.container = null;
    this.tabBar = null;
  }

  addPanel(panel) { /* Add panel as tab */ }
  removePanel(panelId) { /* Remove panel */ }
  switchToPanel(panelId) { /* Activate panel */ }
  getPanel(panelId) { /* Get panel by ID */ }
  render(parentElement) { /* Render tabs and panels */ }
  destroy() { /* Cleanup */ }
}
```

**Configuration Schema**:
```javascript
{
  panels: Array<ControlPanel>,
  defaultPanel: string,    // Initially active panel ID
  tabPosition: string,     // 'top', 'bottom', 'left', 'right'
  animated: boolean,       // Animate transitions
  persistent: boolean      // Remember last active tab
}
```

---

### 5. ControlsManager

**Purpose**: Top-level coordinator replacing current Controller

**Responsibilities**:
- Initialize control system from config
- Bridge between controls and simulation/visualizer
- Manage global state (playing, time, etc.)
- Handle canvas interactions (click, hover)
- Coordinate measurements and visualization updates

**Interface**:
```javascript
class ControlsManager {
  constructor(simulation, visualizer, config) {
    this.simulation = simulation;
    this.visualizer = visualizer;
    this.config = config;
    this.panels = new Map();
    this.tabManager = null;
    this.state = {
      isPlaying: false,
      elapsedTime: 0,
      measurementInProgress: false
    };
  }

  // Initialization
  initialize() { /* Setup control system from config */ }
  createFromConfig(panelConfigs) { /* Build panels from config */ }

  // State management
  getState() { /* Get current state */ }
  setState(updates) { /* Update state */ }
  togglePlayPause() { /* Toggle play/pause */ }
  reset() { /* Reset simulation */ }

  // Canvas interaction (delegated from controls)
  handleCanvasClick(x, y) { /* Perform measurement */ }
  handleCanvasHover(x, y) { /* Update hover display */ }

  // Update loop
  update(deltaTime) { /* Called each frame */ }

  // Cleanup
  destroy() { /* Remove all controls and listeners */ }
}
```

---

### 6. ControlRegistry

**Purpose**: Central registry for control types and factories

**Responsibilities**:
- Register control types
- Create controls from configuration
- Validate control configurations
- Provide control type metadata

**Interface**:
```javascript
class ControlRegistry {
  static register(type, controlClass) { /* Register type */ }
  static create(config) { /* Create control from config */ }
  static has(type) { /* Check if type exists */ }
  static getTypes() { /* Get all registered types */ }
}

// Usage
ControlRegistry.register('slider', SliderControl);
ControlRegistry.register('button', ButtonControl);
ControlRegistry.register('radio', RadioControl);

// Create from config
const control = ControlRegistry.create({
  type: 'slider',
  id: 'speed-slider',
  label: 'Speed',
  min: -10,
  max: 10
});
```

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

**Objective**: Build base classes and registry system

**Tasks**:
1. Create `js/controls/` directory structure
2. Implement `BaseControl` abstract class
3. Implement `ControlRegistry` singleton
4. Write unit tests for base functionality
5. Create example control (SliderControl)

**Files Created**:
```
js/controls/
├── BaseControl.js          (150 lines)
├── ControlRegistry.js      (100 lines)
└── README.md              (Documentation)
```

**Success Criteria**:
- BaseControl provides complete lifecycle
- Registry can register and create controls
- Example SliderControl works standalone
- Tests pass for core functionality

**Estimated Effort**: 6-8 hours

---

### Phase 2: Concrete Controls (Implementation)

**Objective**: Implement all concrete control types

**Tasks**:
1. Implement SliderControl (with log scale support)
2. Implement ButtonControl
3. Implement RadioControl
4. Implement SelectControl
5. Implement CanvasControl
6. Implement DisplayControl
7. Write tests for each control type
8. Create control showcase/demo

**Files Created**:
```
js/controls/
├── types/
│   ├── SliderControl.js    (200 lines)
│   ├── ButtonControl.js    (120 lines)
│   ├── RadioControl.js     (150 lines)
│   ├── SelectControl.js    (130 lines)
│   ├── CanvasControl.js    (180 lines)
│   └── DisplayControl.js   (100 lines)
└── controls.css            (Styling)
```

**Success Criteria**:
- All control types render correctly
- Events fire and handlers work
- Controls update from setValue()
- Accessibility attributes present
- Tests pass for all types

**Estimated Effort**: 12-16 hours

---

### Phase 3: Containers (Panels and Tabs)

**Objective**: Build panel and tab management

**Tasks**:
1. Implement ControlPanel
2. Implement TabManager
3. Add panel collapse/expand
4. Add keyboard navigation
5. Style tabs and panels
6. Write integration tests

**Files Created**:
```
js/controls/
├── ControlPanel.js         (250 lines)
├── TabManager.js          (300 lines)
└── panels.css             (Styling)
```

**Success Criteria**:
- Panels group controls correctly
- Tabs switch without issues
- Keyboard navigation works
- Responsive on mobile
- Tests pass for containers

**Estimated Effort**: 10-12 hours

---

### Phase 4: Manager Integration

**Objective**: Create ControlsManager to replace Controller

**Tasks**:
1. Implement ControlsManager
2. Create default configuration for quantum playground
3. Bridge to simulation and visualizer
4. Port canvas interaction logic
5. Port measurement logic
6. Port state management
7. Write integration tests

**Files Created**:
```
js/controls/
├── ControlsManager.js      (400 lines)
├── defaultConfig.js        (200 lines - config)
└── integration-tests.js    (Testing)
```

**Success Criteria**:
- ControlsManager replaces Controller functionality
- All controls work with simulation
- Canvas interactions work
- State updates correctly
- No regressions in behavior

**Estimated Effort**: 14-18 hours

---

### Phase 5: Migration

**Objective**: Replace old Controller with new system and unify control panels

**Tasks**:
1. **Restructure HTML** - Combine two panels into one with tab container
2. Update main.js to use ControlsManager
3. Update CSS for new tabbed layout
4. Remove old Controller class
5. Update responsive styles for mobile
6. Update documentation
7. Perform thorough testing

**HTML Restructuring**:

Before (two separate panels):
```html
<div class="simulation-wrapper">
  <div class="left-panel controls-panel">
    <!-- Initial Conditions -->
  </div>
  <div class="simulation-container">
    <canvas id="quantum-canvas"></canvas>
  </div>
  <div class="right-panel controls-panel">
    <!-- Simulation Controls -->
  </div>
</div>
```

After (single tabbed panel):
```html
<div class="simulation-wrapper">
  <!-- Single unified control panel with tabs -->
  <div id="controls-container" class="controls-panel tabbed">
    <!-- Tab bar will be generated by TabManager -->
    <div class="tab-bar"></div>
    <div class="tab-content"></div>
  </div>

  <!-- Canvas takes remaining space -->
  <div class="simulation-container">
    <canvas id="quantum-canvas"></canvas>
  </div>
</div>
```

**CSS Restructuring**:
- Remove `.left-panel` and `.right-panel` styles
- Add `.controls-panel.tabbed` styles
- Add `.tab-bar` and `.tab-content` styles
- Update responsive breakpoints for single panel
- Add tab transition animations

**Files Modified**:
```
js/main.js                  (Simplified initialization ~250 lines)
index.html                  (Restructured - single panel with tab container)
styles.css                  (Updated for tabbed layout)
js/controls.js              (DELETED - 919 lines removed!)
```

**Success Criteria**:
- **Two panels merged into one** with functional tabs
- Application works identically to before
- Initialization simpler in main.js (no manual element gathering)
- Old Controller completely removed
- Tab switching works smoothly
- All features work
- Mobile responsive
- No console errors
- All tests pass

**Estimated Effort**: 10-12 hours (increased for HTML/CSS restructuring)

---

### Phase 6: Enhancement

**Objective**: Add new features enabled by architecture

**Tasks**:
1. Add "Advanced" tab with additional controls
2. Add presets system (save/load configurations)
3. Add control search/filter
4. Add tooltips for all controls
5. Add keyboard shortcuts display
6. Improve mobile experience
7. Add control groups within panels

**Files Created/Modified**:
```
js/controls/
├── Presets.js              (Preset management)
├── ControlGroup.js         (Sub-grouping)
└── advanced-config.js      (Advanced controls)
```

**Success Criteria**:
- New tab with advanced controls
- Presets save/load correctly
- Search finds controls
- Tooltips informative
- Better mobile UX

**Estimated Effort**: 12-16 hours

---

## Configuration Schema

### Full Example Configuration

```javascript
const controlsConfig = {
  // Global settings
  settings: {
    theme: 'light',
    persistState: true,
    keyboardShortcuts: true
  },

  // Tab-based panels
  tabs: [
    {
      id: 'initial-conditions',
      title: 'Initial Conditions',
      icon: '⚙️',
      controls: [
        {
          type: 'canvas',
          id: 'position-selector',
          label: 'Position',
          width: 100,
          height: 100,
          drawFunction: 'drawPositionSelector',
          onSelect: (x, y) => {
            state.initialPosition = { x, y };
          }
        },
        {
          type: 'canvas',
          id: 'momentum-selector',
          label: 'Momentum',
          width: 100,
          height: 100,
          drawFunction: 'drawMomentumSelector',
          onSelect: (x, y) => {
            state.initialMomentum = { x, y };
          }
        },
        {
          type: 'slider',
          id: 'packet-size',
          label: 'Packet Size',
          min: 20,
          max: 400,
          value: 256,
          step: 1,
          transform: (val) => val / 100,
          format: (val) => val.toFixed(1),
          onChange: (val) => {
            state.packetSize = val;
          }
        },
        {
          type: 'button',
          id: 'reset',
          text: 'Reset',
          icon: '↻',
          variant: 'secondary',
          fullWidth: true,
          onClick: () => {
            simulation.reset(state.initialPosition, state.initialMomentum);
          }
        }
      ]
    },

    {
      id: 'simulation',
      title: 'Simulation',
      icon: '▶️',
      controls: [
        {
          type: 'button',
          id: 'play-pause',
          text: 'Play',
          icon: '▶',
          variant: 'primary',
          fullWidth: true,
          onClick: (btn, manager) => {
            const isPlaying = manager.togglePlayPause();
            btn.setValue({
              text: isPlaying ? 'Pause' : 'Play',
              icon: isPlaying ? '⏸' : '▶'
            });
          }
        },
        {
          type: 'slider',
          id: 'speed',
          label: 'Speed',
          min: -10,
          max: 10,
          value: 0,
          step: 1,
          unit: 'x',
          transform: (val) => Math.pow(10, val / 10 - 1),
          format: (val) => val.toFixed(2),
          showLabels: true,
          labels: { min: '0.01x', max: '1.0x' },
          onChange: (val) => {
            simulation.setTimeScale(val);
          }
        },
        {
          type: 'slider',
          id: 'measurement-radius',
          label: 'Measurement Size',
          min: 0,
          max: 200,
          value: 100,
          step: 1,
          transform: (val) => Math.pow(10, val / 100),
          format: (val) => val.toFixed(1),
          showLabels: true,
          labels: { min: '1', max: '100' },
          onChange: (val) => {
            simulation.setMeasurementRadius(val);
          }
        },
        {
          type: 'radio',
          id: 'potential-type',
          label: 'Potential Type',
          options: [
            { value: 'none', label: 'None' },
            { value: 'single', label: 'Single' },
            { value: 'double', label: 'Double' },
            { value: 'sinusoid', label: 'Sin' }
          ],
          value: 'single',
          layout: 'horizontal',
          onChange: (val) => {
            simulation.setPotentialType(val);
          }
        },
        {
          type: 'slider',
          id: 'potential-strength',
          label: 'Potential Strength',
          min: -10,
          max: 10,
          value: 0,
          step: 1,
          transform: (val) => Math.pow(10, val / 10),
          format: (val) => val.toFixed(1),
          showLabels: true,
          labels: { min: '0.1', max: '10' },
          onChange: (val) => {
            simulation.setPotentialStrengthScale(val);
          }
        },
        {
          type: 'select',
          id: 'viz-mode',
          label: 'Visualization',
          options: [
            { value: 'complex', label: 'Complex (Phase + Amplitude)' },
            { value: 'probability', label: 'Probability Density Only' }
          ],
          value: 'probability',
          onChange: (val) => {
            const internalMode = val === 'complex' ? 'full' : val;
            visualizer.setVisualizationMode(internalMode);
          }
        }
      ]
    },

    {
      id: 'statistics',
      title: 'Statistics',
      icon: '📊',
      controls: [
        {
          type: 'display',
          id: 'total-probability',
          label: 'Total Probability',
          format: (val) => `${(val * 100).toFixed(4)}%`,
          updateInterval: 100,
          className: 'stat-display'
        },
        {
          type: 'display',
          id: 'time-elapsed',
          label: 'Time Elapsed',
          format: (val) => `${(val / 1000).toFixed(2)}s`,
          updateInterval: 100,
          className: 'stat-display'
        },
        {
          type: 'display',
          id: 'grid-size',
          label: 'Grid Size',
          format: (val) => `${val}×${val}`,
          className: 'stat-display'
        },
        {
          type: 'display',
          id: 'measurement-count',
          label: 'Measurements',
          format: (val) => val.toString(),
          className: 'stat-display'
        }
      ]
    }
  ],

  // Default active tab
  defaultTab: 'simulation'
};
```

---

## Migration Strategy

### Step-by-Step Migration

#### Step 1: Parallel Implementation

- Keep old Controller.js intact
- Build new system alongside
- No changes to main.js yet
- Test new system independently

#### Step 2: Feature Parity

- Ensure new system has all features
- Add missing functionality
- Test thoroughly
- Document differences

#### Step 3: Gradual Switchover

Option A: **Big Bang** (recommended for this size)
- Switch main.js to use ControlsManager
- Remove old Controller
- Fix any issues
- Single PR

Option B: **Gradual Migration**
- Wrap old Controller in new interface
- Migrate controls one by one
- Keep both systems temporarily
- Multiple PRs

#### Step 4: Cleanup

- Delete old Controller.js
- Update documentation
- Remove unused HTML elements
- Simplify CSS

---

### Backward Compatibility

#### HTML Structure

**Option 1: Keep existing HTML IDs**
- New system queries same IDs
- Minimal HTML changes
- Easy migration

**Option 2: Generate from config**
- Remove hardcoded HTML
- Generate controls dynamically
- More flexible, more work

**Recommendation**: Option 1 for initial migration, then Option 2 as enhancement

---

## Testing Strategy

### Unit Tests

Each component should have tests:

```javascript
// Example: SliderControl.test.js
describe('SliderControl', () => {
  it('should create slider with correct attributes', () => {
    const slider = new SliderControl({
      id: 'test-slider',
      min: 0,
      max: 100,
      value: 50
    });
    slider.render(container);

    const input = container.querySelector('input[type="range"]');
    expect(input.min).toBe('0');
    expect(input.max).toBe('100');
    expect(input.value).toBe('50');
  });

  it('should emit change event with transformed value', () => {
    const slider = new SliderControl({
      id: 'test-slider',
      min: 0,
      max: 10,
      value: 5,
      transform: (val) => val * 2
    });

    let emittedValue = null;
    slider.on('change', (val) => { emittedValue = val; });
    slider.setValue(8);

    expect(emittedValue).toBe(16); // 8 * 2
  });

  it('should update display when value changes', () => {
    const slider = new SliderControl({
      id: 'test-slider',
      min: 0,
      max: 100,
      value: 50,
      showValue: true,
      format: (val) => `${val}%`
    });
    slider.render(container);

    slider.setValue(75);

    const display = container.querySelector('.value-display');
    expect(display.textContent).toBe('75%');
  });
});
```

### Integration Tests

Test control panels and manager:

```javascript
describe('ControlPanel', () => {
  it('should render all child controls', () => {
    const panel = new ControlPanel({
      id: 'test-panel',
      title: 'Test Panel',
      controls: [
        { type: 'slider', id: 'slider-1' },
        { type: 'button', id: 'button-1' }
      ]
    });

    panel.render(container);

    expect(panel.controls.length).toBe(2);
    expect(container.querySelector('#slider-1')).toBeTruthy();
    expect(container.querySelector('#button-1')).toBeTruthy();
  });
});

describe('ControlsManager', () => {
  it('should initialize from configuration', () => {
    const manager = new ControlsManager(simulation, visualizer, config);
    manager.initialize();

    expect(manager.panels.size).toBe(3);
    expect(manager.getPanel('initial-conditions')).toBeTruthy();
  });

  it('should handle play/pause toggle', () => {
    const manager = new ControlsManager(simulation, visualizer, config);
    manager.initialize();

    const initialState = manager.state.isPlaying;
    manager.togglePlayPause();

    expect(manager.state.isPlaying).toBe(!initialState);
  });
});
```

### End-to-End Tests

Test full user workflows:

```javascript
describe('User Workflows', () => {
  it('should adjust speed slider and update simulation', () => {
    // Initialize app
    const app = new QuantumPlaygroundApp();
    app.init();

    // Find speed slider
    const speedControl = app.controls.getControl('speed');

    // Change value
    speedControl.setValue(5);

    // Verify simulation updated
    expect(app.simulation.timeScale).toBeCloseTo(0.316); // 10^(5/10 - 1)
  });

  it('should perform measurement on canvas click', () => {
    const app = new QuantumPlaygroundApp();
    app.init();

    // Simulate click
    const canvas = document.getElementById('quantum-canvas');
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100
    });
    canvas.dispatchEvent(event);

    // Verify measurement occurred
    expect(app.controls.state.measurementInProgress).toBe(false);
    // Check measurement result displayed
  });
});
```

---

## Benefits

### For Developers

1. **Easier to Add Controls**
   - Define in configuration
   - No need to modify multiple files
   - Reuse existing control types

2. **Better Code Organization**
   - 919 lines → ~150 lines per component
   - Clear separation of concerns
   - Easy to find and modify

3. **Improved Testability**
   - Unit test individual controls
   - Mock dependencies easily
   - Integration tests clearer

4. **Enhanced Maintainability**
   - Less coupling
   - Clear interfaces
   - Easier debugging

### For Users

1. **Unified Interface**
   - **Single control panel instead of two** - less visual clutter
   - All controls in one location
   - More canvas space for visualization
   - Cleaner, more focused layout

2. **Better Organization**
   - Controls grouped logically in tabs
   - Switch between control categories easily
   - Related controls stay together
   - Easier to find what you need

3. **Improved Workflow**
   - Tab-based navigation is familiar (like browser tabs)
   - Keyboard shortcuts for tab switching
   - State preserved when switching tabs
   - Smooth transitions

4. **Extensibility**
   - Easy to add new features as new tabs
   - Custom control types possible
   - Plugin-like architecture
   - Future-proof design

5. **Consistency**
   - All controls follow same patterns
   - Predictable behavior
   - Better accessibility
   - Professional appearance

---

## File Structure (Post-Refactor)

```
quantum-play/
├── js/
│   ├── main.js                    (Simplified - ~250 lines)
│   ├── quantum.js                 (Unchanged)
│   ├── visualization/             (Unchanged)
│   ├── utils.js                   (Unchanged)
│   │
│   └── controls/                  (NEW)
│       ├── README.md              (Documentation)
│       ├── BaseControl.js         (150 lines)
│       ├── ControlRegistry.js     (100 lines)
│       ├── ControlPanel.js        (250 lines)
│       ├── TabManager.js          (300 lines)
│       ├── ControlsManager.js     (400 lines)
│       ├── defaultConfig.js       (200 lines)
│       │
│       ├── types/                 (Control implementations)
│       │   ├── SliderControl.js   (200 lines)
│       │   ├── ButtonControl.js   (120 lines)
│       │   ├── RadioControl.js    (150 lines)
│       │   ├── SelectControl.js   (130 lines)
│       │   ├── CanvasControl.js   (180 lines)
│       │   └── DisplayControl.js  (100 lines)
│       │
│       └── styles/                (Control styling)
│           ├── controls.css       (Base styles)
│           ├── panels.css         (Panel styles)
│           └── tabs.css           (Tab styles)
│
├── index.html                     (Potentially simplified)
├── styles.css                     (Updated for new controls)
│
└── tests/
    └── controls/                  (NEW)
        ├── BaseControl.test.js
        ├── SliderControl.test.js
        ├── ControlPanel.test.js
        └── integration.test.js
```

**Total Lines**: ~2,280 (organized into 14 focused files vs 1 monolithic 919-line file)

---

## Implementation Timeline

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| Phase 1 | Foundation | 6-8 hours | None |
| Phase 2 | Controls | 12-16 hours | Phase 1 |
| Phase 3 | Containers | 10-12 hours | Phase 2 |
| Phase 4 | Manager | 14-18 hours | Phase 3 |
| Phase 5 | Migration + Panel Unification | 10-12 hours | Phase 4 |
| Phase 6 | Enhancement | 12-16 hours | Phase 5 |
| **Total** | **Full Implementation** | **64-82 hours** | |

**Recommended Approach**: Implement in phases as separate PRs to allow for review and testing between phases.

---

## Success Metrics

### Code Quality

- ✅ Reduced coupling (measured by dependency graph)
- ✅ Improved testability (>80% test coverage)
- ✅ Better organization (smaller, focused files)
- ✅ Enhanced documentation (all components documented)

### Functionality

- ✅ Feature parity with old system
- ✅ No regressions in behavior
- ✅ New tab system works
- ✅ All controls functional

### User Experience

- ✅ Interface remains intuitive
- ✅ No increase in load time
- ✅ Mobile experience improved
- ✅ Accessibility maintained/improved

### Developer Experience

- ✅ Easier to add new controls
- ✅ Configuration-based setup
- ✅ Clear extension points
- ✅ Better debugging experience

---

## Risk Analysis

### Technical Risks

1. **Breaking Changes**
   - **Risk**: New system breaks existing functionality
   - **Mitigation**: Thorough testing, parallel implementation

2. **Performance**
   - **Risk**: More abstraction = slower performance
   - **Mitigation**: Benchmark critical paths, optimize hot loops

3. **Complexity**
   - **Risk**: Over-engineering the solution
   - **Mitigation**: Keep it simple, avoid premature optimization

### Project Risks

1. **Scope Creep**
   - **Risk**: Adding too many features during refactor
   - **Mitigation**: Focus on phase 1-5, save enhancements for phase 6

2. **Timeline**
   - **Risk**: Taking longer than estimated
   - **Mitigation**: Phase-based approach allows for adjustments

3. **Testing Burden**
   - **Risk**: Insufficient testing leads to bugs
   - **Mitigation**: Write tests alongside implementation

---

## Conclusion

This refactoring transforms the controls system from a monolithic, tightly-coupled architecture to a modular, extensible framework. The new design:

### Primary Goals

1. **Unify Control Panels**: Merge left and right panels into single tabbed interface
2. **Reduce Complexity**: 919-line monolith → 14 focused components
3. **Improve Maintainability**: Clear separation of concerns
4. **Enable Growth**: Easy to add tabs, controls, and features
5. **Enhance Testing**: Unit-testable components
6. **Better UX**: Organized tabs and consistent behavior

### Key Transformation

```
BEFORE: Left Panel + Canvas + Right Panel (cluttered, split controls)
AFTER:  Single Tabbed Panel + Canvas (clean, organized, unified)
```

The tabbed architecture provides:
- **Cleaner layout** - One control panel instead of two
- **More canvas space** - Controls don't flank the visualization
- **Better organization** - Related controls grouped in tabs
- **Easy extension** - New tabs add new control categories
- **Familiar pattern** - Tab navigation is intuitive

### Implementation Approach

The phased approach allows for incremental progress with validation at each step, minimizing risk while maximizing benefit. Each phase builds on the previous, culminating in a complete replacement of the current Controller with a modern, modular system.

**Critical Success Factor**: Phase 5 merges the two panels into one tabbed interface, achieving the primary UI goal while maintaining all functionality.

---

**Document Version**: 1.0
**Last Updated**: 2025-12-14
**Author**: AI Assistant (Claude)
**Status**: Ready for Implementation
**Primary Goal**: Merge two control panels into single tabbed interface
