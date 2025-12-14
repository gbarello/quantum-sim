import { BaseControl } from '../BaseControl.js';

/**
 * TextInputControl - Text/numeric input with validation
 *
 * Extends BaseControl to provide text input fields with:
 * - Text or numeric input types
 * - Real-time validation with visual feedback
 * - Min/max enforcement for numbers
 * - Step support for numeric inputs
 * - Unit suffix display
 * - Pattern matching
 * - Custom validation functions
 *
 * Configuration options:
 * @param {string} type - Input type (text, number, email, etc.) [default: 'text']
 * @param {string} placeholder - Placeholder text
 * @param {*} value - Initial value
 * @param {number} min - Minimum value (number type only)
 * @param {number} max - Maximum value (number type only)
 * @param {number} step - Step increment (number type only)
 * @param {string} pattern - Regex pattern for validation
 * @param {Function} validate - Custom validation function(value) => {valid: boolean, message: string}
 * @param {string} unit - Unit suffix to display (e.g., 'px', '°', 'σ')
 * @param {number} precision - Decimal precision for number display [default: 2]
 * @param {boolean} parseNumber - Auto-parse numeric strings to numbers [default: true for type='number']
 *
 * Events:
 * - 'change': Emitted on valid input change with {value, control}
 * - 'invalid': Emitted on validation failure with {value, message, control}
 * - 'input': Emitted on every keystroke with {value, control}
 */
class TextInputControl extends BaseControl {
    constructor(config) {
        super(config);

        // Input configuration
        this.inputType = config.type || 'text';
        this.placeholder = config.placeholder || '';
        this.currentValue = config.value !== undefined ? config.value : '';
        this.min = config.min;
        this.max = config.max;
        this.step = config.step;
        this.pattern = config.pattern;
        this.customValidate = config.validate;
        this.unit = config.unit || '';
        this.precision = config.precision !== undefined ? config.precision : 2;
        this.parseNumber = config.parseNumber !== undefined ? config.parseNumber : (this.inputType === 'number');

        // UI elements
        this.inputElement = null;
        this.unitLabel = null;
        this.validationMessage = null;

        // Validation state
        this.isValid = true;
        this.lastValidValue = this.currentValue;
    }

    /**
     * Render the control to a container element
     */
    render(container) {
        super.render(container);

        // Create input wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'control-input';

        // Create input element
        this.inputElement = document.createElement('input');
        this.inputElement.type = this.inputType;
        this.inputElement.className = 'input-field';
        this.inputElement.placeholder = this.placeholder;

        // Set initial value
        this._updateInputDisplay(this.currentValue);

        // Set numeric attributes
        if (this.inputType === 'number') {
            if (this.min !== undefined) this.inputElement.min = this.min;
            if (this.max !== undefined) this.inputElement.max = this.max;
            if (this.step !== undefined) this.inputElement.step = this.step;
        }

        // Set pattern
        if (this.pattern) {
            this.inputElement.pattern = this.pattern;
        }

        // Event listeners
        this.inputElement.addEventListener('input', (e) => this._handleInput(e));
        this.inputElement.addEventListener('change', (e) => this._handleChange(e));
        this.inputElement.addEventListener('blur', (e) => this._handleBlur(e));
        this.inputElement.addEventListener('keydown', (e) => this._handleKeyDown(e));

        wrapper.appendChild(this.inputElement);

        // Add unit suffix if provided
        if (this.unit) {
            this.unitLabel = document.createElement('span');
            this.unitLabel.className = 'input-unit';
            this.unitLabel.textContent = this.unit;
            wrapper.appendChild(this.unitLabel);
        }

        // Add validation message container
        this.validationMessage = document.createElement('div');
        this.validationMessage.className = 'input-validation-message';
        wrapper.appendChild(this.validationMessage);

        this.element.appendChild(wrapper);

        return this.element;
    }

    /**
     * Handle input event (every keystroke)
     */
    _handleInput(e) {
        const rawValue = e.target.value;

        // Emit input event for every keystroke
        this.emit('input', {
            value: rawValue,
            control: this
        });

        // Don't validate on every keystroke for better UX
        // Just clear invalid state if user is typing
        if (!this.isValid) {
            this._clearValidation();
        }
    }

    /**
     * Handle change event (on blur or enter)
     */
    _handleChange(e) {
        const rawValue = e.target.value;
        this._processValue(rawValue);
    }

    /**
     * Handle blur event
     */
    _handleBlur(e) {
        const rawValue = e.target.value;
        this._processValue(rawValue);
    }

    /**
     * Handle keyboard events
     */
    _handleKeyDown(e) {
        if (e.key === 'Enter') {
            this._processValue(e.target.value);
        } else if (e.key === 'Escape') {
            // Revert to last valid value
            this._updateInputDisplay(this.lastValidValue);
            this.inputElement.blur();
        }
    }

    /**
     * Process and validate input value
     */
    _processValue(rawValue) {
        let value = rawValue;

        // Parse numeric value if configured
        if (this.parseNumber && this.inputType === 'number') {
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
                this._setInvalid('Invalid number');
                return;
            }
            value = parsed;
        }

        // Validate the value
        const validation = this._validate(value);

        if (validation.valid) {
            // Update state
            this.currentValue = value;
            this.lastValidValue = value;
            this.isValid = true;

            // Update display
            this._updateInputDisplay(value);
            this._setValid();

            // Emit change event
            this.emit('change', {
                value: value,
                control: this
            });
        } else {
            // Show validation error
            this._setInvalid(validation.message);

            // Emit invalid event
            this.emit('invalid', {
                value: rawValue,
                message: validation.message,
                control: this
            });
        }
    }

    /**
     * Validate a value
     * @returns {Object} {valid: boolean, message: string}
     */
    _validate(value) {
        // Empty value check
        if (value === '' || value === null || value === undefined) {
            return { valid: false, message: 'Value is required' };
        }

        // Numeric range validation
        if (this.inputType === 'number' && typeof value === 'number') {
            if (this.min !== undefined && value < this.min) {
                return { valid: false, message: `Value must be at least ${this.min}` };
            }
            if (this.max !== undefined && value > this.max) {
                return { valid: false, message: `Value must be at most ${this.max}` };
            }
        }

        // Pattern validation
        if (this.pattern && typeof value === 'string') {
            const regex = new RegExp(this.pattern);
            if (!regex.test(value)) {
                return { valid: false, message: 'Invalid format' };
            }
        }

        // Custom validation function
        if (this.customValidate) {
            try {
                const result = this.customValidate(value);
                if (typeof result === 'boolean') {
                    return { valid: result, message: result ? '' : 'Validation failed' };
                } else if (typeof result === 'object') {
                    return result;
                }
            } catch (error) {
                return { valid: false, message: error.message };
            }
        }

        return { valid: true, message: '' };
    }

    /**
     * Update input display with formatted value
     */
    _updateInputDisplay(value) {
        if (this.inputElement) {
            if (this.inputType === 'number' && typeof value === 'number') {
                this.inputElement.value = value.toFixed(this.precision);
            } else {
                this.inputElement.value = value;
            }
        }
    }

    /**
     * Set valid state with visual feedback
     */
    _setValid() {
        if (this.inputElement) {
            this.inputElement.classList.remove('input-invalid');
            this.inputElement.classList.add('input-valid');
        }
        if (this.validationMessage) {
            this.validationMessage.textContent = '';
            this.validationMessage.style.display = 'none';
        }
    }

    /**
     * Set invalid state with visual feedback
     */
    _setInvalid(message) {
        this.isValid = false;

        if (this.inputElement) {
            this.inputElement.classList.remove('input-valid');
            this.inputElement.classList.add('input-invalid');
        }
        if (this.validationMessage) {
            this.validationMessage.textContent = message;
            this.validationMessage.style.display = 'block';
        }
    }

    /**
     * Clear validation state
     */
    _clearValidation() {
        this.isValid = true;

        if (this.inputElement) {
            this.inputElement.classList.remove('input-valid', 'input-invalid');
        }
        if (this.validationMessage) {
            this.validationMessage.textContent = '';
            this.validationMessage.style.display = 'none';
        }
    }

    /**
     * Get current value
     */
    getValue() {
        return this.currentValue;
    }

    /**
     * Set value programmatically
     */
    setValue(value) {
        const validation = this._validate(value);

        if (validation.valid) {
            this.currentValue = value;
            this.lastValidValue = value;
            this._updateInputDisplay(value);
            this._setValid();
        } else {
            console.warn(`TextInputControl: Cannot set invalid value: ${validation.message}`);
        }
    }

    /**
     * Enable the control
     */
    enable() {
        super.enable();
        if (this.inputElement) {
            this.inputElement.disabled = false;
        }
    }

    /**
     * Disable the control
     */
    disable() {
        super.disable();
        if (this.inputElement) {
            this.inputElement.disabled = true;
        }
    }

    /**
     * Focus the input
     */
    focus() {
        if (this.inputElement) {
            this.inputElement.focus();
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.inputElement) {
            this.inputElement.remove();
            this.inputElement = null;
        }
        if (this.unitLabel) {
            this.unitLabel.remove();
            this.unitLabel = null;
        }
        if (this.validationMessage) {
            this.validationMessage.remove();
            this.validationMessage = null;
        }

        super.destroy();
    }
}

export default TextInputControl;
