# Control System Styles

This directory contains the CSS styling for the modular control system. The styles are organized into three main files to maintain separation of concerns and improve maintainability.

## File Structure

```
styles/
├── controls.css    - Base styles for control components
├── panels.css      - Panel container and layout styles
├── tabs.css        - Tab navigation system styles
└── README.md       - This file
```

## Style Files Overview

### `controls.css` (15KB)

**Purpose:** Base styles for individual control components and form elements.

**Includes:**
- Slider controls with custom styling
- Button variants (primary, secondary, outline, ghost, success)
- Radio button groups (horizontal and vertical)
- Select dropdowns with custom arrows
- Canvas selector controls
- Display controls (read-only values)
- Toggle switches
- Form element states (hover, focus, disabled)
- Responsive adjustments
- Accessibility features

**Key Features:**
- Custom range slider styling (cross-browser)
- Touch-friendly minimum target sizes (44px)
- Smooth transitions and hover effects
- Comprehensive disabled states
- Icon support in buttons
- Monospace font for numeric values

### `panels.css` (11KB)

**Purpose:** Structural styles for panel containers, layout, and organization.

**Includes:**
- Main control panel container
- Panel header, body, and footer
- Collapsible panel system
- Nested panels (sub-panels)
- Section dividers and titles
- Panel states (loading, disabled)
- Info/warning/error message panels
- Responsive layout variants (side panel, top panel)
- Floating/overlay panel positioning
- Panel animations (slide, fade)
- Custom scrollbar styling

**Key Features:**
- Flexible positioning (side, top, floating)
- Sticky panel support for desktop
- Collapsible sections with smooth animations
- Max-height constraints for better UX
- Print-friendly styles

### `tabs.css` (13KB)

**Purpose:** Tab navigation system with content area management.

**Includes:**
- Horizontal tab bar
- Tab button states (active, hover, focus, disabled)
- Tab content area with animations
- Tab badges (for notifications/counts)
- Vertical tab layout variant
- Icon-only tab mode
- Alternative tab styles (pill, underline indicator)
- Tab loading state
- Empty state display
- Keyboard navigation support
- Responsive behavior

**Key Features:**
- Smooth tab switching animations (slide, fade, scale)
- Scrollable tab bar for many tabs
- Icon + label or icon-only modes
- Active tab indicator
- Touch-friendly on mobile
- Accessible keyboard navigation
- Print support (shows all tabs)

## Design System Integration

All three CSS files use the CSS custom properties (design tokens) defined in the main `/styles.css` file:

### Color Variables
- `--primary-color`, `--accent-color`, `--secondary-color`
- `--bg-color`, `--bg-light`, `--bg-dark`
- `--text-color`, `--text-light`, `--text-on-dark`
- `--border-color`, `--border-dark`
- `--success-color`, `--warning-color`

### Spacing Scale
- `--spacing-xs` to `--spacing-xxl` (0.25rem to 3rem)

### Typography
- `--font-family`, `--font-mono`
- `--font-size-xs` to `--font-size-3xl`
- `--line-height-tight`, `--line-height-normal`, `--line-height-relaxed`

### Other Tokens
- Border radius, shadows, transitions
- Touch target minimum size
- Canvas max width

## Usage

### In HTML

To use these styles, include them in your HTML file after the main styles:

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="js/controls/styles/controls.css">
<link rel="stylesheet" href="js/controls/styles/panels.css">
<link rel="stylesheet" href="js/controls/styles/tabs.css">
```

### In JavaScript Modules

If using ES6 modules with dynamic imports:

```javascript
// Load styles dynamically
const styleSheets = [
  'js/controls/styles/controls.css',
  'js/controls/styles/panels.css',
  'js/controls/styles/tabs.css'
];

styleSheets.forEach(href => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
});
```

## Component Examples

### Basic Slider

```html
<div class="slider-control">
  <div class="slider-header">
    <label class="slider-label" for="speed">Speed</label>
    <span class="slider-value">1.0x</span>
  </div>
  <div class="slider-container">
    <input type="range" id="speed" min="0" max="2" step="0.1" value="1">
  </div>
</div>
```

### Button Group

```html
<div class="button-group">
  <button class="btn btn-primary">
    <span class="btn-icon">▶</span>
    Play
  </button>
  <button class="btn btn-secondary">
    <span class="btn-icon">↻</span>
    Reset
  </button>
</div>
```

### Radio Group

```html
<div class="radio-group">
  <label class="control-label">Potential Type</label>
  <label class="radio-option">
    <input type="radio" name="potential" value="gaussian" checked>
    <span class="radio-indicator"></span>
    <span class="radio-label">Gaussian Barrier</span>
  </label>
  <label class="radio-option">
    <input type="radio" name="potential" value="square">
    <span class="radio-indicator"></span>
    <span class="radio-label">Square Well</span>
  </label>
</div>
```

### Tab System

```html
<div class="tab-container">
  <div class="tab-bar">
    <button class="tab-button active" data-tab="initial">
      <span class="tab-icon">🎯</span>
      <span class="tab-label">Initial</span>
    </button>
    <button class="tab-button" data-tab="simulate">
      <span class="tab-icon">▶</span>
      <span class="tab-label">Simulate</span>
    </button>
  </div>
  <div class="tab-content-container">
    <div class="tab-content active" id="tab-initial">
      <!-- Content here -->
    </div>
    <div class="tab-content" id="tab-simulate">
      <!-- Content here -->
    </div>
  </div>
</div>
```

### Collapsible Panel

```html
<div class="collapsible-panel">
  <div class="collapsible-header">
    <h3 class="collapsible-title">
      <span class="collapsible-icon">▶</span>
      Advanced Settings
    </h3>
  </div>
  <div class="collapsible-content">
    <div class="collapsible-body">
      <!-- Controls here -->
    </div>
  </div>
</div>
```

## Responsive Behavior

### Breakpoints

- **Desktop (≥769px):** Side panel layout, sticky positioning
- **Tablet (≤768px):** Top panel layout, reduced padding
- **Mobile (≤480px):** Icon-only tabs, compact controls

### Mobile Optimizations

- Touch-friendly target sizes (44px minimum)
- Larger tap areas for sliders and buttons
- Horizontal scrolling tabs
- Reduced font sizes
- Compact spacing

## Accessibility Features

### Keyboard Navigation

- All interactive elements focusable
- Visible focus indicators (outline)
- Tab order follows logical flow
- Arrow key support for radio groups

### Screen Readers

- Proper ARIA labels on controls
- Role attributes for custom components
- Descriptive button text
- Hidden helper text for context

### Reduced Motion

- Respects `prefers-reduced-motion` media query
- Disables animations for users with motion sensitivity
- Maintains functionality without animations

## Animation System

### Tab Transitions

- **Slide:** Content slides in from right (default)
- **Fade:** Content fades in/out
- **Scale:** Content scales from 95% to 100%

Usage:
```html
<div class="tab-content-container anim-slide">
  <!-- or anim-fade, anim-scale -->
</div>
```

### Panel Animations

- **slideInFromRight/Left/Top:** For panel entry
- **fadeIn:** For subtle appearance

Usage:
```html
<div class="control-panel-container panel-animate-in-right">
  <!-- Panel content -->
</div>
```

## Browser Compatibility

### Supported Browsers

- Chrome/Edge 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Mobile browsers (iOS Safari, Chrome Mobile) ✓

### CSS Features Used

- CSS Custom Properties (variables)
- Flexbox and Grid layouts
- Transitions and animations
- Custom scrollbar styling (webkit)
- Media queries
- Focus-visible pseudo-class

### Fallbacks

- Graceful degradation for older browsers
- Default scrollbars if custom styling unsupported
- Standard form controls if custom styling fails

## Customization

### Changing Colors

Update the CSS custom properties in the root `styles.css`:

```css
:root {
  --accent-color: #3498db;  /* Change tab highlight color */
  --primary-color: #2c3e50; /* Change panel headers */
}
```

### Adjusting Spacing

Modify spacing variables:

```css
:root {
  --spacing-md: 1rem;  /* Base spacing unit */
  --spacing-lg: 1.5rem; /* Larger spacing */
}
```

### Adding New Button Variants

Create new button classes in `controls.css`:

```css
.btn-custom {
  background-color: #custom-color;
  color: white;
  border-color: #custom-color;
}

.btn-custom:hover:not(:disabled) {
  background-color: #darker-custom-color;
}
```

## Performance Considerations

### CSS File Sizes

- `controls.css`: ~15KB (unminified)
- `panels.css`: ~11KB (unminified)
- `tabs.css`: ~13KB (unminified)
- **Total:** ~39KB unminified, ~20KB minified + gzipped

### Optimization Tips

1. **Load order:** Load after main styles to leverage cascading
2. **Critical CSS:** Consider inlining critical styles
3. **Minification:** Use CSS minifier for production
4. **Concatenation:** Combine into single file if preferred
5. **Purging:** Remove unused styles in build process

### Rendering Performance

- Uses CSS transforms for animations (GPU-accelerated)
- Avoids layout thrashing
- Efficient selectors (no deep nesting)
- Minimal use of expensive properties (box-shadow, filter)

## Future Enhancements

### Planned Features

- Dark mode support (commented placeholders included)
- More animation variants
- Additional button sizes and variants
- Drag-and-drop panel positioning
- Customizable color schemes
- CSS-in-JS alternative

### Extending the System

To add new control types:

1. Add styles to `controls.css`
2. Follow existing naming conventions
3. Include all states (hover, focus, disabled)
4. Add responsive adjustments
5. Document in this README

## Testing Checklist

When modifying styles, test:

- [ ] All browsers (Chrome, Firefox, Safari)
- [ ] Mobile devices (iOS, Android)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Reduced motion preference
- [ ] Print styles
- [ ] High contrast mode
- [ ] Dark mode (when implemented)
- [ ] Zoom levels (100%, 150%, 200%)

## License

Part of the Quantum Particle Playground project.
Educational use permitted.

---

**Version:** 1.0
**Last Updated:** 2025-12-14
**Total Styles:** ~39KB (unminified)
