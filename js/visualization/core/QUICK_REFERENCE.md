# Panel Base Class - Quick Reference

## Import

```javascript
import { Panel } from './visualization/core/Panel.js';
import { TooltipInfo } from './visualization/core/TooltipInfo.js';
```

## Create a Custom Panel

```javascript
class MyPanel extends Panel {
    constructor(name, bounds) {
        super(name, bounds);
        // Initialize panel-specific state
    }

    // REQUIRED: Implement rendering
    render(ctx, simulation, time) {
        // Draw to canvas using this.bounds
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.bounds.x, this.bounds.y,
                     this.bounds.width, this.bounds.height);
    }

    // OPTIONAL: Handle mouse hover
    handleMouseMove(canvasX, canvasY, simulation) {
        const local = this.canvasToLocal(canvasX, canvasY);
        return new TooltipInfo(
            { x: local.x, y: local.y },
            canvasX, canvasY
        );
    }

    // OPTIONAL: Handle clicks
    handleClick(canvasX, canvasY, simulation) {
        const local = this.canvasToLocal(canvasX, canvasY);
        // Do something with the click...
        return true; // Return true if handled
    }

    // OPTIONAL: Handle resize
    updateBounds(newBounds) {
        super.updateBounds(newBounds);
        // Update panel-specific cached data...
    }
}
```

## Use the Panel

```javascript
// Create panel
const panel = new MyPanel('Main View', {
    x: 0, y: 0, width: 512, height: 512
});

// Render in animation loop
function animate() {
    panel.render(ctx, simulation, currentTime);
    requestAnimationFrame(animate);
}

// Handle mouse events
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (panel.containsPoint(x, y)) {
        const tooltip = panel.handleMouseMove(x, y, simulation);
        if (tooltip) {
            showTooltip(tooltip);
        }
    }
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (panel.containsPoint(x, y)) {
        panel.handleClick(x, y, simulation);
    }
});

// Handle resize
window.addEventListener('resize', () => {
    panel.updateBounds({
        x: 0, y: 0,
        width: canvas.width,
        height: canvas.height
    });
});
```

## Coordinate Conversion

```javascript
// Canvas to local (for mouse events)
const local = panel.canvasToLocal(mouseX, mouseY);
// local.x, local.y are relative to panel top-left

// Local to canvas (for drawing)
const canvas = panel.localToCanvas(100, 50);
// canvas.x, canvas.y are absolute canvas coordinates
```

## Panel Bounds

```javascript
// Access bounds
panel.bounds.x      // Left edge
panel.bounds.y      // Top edge
panel.bounds.width  // Width in pixels
panel.bounds.height // Height in pixels

// Check if point is inside
if (panel.containsPoint(x, y)) {
    // Point is inside this panel
}

// Update bounds
panel.updateBounds({ x: 10, y: 10, width: 500, height: 400 });
```

## TooltipInfo

```javascript
// Create tooltip info
const tooltip = new TooltipInfo(
    { key: 'value', another: 'data' }, // Any data object
    canvasX,  // X position for display
    canvasY   // Y position for display
);

// Access tooltip data
console.log(tooltip.data.key);       // 'value'
console.log(tooltip.canvasX);        // X position
console.log(tooltip.canvasY);        // Y position
```

## Common Patterns

### Drawing with Local Coordinates

```javascript
render(ctx, simulation, time) {
    // Draw at local (0, 0) - panel top-left
    const topLeft = this.localToCanvas(0, 0);
    ctx.fillRect(topLeft.x, topLeft.y, 10, 10);

    // Draw at local center
    const center = this.localToCanvas(
        this.bounds.width / 2,
        this.bounds.height / 2
    );
    ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
    ctx.fill();
}
```

### Iterating Over Panel Grid

```javascript
render(ctx, simulation, time) {
    const gridSize = 64;
    const cellWidth = this.bounds.width / gridSize;
    const cellHeight = this.bounds.height / gridSize;

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const localX = i * cellWidth;
            const localY = j * cellHeight;
            const canvas = this.localToCanvas(localX, localY);

            ctx.fillStyle = getColorForCell(i, j);
            ctx.fillRect(canvas.x, canvas.y, cellWidth, cellHeight);
        }
    }
}
```

### Mouse Position to Grid Index

```javascript
handleClick(canvasX, canvasY, simulation) {
    const local = this.canvasToLocal(canvasX, canvasY);

    const gridSize = 64;
    const i = Math.floor(local.x / this.bounds.width * gridSize);
    const j = Math.floor(local.y / this.bounds.height * gridSize);

    console.log(`Clicked grid cell (${i}, ${j})`);
    return true;
}
```

## Testing

```bash
# Run unit tests
node tests/test-panel-base.js

# View visual tests in browser
open tests/test-panel-visual.html
```

## Documentation

- Full API: `/js/visualization/README.md` - Phase 2 section
- Source code: `/js/visualization/core/Panel.js` - Comprehensive JSDoc
- Examples: `/tests/test-panel-visual.html` - Interactive demos
