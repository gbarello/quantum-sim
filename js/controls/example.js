/**
 * Example Usage of BaseControl and ControlRegistry
 *
 * This file demonstrates how to create a simple control type,
 * register it, and use it.
 */

import { BaseControl } from './BaseControl.js';
import { ControlRegistry } from './ControlRegistry.js';

// ============================================================================
// Example 1: Create a Simple Text Input Control
// ============================================================================

class TextControl extends BaseControl {
  constructor(config) {
    super(config);
    this.placeholder = config.placeholder || '';
  }

  render(parentElement) {
    // Create container
    this.container = this._createContainer();

    // Create label
    const label = this._createLabel(this.id);

    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = this.id;
    input.className = 'control-input';
    input.value = this.defaultValue || '';
    input.placeholder = this.placeholder;

    // Add event listener
    input.addEventListener('input', () => {
      this.emit('change', input.value);
    });

    // Add focus/blur events
    input.addEventListener('focus', () => {
      this.emit('focus');
    });

    input.addEventListener('blur', () => {
      this.emit('blur');
    });

    // Build structure
    this.container.appendChild(label);
    this.container.appendChild(input);

    // Attach to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  getValue() {
    const input = this.container.querySelector('input');
    return input ? input.value : '';
  }

  setValue(value) {
    const input = this.container.querySelector('input');
    if (input) {
      input.value = value;
      this.emit('change', value);
    }
  }
}

// ============================================================================
// Example 2: Create a Checkbox Control
// ============================================================================

class CheckboxControl extends BaseControl {
  render(parentElement) {
    // Create container
    this.container = this._createContainer();
    this.container.className += ' checkbox-control';

    // Create checkbox input
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = this.id;
    input.className = 'control-checkbox';
    input.checked = this.defaultValue || false;

    // Create label (for checkbox, label comes after input)
    const label = document.createElement('label');
    label.setAttribute('for', this.id);
    label.className = 'control-label';
    label.textContent = this.label;

    // Add event listener
    input.addEventListener('change', () => {
      this.emit('change', input.checked);
    });

    // Build structure
    this.container.appendChild(input);
    this.container.appendChild(label);

    // Attach to parent
    if (parentElement) {
      parentElement.appendChild(this.container);
    }

    return this.container;
  }

  getValue() {
    const input = this.container.querySelector('input');
    return input ? input.checked : false;
  }

  setValue(value) {
    const input = this.container.querySelector('input');
    if (input) {
      input.checked = !!value;
      this.emit('change', input.checked);
    }
  }
}

// ============================================================================
// Example 3: Usage Demonstration
// ============================================================================

export function runExamples() {
  console.log('=== Control System Examples ===\n');

  // Register control types
  console.log('1. Registering control types...');
  ControlRegistry.register('text', TextControl);
  ControlRegistry.register('checkbox', CheckboxControl);
  console.log('   Registered types:', ControlRegistry.getTypes());
  console.log('');

  // Check if types are registered
  console.log('2. Checking registrations...');
  console.log('   Has "text"?', ControlRegistry.has('text'));
  console.log('   Has "button"?', ControlRegistry.has('button'));
  console.log('');

  // Create a text control
  console.log('3. Creating text control...');
  const nameInput = ControlRegistry.create({
    type: 'text',
    id: 'name-input',
    label: 'Enter your name',
    placeholder: 'John Doe',
    defaultValue: 'Claude',
    onChange: (value) => console.log('   Name changed to:', value)
  });
  console.log('   Created:', nameInput.id);
  console.log('');

  // Subscribe to events
  console.log('4. Setting up event listeners...');
  nameInput.on('focus', () => console.log('   Input focused'));
  nameInput.on('blur', () => console.log('   Input blurred'));
  console.log('');

  // Create a checkbox control
  console.log('5. Creating checkbox control...');
  const agreeCheckbox = ControlRegistry.create({
    type: 'checkbox',
    id: 'agree-checkbox',
    label: 'I agree to the terms',
    defaultValue: false,
    onChange: (checked) => console.log('   Checkbox changed to:', checked)
  });
  console.log('   Created:', agreeCheckbox.id);
  console.log('');

  // Validate a configuration
  console.log('6. Validating configurations...');
  const validConfig = {
    type: 'text',
    id: 'valid-input',
    label: 'Valid Input'
  };
  const invalidConfig = {
    type: 'text',
    // Missing id and label
  };

  const validResult = ControlRegistry.validate(validConfig);
  console.log('   Valid config:', validResult.valid);

  const invalidResult = ControlRegistry.validate(invalidConfig);
  console.log('   Invalid config:', invalidResult.valid);
  console.log('   Errors:', invalidResult.errors);
  console.log('');

  // Create multiple controls at once
  console.log('7. Creating multiple controls...');
  const controls = ControlRegistry.createMany([
    { type: 'text', id: 'email', label: 'Email', placeholder: 'you@example.com' },
    { type: 'text', id: 'phone', label: 'Phone', placeholder: '555-1234' },
    { type: 'checkbox', id: 'newsletter', label: 'Subscribe to newsletter', defaultValue: true }
  ]);
  console.log('   Created', controls.length, 'controls');
  controls.forEach(c => console.log('   -', c.id, '(' + c.constructor.name + ')'));
  console.log('');

  // Test control methods
  console.log('8. Testing control methods...');
  console.log('   Initial value:', nameInput.getValue());

  nameInput.setValue('Assistant');
  console.log('   After setValue:', nameInput.getValue());

  console.log('   Is enabled?', nameInput.isEnabled());
  nameInput.disable();
  console.log('   After disable:', nameInput.isEnabled());
  nameInput.enable();
  console.log('   After enable:', nameInput.isEnabled());

  console.log('   Is visible?', nameInput.isVisible());
  nameInput.hide();
  console.log('   After hide:', nameInput.isVisible());
  nameInput.show();
  console.log('   After show:', nameInput.isVisible());
  console.log('');

  // Cleanup
  console.log('9. Cleaning up...');
  nameInput.destroy();
  agreeCheckbox.destroy();
  controls.forEach(c => c.destroy());
  console.log('   All controls destroyed');
  console.log('');

  // Try to use destroyed control
  console.log('10. Testing destroyed control...');
  console.log('   Is destroyed?', nameInput.isDestroyed());
  try {
    // This should log a warning but not throw
    nameInput.emit('test', 'data');
    console.log('   Emit on destroyed control handled gracefully');
  } catch (error) {
    console.log('   Error:', error.message);
  }
  console.log('');

  console.log('=== Examples Complete ===');
}

// ============================================================================
// Example 4: Browser Usage (if running in browser)
// ============================================================================

export function runBrowserExamples() {
  if (typeof document === 'undefined') {
    console.log('Browser examples require a DOM environment');
    return;
  }

  console.log('=== Browser Examples ===\n');

  // Register types
  ControlRegistry.register('text', TextControl);
  ControlRegistry.register('checkbox', CheckboxControl);

  // Create a container
  const container = document.createElement('div');
  container.id = 'example-controls';
  container.style.padding = '20px';
  document.body.appendChild(container);

  // Create and render controls
  const controls = ControlRegistry.createMany([
    {
      type: 'text',
      id: 'username',
      label: 'Username',
      placeholder: 'Enter username',
      onChange: (value) => console.log('Username:', value)
    },
    {
      type: 'text',
      id: 'password',
      label: 'Password',
      placeholder: 'Enter password',
      onChange: (value) => console.log('Password:', value)
    },
    {
      type: 'checkbox',
      id: 'remember',
      label: 'Remember me',
      defaultValue: true,
      onChange: (checked) => console.log('Remember:', checked)
    }
  ]);

  // Render all controls
  controls.forEach(control => {
    control.render(container);
  });

  console.log('Controls rendered to page!');
  console.log('Try interacting with them in the browser.');

  // Add a button to toggle controls
  const toggleButton = document.createElement('button');
  toggleButton.textContent = 'Toggle Controls';
  toggleButton.style.marginTop = '10px';
  toggleButton.addEventListener('click', () => {
    controls.forEach(control => {
      if (control.isEnabled()) {
        control.disable();
      } else {
        control.enable();
      }
    });
  });
  container.appendChild(toggleButton);

  // Return cleanup function
  return () => {
    controls.forEach(control => control.destroy());
    container.remove();
  };
}

// Run examples if executed directly (Node.js)
if (typeof process !== 'undefined' && process.argv && process.argv[1] === import.meta.url) {
  runExamples();
}
