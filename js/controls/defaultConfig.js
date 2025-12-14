/**
 * defaultConfig.js - Default configuration for quantum playground controls
 *
 * This file contains the complete declarative configuration that drives the
 * controls system. It defines all tabs, control elements, their properties,
 * transformations, and handlers.
 *
 * The configuration follows a schema where each tab contains multiple controls,
 * and each control has properties like type, label, value ranges, transforms,
 * and onChange handlers.
 */

/**
 * Default configuration for the quantum playground controls
 * @type {Object}
 */
export const defaultControlsConfig = {
  // Global settings
  settings: {
    theme: 'light',
    persistState: true,
    keyboardShortcuts: true
  },

  // Tab-based panels
  tabs: [
    // =====================================================================
    // Tab 1: Initial Conditions
    // =====================================================================
    {
      id: 'initial-conditions',
      title: 'Initial Conditions',
      icon: '⚙️',
      controls: [
        // Position Selector Canvas
        {
          type: 'canvas',
          id: 'position-selector',
          label: 'Position',
          width: 100,
          height: 100,
          // Default position: center of domain (normalized 0-1)
          defaultValue: { x: 0.5, y: 0.5 },
          drawFunction: 'drawPositionSelector',
          onSelect: (x, y, manager) => {
            // x, y are normalized 0-1 values
            manager.state.initialPosition = { x, y };
            // Redraw the canvas to show the new selection
            manager.drawPositionSelector();
            manager.updatePositionDisplay();
          }
        },

        // Momentum Selector Canvas
        {
          type: 'canvas',
          id: 'momentum-selector',
          label: 'Momentum',
          width: 100,
          height: 100,
          // Default momentum: (1.0, 0.6) physical momentum
          // Normalized: 0.5 = zero momentum, so 0.6 = +1.0, 0.56 = +0.6
          defaultValue: { x: 0.6, y: 0.56 },
          drawFunction: 'drawMomentumSelector',
          onSelect: (x, y, manager) => {
            // x, y are normalized 0-1 values
            manager.state.initialMomentum = { x, y };
            // Redraw the canvas to show the new selection
            manager.drawMomentumSelector();
            manager.updateMomentumDisplay();
          }
        },

        // Packet Size Slider
        {
          type: 'slider',
          id: 'packet-size',
          label: 'Packet Size',
          min: 20,
          max: 400,
          value: 256,  // Default value (maps to 2.56 after transform)
          step: 1,
          unit: '',
          // Transform slider value (20-400) to packet size (0.2-4.0)
          transform: (val) => val / 100,
          // Format for display
          format: (val) => val.toFixed(1),
          showLabels: true,
          labels: { min: '0.2', max: '4.0' },
          onChange: (val, manager) => {
            manager.state.packetSize = val;
            manager.updatePacketSizeDisplay();
          }
        },

        // Reset Button
        {
          type: 'button',
          id: 'reset',
          text: 'Reset',
          icon: '↻',
          variant: 'secondary',
          fullWidth: true,
          onClick: (manager) => {
            manager.handleReset();
          }
        }
      ]
    },

    // =====================================================================
    // Tab 2: Simulation Controls
    // =====================================================================
    {
      id: 'simulation',
      title: 'Simulation',
      icon: '▶️',
      controls: [
        // Play/Pause Button
        {
          type: 'button',
          id: 'play-pause',
          text: 'Play',
          icon: '▶',
          variant: 'primary',
          fullWidth: true,
          onClick: (manager, btn) => {
            const isPlaying = manager.togglePlayPause();
            // Update button text and icon based on new state
            btn.setText(isPlaying ? 'Pause' : 'Play');
            btn.setIcon(isPlaying ? '⏸' : '▶');
          }
        },

        // Speed Slider
        {
          type: 'slider',
          id: 'speed',
          label: 'Speed',
          min: -10,
          max: 10,
          value: 0,  // Default: maps to 0.1x speed
          step: 1,
          unit: 'x',
          // Transform slider value (-10 to 10) to timeScale (0.01 to 1.0) on log scale
          // value = -10 -> timeScale = 0.01
          // value = 0 -> timeScale = 0.1
          // value = 10 -> timeScale = 1.0
          transform: (val) => Math.pow(10, val / 10 - 1),
          // Format for display
          format: (val) => val.toFixed(2),
          showLabels: true,
          labels: { min: '0.01x', max: '1.0x' },
          onChange: (val, manager) => {
            manager.simulation.setTimeScale(val);
          }
        },

        // Measurement Radius Slider
        {
          type: 'slider',
          id: 'measurement-radius',
          label: 'Measurement Size',
          min: 0,
          max: 200,
          value: 100,  // Default: maps to radius 10.0
          step: 1,
          unit: '',
          // Transform slider value (0 to 200) to radius (1 to 100) logarithmically
          // value = 0 -> radius = 1
          // value = 100 -> radius = 10 (default)
          // value = 200 -> radius = 100
          transform: (val) => Math.pow(10, val / 100),
          // Format for display
          format: (val) => val.toFixed(1),
          showLabels: true,
          labels: { min: '1', max: '100' },
          onChange: (val, manager) => {
            manager.simulation.setMeasurementRadius(val);
          }
        },

        // Potential Type Radio Group
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
          value: 'single',  // Default selection
          layout: 'horizontal',
          onChange: (val, manager) => {
            manager.simulation.setPotentialType(val);
          }
        },

        // Potential Strength Slider
        {
          type: 'slider',
          id: 'potential-strength',
          label: 'Potential Strength',
          min: -10,
          max: 10,
          value: 0,  // Default: maps to scale 1.0
          step: 1,
          unit: '',
          // Transform slider value (-10 to 10) to strength scale (0.1 to 10) on log scale
          // value = -10 -> scale = 0.1
          // value = 0 -> scale = 1.0 (default)
          // value = 10 -> scale = 10.0
          transform: (val) => Math.pow(10, val / 10),
          // Format for display
          format: (val) => val.toFixed(1),
          showLabels: true,
          labels: { min: '0.1', max: '10' },
          onChange: (val, manager) => {
            manager.simulation.setPotentialStrengthScale(val);
          }
        },

        // Visualization Mode Select
        {
          type: 'select',
          id: 'viz-mode',
          label: 'Visualization',
          options: [
            { value: 'complex', label: 'Complex (Phase + Amplitude)' },
            { value: 'probability', label: 'Probability Density Only' }
          ],
          value: 'probability',  // Default selection
          onChange: (val, manager) => {
            // Map "complex" to "full" for internal visualizer use
            const internalMode = val === 'complex' ? 'full' : val;
            manager.visualizer.setVisualizationMode(internalMode);
          }
        }
      ]
    }
  ],

  // Default active tab
  defaultTab: 'simulation'
};

/**
 * Helper function to validate the configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];

  // Check for required top-level properties
  if (!config.tabs || !Array.isArray(config.tabs)) {
    errors.push('Configuration must have a "tabs" array');
  }

  if (!config.defaultTab || typeof config.defaultTab !== 'string') {
    errors.push('Configuration must have a "defaultTab" string');
  }

  // Validate each tab
  if (config.tabs) {
    config.tabs.forEach((tab, tabIndex) => {
      if (!tab.id || typeof tab.id !== 'string') {
        errors.push(`Tab ${tabIndex} must have an "id" string`);
      }

      if (!tab.title || typeof tab.title !== 'string') {
        errors.push(`Tab ${tabIndex} must have a "title" string`);
      }

      if (!tab.controls || !Array.isArray(tab.controls)) {
        errors.push(`Tab ${tabIndex} must have a "controls" array`);
      }

      // Validate each control
      if (tab.controls) {
        tab.controls.forEach((control, controlIndex) => {
          if (!control.type || typeof control.type !== 'string') {
            errors.push(`Tab ${tabIndex}, control ${controlIndex} must have a "type" string`);
          }

          if (!control.id || typeof control.id !== 'string') {
            errors.push(`Tab ${tabIndex}, control ${controlIndex} must have an "id" string`);
          }

          // Type-specific validation
          switch (control.type) {
            case 'slider':
              if (typeof control.min !== 'number') {
                errors.push(`Slider ${control.id} must have a numeric "min" value`);
              }
              if (typeof control.max !== 'number') {
                errors.push(`Slider ${control.id} must have a numeric "max" value`);
              }
              if (typeof control.value !== 'number') {
                errors.push(`Slider ${control.id} must have a numeric "value"`);
              }
              break;

            case 'radio':
              if (!control.options || !Array.isArray(control.options)) {
                errors.push(`Radio ${control.id} must have an "options" array`);
              }
              break;

            case 'select':
              if (!control.options || !Array.isArray(control.options)) {
                errors.push(`Select ${control.id} must have an "options" array`);
              }
              break;

            case 'button':
              if (!control.text || typeof control.text !== 'string') {
                errors.push(`Button ${control.id} must have a "text" string`);
              }
              break;

            case 'canvas':
              if (typeof control.width !== 'number') {
                errors.push(`Canvas ${control.id} must have a numeric "width"`);
              }
              if (typeof control.height !== 'number') {
                errors.push(`Canvas ${control.id} must have a numeric "height"`);
              }
              break;

            case 'display':
              if (!control.format || typeof control.format !== 'function') {
                errors.push(`Display ${control.id} must have a "format" function`);
              }
              break;
          }
        });
      }
    });
  }

  // Check if defaultTab exists in tabs
  if (config.tabs && config.defaultTab) {
    const tabIds = config.tabs.map(tab => tab.id);
    if (!tabIds.includes(config.defaultTab)) {
      errors.push(`defaultTab "${config.defaultTab}" not found in tabs`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to get a control by ID from the configuration
 * @param {Object} config - Configuration object
 * @param {string} controlId - ID of the control to find
 * @returns {Object|null} Control object or null if not found
 */
export function getControlById(config, controlId) {
  for (const tab of config.tabs) {
    for (const control of tab.controls) {
      if (control.id === controlId) {
        return control;
      }
    }
  }
  return null;
}

/**
 * Helper function to get a tab by ID from the configuration
 * @param {Object} config - Configuration object
 * @param {string} tabId - ID of the tab to find
 * @returns {Object|null} Tab object or null if not found
 */
export function getTabById(config, tabId) {
  return config.tabs.find(tab => tab.id === tabId) || null;
}
