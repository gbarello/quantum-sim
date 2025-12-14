# Default Controls Configuration Summary

## File: `defaultConfig.js`

**Purpose:** Declarative configuration that drives the entire quantum playground controls system.

## Key Statistics
- **Total Lines:** 462 lines
- **File Size:** 15 KB
- **Number of Tabs:** 3
- **Total Controls:** 14

## Configuration Structure

### Tab 1: Initial Conditions (4 controls)
1. **Position Selector** (canvas) - Click to set initial wavepacket position
2. **Momentum Selector** (canvas) - Click to set initial momentum
3. **Packet Size** (slider) - Range 0.2-4.0, default 2.56
4. **Reset** (button) - Reset simulation with current initial conditions

### Tab 2: Simulation (6 controls)
1. **Play/Pause** (button) - Toggle simulation running state
2. **Speed** (slider) - Range 0.01x-1.0x (log scale), default 0.1x
3. **Measurement Size** (slider) - Range 1-100 (log scale), default 10.0
4. **Potential Type** (radio) - Options: none, single, double, sinusoid (default: single)
5. **Potential Strength** (slider) - Range 0.1-10 (log scale), default 1.0
6. **Visualization** (select) - Options: complex, probability (default: probability)

### Tab 3: Statistics (4 controls)
1. **Total Probability** (display) - Shows ∫|ψ|² (should be ~100%)
2. **Time Elapsed** (display) - Shows simulation time in seconds
3. **Grid Size** (display) - Shows NxN grid dimensions
4. **Measurement Count** (display) - Shows number of measurements performed

## Key Features

### Transform Functions
All sliders use proper transformation functions to map UI values to physical quantities:
- **Speed:** Logarithmic scale `Math.pow(10, val/10 - 1)`
- **Measurement Radius:** Logarithmic scale `Math.pow(10, val/100)`
- **Potential Strength:** Logarithmic scale `Math.pow(10, val/10)`
- **Packet Size:** Linear scale `val / 100`

### Format Functions
All displays have proper formatting:
- **Probability:** `${(val * 100).toFixed(4)}%`
- **Time:** `${val.toFixed(2)}`
- **Grid Size:** `${val}×${val}`
- **Count:** `val.toString()`

### Handler Functions
All controls have proper onChange/onClick handlers that:
- Reference correct simulation/visualizer methods
- Update manager state appropriately
- Trigger necessary UI redraws

## Helper Functions

### `validateConfig(config)`
Validates configuration structure and returns:
```javascript
{ valid: boolean, errors: string[] }
```

### `getControlById(config, controlId)`
Retrieves a control by its ID from any tab.

### `getTabById(config, tabId)`
Retrieves a tab by its ID.

## Default Values Match Current Application
All default values in the configuration match the current application behavior:
- Initial position: (0.5, 0.5) - center
- Initial momentum: (0.6, 0.56) - physical momentum (1.0, 0.6)
- Packet size: 2.56
- Speed: 0.1x
- Measurement radius: 10.0
- Potential type: single
- Potential strength: 1.0
- Visualization: probability

## Validation Status
✓ Configuration validates successfully
✓ All 3 tabs defined correctly
✓ All 14 controls properly structured
✓ All transform functions working correctly
✓ All format functions producing correct output

## Next Steps
This configuration will be used by:
1. `ControlsManager.js` - Main manager that reads and applies this config
2. Control components (Button, Slider, Radio, etc.) - Individual widget implementations
3. Tab system - To organize controls into logical groups
