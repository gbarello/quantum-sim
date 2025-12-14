# CanvasControl Quick Reference

## Import
```javascript
import { CanvasControl } from './types/CanvasControl.js';
```

## Basic Usage
```javascript
const canvas = new CanvasControl({
  id: 'my-canvas',
  label: 'Canvas Selector',
  width: 100,
  height: 100,
  onSelect: (x, y) => console.log(x, y)
});
canvas.render(parentElement);
```

## Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | string | required | Unique identifier |
| `label` | string | required | Display label |
| `width` | number | 100 | Canvas width (px) |
| `height` | number | 100 | Canvas height (px) |
| `hint` | string | 'Click to select' | Hover hint |
| `defaultValue` | {x, y} | {x:null, y:null} | Initial state |
| `drawFunction` | function | default grid | Custom draw |
| `onSelect` | function | null | Selection handler |

## Methods
```javascript
canvas.getValue()              // Returns { x, y }
canvas.setValue({ x: 0.5, y: 0.5 })  // Sets state
canvas.update()                // Redraws canvas
canvas.enable() / disable()    // Control interaction
canvas.show() / hide()         // Control visibility
canvas.destroy()               // Cleanup
```

## Events
```javascript
canvas.on('select', (data) => {
  console.log(data.x, data.y);  // 0-1 normalized
});

canvas.on('change', (state) => {
  console.log(state.x, state.y);
});
```

## Draw Function
```javascript
drawFunction: (ctx, state) => {
  // Background
  ctx.fillStyle = '#color';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  // Selection indicator
  if (state.x !== null && state.y !== null) {
    const px = state.x * ctx.canvas.width;
    const py = state.y * ctx.canvas.height;
    // Draw at (px, py)
  }
}
```

## Coordinates
- Normalized: [0, 1]
- (0, 0) = top-left
- (1, 1) = bottom-right
- (0.5, 0.5) = center
- Auto-clamped to valid range

## CSS Classes
- `.canvas-selector` - Container
- `.canvas-selector-container` - Canvas wrapper
- `.canvas-selector-hint` - Hover hint

## Test
```bash
# Open in browser
open js/controls/types/test-canvas.html
```

## Registry Usage
```javascript
import { ControlRegistry } from './ControlRegistry.js';

const canvas = ControlRegistry.create({
  type: 'canvas',
  id: 'selector',
  label: 'Selector',
  width: 150,
  height: 150
});
```
