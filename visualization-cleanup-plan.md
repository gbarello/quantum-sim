# Visualization Cleanup Plan

## Current State Analysis

### Problems with Current Implementation

#### 1. **Monolithic Rendering Architecture**
The `Visualizer` class in `visualization.js` is a 726-line monolith that handles everything:
- Wavefunction rendering (ImageData manipulation)
- Potential profile plotting (line graph on right side)
- Phase wheel display
- Grid overlay
- Measurement feedback animations
- Hover state management
- Coordinate conversions

**Key Issue**: The `render()` method (lines 172-247) performs all rendering sequentially in one method, making it difficult to:
- Add new visualizations
- Modify individual components without affecting others
- Reorder or conditionally show/hide elements
- Test components in isolation

#### 2. **Hardcoded Layout Logic**
Canvas layout is calculated in multiple places with magic numbers:
- Lines 182-183: `const gridSize_pixels = this.canvas.height;`
- Lines 360-363: Plot area calculation
- Lines 256-278: Grid overlay positioning
- Lines 436-441: Measurement circle positioning

**Problems**:
- Layout logic is duplicated across methods
- No single source of truth for panel dimensions
- Adding a new visualization element requires touching multiple methods
- Difficult to make the layout responsive or configurable

#### 3. **Coordinate System Confusion**
Three different coordinate systems are used inconsistently:
- Canvas pixels (with DPR scaling)
- Grid coordinates (0 to gridSize-1)
- Physical coordinates (0 to domainSize)

**Duplication**:
- `canvasToGrid()` in visualizer.js:634-645
- `canvasToGridCoords()` in controls.js:251-274
- Both do similar things but with subtle differences

#### 4. **Shared State Management**
Hover state is managed by both Controller and Visualizer:
- Controller tracks `isHovering` and `hoverPosition` (lines 71-72)
- Visualizer tracks `hoverState` with `{active, x, y}` (lines 51-55)
- Controller calls `visualizer.setHoverState()` to sync (line 298)

**Problems**:
- Unclear ownership of state
- Risk of desynchronization
- Difficult to understand control flow

#### 5. **No Separation of Concerns**
The potential profile plot (lines 330-426) is tightly coupled to the main render loop:
- Reads simulation data directly
- Draws directly on the main canvas
- Has no independent coordinate system
- Can't be tested or modified independently

#### 6. **Limited Extensibility**
To add a new visualization (e.g., momentum space, energy histogram, trajectory overlay):
1. Modify the monolithic `render()` method
2. Add coordinate conversion logic
3. Update layout calculations throughout
4. Handle mouse interactions in Controller
5. Add state management logic
6. Test the entire visualization system

This violates the Open/Closed Principle - the system is not open for extension without modification.

---

## Proposed Architecture: Panel-Based System

### Core Concept
Divide the canvas into **independent, self-contained panels** that:
- Manage their own rendering
- Handle their own coordinate conversions
- Know their own boundaries
- Respond to mouse events in their region
- Can be added/removed/reordered easily

### New Structure

```
VisualizationManager
│
├── CanvasLayout (manages panel positioning)
│   ├── calculateLayout(canvasWidth, canvasHeight) → PanelBounds[]
│   └── hitTest(mouseX, mouseY) → Panel | null
│
├── Panel (base class/interface)
│   ├── bounds: {x, y, width, height}
│   ├── render(ctx, simulation, time)
│   ├── handleMouseMove(x, y, simulation) → TooltipInfo | null
│   ├── handleClick(x, y, simulation) → boolean (handled?)
│   ├── canvasToLocal(x, y) → {x, y}
│   └── localToCanvas(x, y) → {x, y}
│
├── Panels:
│   ├── WavefunctionPanel (main square grid)
│   ├── PotentialPlotPanel (line graph on right)
│   ├── PhaseWheelPanel (color key, optional)
│   ├── GridOverlayPanel (decorative, optional)
│   └── MeasurementFeedbackPanel (animations)
│
└── InteractionManager
    ├── currentHoverPanel: Panel | null
    ├── handleCanvasMouseMove(x, y)
    ├── handleCanvasClick(x, y)
    └── getTooltipInfo() → string | null
```

---

## Implementation Plan

### Phase 1: Extract Layout Logic (Low Risk)

**Goal**: Centralize all layout calculations

**Steps**:
1. Create `CanvasLayout` class
   ```javascript
   class CanvasLayout {
     constructor(canvasWidth, canvasHeight, config) {
       this.canvasWidth = canvasWidth;
       this.canvasHeight = canvasHeight;
       this.config = config; // {showPlot, showPhaseWheel, etc.}
     }

     calculateLayout() {
       // Returns: { wavefunction: {x, y, w, h}, plot: {x, y, w, h}, ... }
       const hasPlot = this.config.showPlot;
       const gridSize = this.canvasHeight; // Square grid
       const plotWidth = hasPlot ? (this.canvasWidth - gridSize) : 0;

       return {
         wavefunction: { x: 0, y: 0, width: gridSize, height: gridSize },
         potentialPlot: hasPlot ? { x: gridSize, y: 0, width: plotWidth, height: this.canvasHeight } : null,
         phaseWheel: this.config.showPhaseWheel ? { x: this.canvasWidth - 100, y: 20, width: 80, height: 80 } : null
       };
     }

     hitTest(x, y) {
       // Returns which panel region contains (x, y)
       const layout = this.calculateLayout();
       for (const [name, bounds] of Object.entries(layout)) {
         if (bounds && this.isInBounds(x, y, bounds)) {
           return { panel: name, bounds };
         }
       }
       return null;
     }

     isInBounds(x, y, bounds) {
       return x >= bounds.x && x < bounds.x + bounds.width &&
              y >= bounds.y && y < bounds.y + bounds.height;
     }
   }
   ```

2. Replace hardcoded layout logic in `Visualizer.render()`:
   - Before: `const gridSize_pixels = this.canvas.height;`
   - After: `const layout = this.layout.calculateLayout();`
   - Use `layout.wavefunction.width` instead of magic calculations

3. Update coordinate conversion methods to use layout

**Benefits**:
- Single source of truth for layout
- Easy to modify panel positions/sizes
- No risk to existing functionality
- Can be tested independently

---

### Phase 2: Create Panel Base Class (Medium Risk)

**Goal**: Define panel interface and coordinate system

**Steps**:
1. Create `Panel` base class:
   ```javascript
   class Panel {
     constructor(name, bounds) {
       this.name = name;
       this.bounds = bounds; // {x, y, width, height} in canvas coords
     }

     /**
      * Render this panel
      * @param {CanvasRenderingContext2D} ctx - Canvas context
      * @param {QuantumSimulation} simulation - Simulation data
      * @param {number} time - Current time
      */
     render(ctx, simulation, time) {
       throw new Error('Panel.render() must be implemented');
     }

     /**
      * Convert canvas coords to panel-local coords
      * @param {number} canvasX - Canvas X coordinate
      * @param {number} canvasY - Canvas Y coordinate
      * @returns {{x: number, y: number}} Local coordinates (0,0 = panel top-left)
      */
     canvasToLocal(canvasX, canvasY) {
       return {
         x: canvasX - this.bounds.x,
         y: canvasY - this.bounds.y
       };
     }

     /**
      * Convert panel-local coords to canvas coords
      */
     localToCanvas(localX, localY) {
       return {
         x: localX + this.bounds.x,
         y: localY + this.bounds.y
       };
     }

     /**
      * Handle mouse move over this panel
      * @returns {TooltipInfo | null} Tooltip data if any
      */
     handleMouseMove(canvasX, canvasY, simulation) {
       return null; // Override in subclass
     }

     /**
      * Handle click on this panel
      * @returns {boolean} True if click was handled
      */
     handleClick(canvasX, canvasY, simulation) {
       return false; // Override in subclass
     }

     /**
      * Check if point is within this panel's bounds
      */
     containsPoint(canvasX, canvasY) {
       return canvasX >= this.bounds.x &&
              canvasX < this.bounds.x + this.bounds.width &&
              canvasY >= this.bounds.y &&
              canvasY < this.bounds.y + this.bounds.height;
     }

     /**
      * Update panel bounds (called on resize)
      */
     updateBounds(newBounds) {
       this.bounds = newBounds;
     }
   }
   ```

2. Create `TooltipInfo` interface:
   ```javascript
   class TooltipInfo {
     constructor(text, x, y) {
       this.text = text;      // Display text
       this.x = x;            // Canvas X position
       this.y = y;            // Canvas Y position
     }
   }
   ```

**Benefits**:
- Clear contract for what panels must implement
- Coordinate conversion is handled consistently
- Panels are self-contained and testable
- Easy to add new panel types

---

### Phase 3: Extract Wavefunction Panel (Higher Risk)

**Goal**: Move wavefunction rendering into its own panel

**Steps**:
1. Create `WavefunctionPanel` class:
   ```javascript
   class WavefunctionPanel extends Panel {
     constructor(bounds, config) {
       super('wavefunction', bounds);
       this.config = config; // {visualizationMode, saturationScale, etc.}
       this.hoverGridCoords = null; // {x, y} in grid coords
     }

     render(ctx, simulation, time) {
       const gridSize = simulation.gridSize;
       const psi = simulation.psi;

       // Create ImageData for this panel only
       const imageData = ctx.createImageData(this.bounds.width, this.bounds.height);
       const data = imageData.data;

       // Render wavefunction using existing logic
       // (copied from current Visualizer.render(), lines 193-220)
       const cellSize = this.bounds.width / gridSize;

       for (let gy = 0; gy < gridSize; gy++) {
         for (let gx = 0; gx < gridSize; gx++) {
           const psiValue = { re: psi.getRe(gx, gy), im: psi.getIm(gx, gy) };
           const [r, g, b] = this.complexToColor(psiValue);

           const startX = Math.floor(gx * cellSize);
           const startY = Math.floor(gy * cellSize);
           const endX = Math.floor((gx + 1) * cellSize);
           const endY = Math.floor((gy + 1) * cellSize);

           for (let py = startY; py < endY; py++) {
             for (let px = startX; px < endX; px++) {
               const pixelIdx = (py * this.bounds.width + px) * 4;
               data[pixelIdx] = r;
               data[pixelIdx + 1] = g;
               data[pixelIdx + 2] = b;
               data[pixelIdx + 3] = 255;
             }
           }
         }
       }

       ctx.putImageData(imageData, this.bounds.x, this.bounds.y);
     }

     canvasToGrid(canvasX, canvasY, gridSize) {
       const local = this.canvasToLocal(canvasX, canvasY);
       const cellSize = this.bounds.width / gridSize;
       return {
         x: Math.floor(local.x / cellSize),
         y: Math.floor(local.y / cellSize)
       };
     }

     handleMouseMove(canvasX, canvasY, simulation) {
       const gridCoords = this.canvasToGrid(canvasX, canvasY, simulation.gridSize);
       this.hoverGridCoords = gridCoords;

       // Return tooltip info
       const probability = simulation.getProbabilityAt(gridCoords.x, gridCoords.y);
       return new TooltipInfo(
         `P = ${(probability * 100).toFixed(2)}%`,
         canvasX + 10,
         canvasY + 10
       );
     }

     handleClick(canvasX, canvasY, simulation) {
       const gridCoords = this.canvasToGrid(canvasX, canvasY, simulation.gridSize);
       // Trigger measurement (return true to indicate handled)
       // This would be coordinated through a callback or event system
       return true;
     }

     complexToColor(psi) {
       // Move existing complexToColor logic here
       // (from current Visualizer.complexToColor(), lines 89-129)
     }

     hslToRgb(h, s, l) {
       // Move existing hslToRgb logic here
       // (from current Visualizer.hslToRgb(), lines 138-167)
     }
   }
   ```

2. Update `Visualizer` to use `WavefunctionPanel`:
   ```javascript
   class Visualizer {
     constructor(canvas, simulation) {
       this.canvas = canvas;
       this.ctx = canvas.getContext('2d', { alpha: false });
       this.simulation = simulation;

       // Initialize layout
       this.layout = new CanvasLayout(canvas.width, canvas.height, {
         showPlot: simulation.potentialType !== 'none',
         showPhaseWheel: true
       });

       // Initialize panels
       const layoutBounds = this.layout.calculateLayout();
       this.panels = {
         wavefunction: new WavefunctionPanel(
           layoutBounds.wavefunction,
           { visualizationMode: 'full', saturationScale: 5.0 }
         )
         // Other panels will be added in later phases
       };
     }

     render() {
       // Clear canvas
       this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

       // Render each panel
       for (const panel of Object.values(this.panels)) {
         if (panel) {
           panel.render(this.ctx, this.simulation, performance.now());
         }
       }
     }
   }
   ```

**Benefits**:
- Wavefunction rendering is completely isolated
- Can test wavefunction panel independently
- Easy to add multiple wavefunction views (e.g., momentum space)
- Coordinate conversion for wavefunction is local to the panel

**Risks**:
- This is the largest rendering component, so bugs here affect the main visualization
- Need careful testing to ensure ImageData rendering works identically

---

### Phase 4: Extract Potential Plot Panel (Medium Risk)

**Goal**: Move potential profile plotting to its own panel

**Steps**:
1. Create `PotentialPlotPanel` class:
   ```javascript
   class PotentialPlotPanel extends Panel {
     constructor(bounds) {
       super('potentialPlot', bounds);
       this.padding = 10; // Internal padding
     }

     render(ctx, simulation, time) {
       if (!simulation.potentialType || simulation.potentialType === 'none') {
         return; // Nothing to render
       }

       const potential = simulation.getPotential();
       const gridSize = simulation.gridSize;

       // Extract potential profile along centerline
       const centerX = Math.floor(gridSize / 2);
       const profile = [];
       for (let gy = 0; gy < gridSize; gy++) {
         profile.push(potential[gy * gridSize + centerX]);
       }

       const minV = Math.min(...profile);
       const maxV = Math.max(...profile);

       // Avoid division by zero
       const range = Math.max(Math.abs(maxV - minV), 1e-10);

       // Calculate plot area with padding
       const plotWidth = this.bounds.width - 2 * this.padding;
       const plotHeight = this.bounds.height;

       ctx.save();

       // Draw potential profile as line
       ctx.beginPath();
       ctx.strokeStyle = 'rgba(255, 0, 0, 0.9)';
       ctx.lineWidth = 2;

       for (let i = 0; i < profile.length; i++) {
         const V = profile[i];
         const normalized = 1 - ((V - minV) / range);

         const x = this.bounds.x + this.padding + normalized * plotWidth;
         const y = this.bounds.y + (i / (gridSize - 1)) * plotHeight;

         if (i === 0) {
           ctx.moveTo(x, y);
         } else {
           ctx.lineTo(x, y);
         }
       }
       ctx.stroke();

       // Draw zero reference line if in range
       if (minV <= 0 && maxV >= 0) {
         const zeroNorm = 1 - ((0 - minV) / range);
         const zeroX = this.bounds.x + this.padding + zeroNorm * plotWidth;
         ctx.beginPath();
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
         ctx.lineWidth = 1;
         ctx.setLineDash([5, 5]);
         ctx.moveTo(zeroX, this.bounds.y);
         ctx.lineTo(zeroX, this.bounds.y + plotHeight);
         ctx.stroke();
         ctx.setLineDash([]);
       }

       // Draw label
       ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
       ctx.font = '10px sans-serif';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'top';
       const label = simulation.potentialType.charAt(0).toUpperCase() +
                     simulation.potentialType.slice(1);
       ctx.fillText(label, this.bounds.x + this.bounds.width / 2, this.bounds.y + 5);

       ctx.restore();
     }

     handleMouseMove(canvasX, canvasY, simulation) {
       // Could show potential value at this Y position
       const local = this.canvasToLocal(canvasX, canvasY);
       const yFraction = local.y / this.bounds.height;
       const gridY = Math.floor(yFraction * simulation.gridSize);

       // Get potential at centerline
       const centerX = Math.floor(simulation.gridSize / 2);
       const V = simulation.getPotential()[gridY * simulation.gridSize + centerX];

       return new TooltipInfo(
         `V = ${V.toFixed(2)}`,
         canvasX + 10,
         canvasY + 10
       );
     }
   }
   ```

2. Add to `Visualizer.panels`:
   ```javascript
   if (layoutBounds.potentialPlot) {
     this.panels.potentialPlot = new PotentialPlotPanel(layoutBounds.potentialPlot);
   }
   ```

**Benefits**:
- Plot is completely independent
- Can easily add other plots (energy over time, momentum histogram, etc.)
- Plot rendering doesn't interfere with wavefunction rendering
- Can show tooltips for plot data

---

### Phase 5: Extract Overlay Panels (Low Risk)

**Goal**: Move decorative overlays to separate panels

**Steps**:
1. Create `GridOverlayPanel`:
   ```javascript
   class GridOverlayPanel extends Panel {
     constructor(bounds, gridSize, config) {
       super('gridOverlay', bounds);
       this.gridSize = gridSize;
       this.config = config; // {lineColor, lineWidth}
     }

     render(ctx, simulation, time) {
       const cellSize = this.bounds.width / this.gridSize;

       ctx.save();
       ctx.strokeStyle = this.config.lineColor || 'rgba(255, 255, 255, 0.2)';
       ctx.lineWidth = this.config.lineWidth || 1;

       // Draw vertical lines
       for (let i = 0; i <= this.gridSize; i++) {
         const x = this.bounds.x + i * cellSize;
         ctx.beginPath();
         ctx.moveTo(x, this.bounds.y);
         ctx.lineTo(x, this.bounds.y + this.bounds.height);
         ctx.stroke();
       }

       // Draw horizontal lines
       for (let i = 0; i <= this.gridSize; i++) {
         const y = this.bounds.y + i * cellSize;
         ctx.beginPath();
         ctx.moveTo(this.bounds.x, y);
         ctx.lineTo(this.bounds.x + this.bounds.width, y);
         ctx.stroke();
       }

       ctx.restore();
     }
   }
   ```

2. Create `MeasurementFeedbackPanel`:
   ```javascript
   class MeasurementFeedbackPanel extends Panel {
     constructor(bounds, gridSize) {
       super('measurementFeedback', bounds);
       this.gridSize = gridSize;
       this.feedbackState = {
         active: false,
         x: 0,  // grid coords
         y: 0,  // grid coords
         type: 'none',
         startTime: 0,
         duration: 500
       };
     }

     showFeedback(gridX, gridY, type, duration = 500) {
       this.feedbackState = {
         active: true,
         x: gridX,
         y: gridY,
         type,
         startTime: performance.now(),
         duration
       };
     }

     render(ctx, simulation, time) {
       if (!this.feedbackState.active) return;

       const elapsed = time - this.feedbackState.startTime;
       if (elapsed >= this.feedbackState.duration) {
         this.feedbackState.active = false;
         return;
       }

       const progress = elapsed / this.feedbackState.duration;
       const alpha = 1 - progress;

       const cellSize = this.bounds.width / this.gridSize;
       const canvasX = this.bounds.x + this.feedbackState.x * cellSize;
       const canvasY = this.bounds.y + this.feedbackState.y * cellSize;

       let color;
       if (this.feedbackState.type === 'positive') {
         color = `rgba(0, 255, 0, ${alpha * 0.6})`;
       } else if (this.feedbackState.type === 'negative') {
         color = `rgba(255, 0, 0, ${alpha * 0.6})`;
       } else {
         color = `rgba(255, 255, 255, ${alpha * 0.6})`;
       }

       ctx.fillStyle = color;
       ctx.fillRect(canvasX, canvasY, cellSize, cellSize);

       // Draw expanding circle for positive measurements
       if (this.feedbackState.type === 'positive') {
         const radius = cellSize * 0.5 * (1 + progress * 2);
         ctx.beginPath();
         ctx.arc(
           canvasX + cellSize / 2,
           canvasY + cellSize / 2,
           radius,
           0,
           Math.PI * 2
         );
         ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
         ctx.lineWidth = 2;
         ctx.stroke();
       }
     }
   }
   ```

3. Create `MeasurementCirclePanel`:
   ```javascript
   class MeasurementCirclePanel extends Panel {
     constructor(bounds, gridSize) {
       super('measurementCircle', bounds);
       this.gridSize = gridSize;
       this.hoverState = { active: false, x: 0, y: 0 };
       this.measurementRadius = 10; // grid units
     }

     setHoverState(active, gridX = 0, gridY = 0) {
       this.hoverState = { active, x: gridX, y: gridY };
     }

     setMeasurementRadius(radius) {
       this.measurementRadius = radius;
     }

     render(ctx, simulation, time) {
       if (!this.hoverState.active) return;

       const cellSize = this.bounds.width / this.gridSize;
       const canvasX = this.bounds.x + (this.hoverState.x + 0.5) * cellSize;
       const canvasY = this.bounds.y + (this.hoverState.y + 0.5) * cellSize;
       const radiusInPixels = this.measurementRadius * cellSize;

       ctx.beginPath();
       ctx.arc(canvasX, canvasY, radiusInPixels, 0, Math.PI * 2);
       ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
       ctx.lineWidth = 2;
       ctx.stroke();
     }
   }
   ```

4. Create `PhaseWheelPanel`:
   ```javascript
   class PhaseWheelPanel extends Panel {
     constructor(bounds) {
       super('phaseWheel', bounds);
     }

     render(ctx, simulation, time) {
       const centerX = this.bounds.x + this.bounds.width / 2;
       const centerY = this.bounds.y + this.bounds.height / 2;
       const radius = Math.min(this.bounds.width, this.bounds.height) / 2 - 5;

       // Draw colored wheel
       for (let angle = 0; angle < 360; angle += 1) {
         const startAngle = (angle - 90) * Math.PI / 180;
         const endAngle = (angle - 89) * Math.PI / 180;

         const [r, g, b] = this.hslToRgb(angle, 100, 50);

         ctx.beginPath();
         ctx.moveTo(centerX, centerY);
         ctx.arc(centerX, centerY, radius, startAngle, endAngle);
         ctx.closePath();
         ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
         ctx.fill();
       }

       // Draw border
       ctx.beginPath();
       ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
       ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
       ctx.lineWidth = 2;
       ctx.stroke();

       // Draw labels
       ctx.fillStyle = 'white';
       ctx.font = '10px sans-serif';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';

       const labelRadius = radius + 15;
       const labels = [
         { text: 'Re+', angle: 0 },
         { text: 'Im+', angle: 90 },
         { text: 'Re-', angle: 180 },
         { text: 'Im-', angle: 270 }
       ];

       labels.forEach(({ text, angle }) => {
         const rad = (angle - 90) * Math.PI / 180;
         const x = centerX + Math.cos(rad) * labelRadius;
         const y = centerY + Math.sin(rad) * labelRadius;
         ctx.fillText(text, x, y);
       });
     }

     hslToRgb(h, s, l) {
       // Shared utility - could be moved to a ColorUtils class
     }
   }
   ```

**Benefits**:
- Each overlay is independent
- Easy to add/remove overlays
- No interference between overlays
- Can have separate visibility flags for each

---

### Phase 6: Create InteractionManager (Medium Risk)

**Goal**: Centralize mouse/touch interaction logic

**Steps**:
1. Create `InteractionManager` class:
   ```javascript
   class InteractionManager {
     constructor(canvas, panels, callbacks) {
       this.canvas = canvas;
       this.panels = panels; // Map of panel name -> Panel instance
       this.callbacks = callbacks; // {onMeasurement, onHoverChange, etc.}
       this.currentHoverPanel = null;
       this.currentTooltip = null;

       this.setupEventListeners();
     }

     setupEventListeners() {
       this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
       this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
       this.canvas.addEventListener('click', this.handleClick.bind(this));
       // Touch events...
     }

     handleMouseMove(event) {
       const rect = this.canvas.getBoundingClientRect();
       const canvasX = event.clientX - rect.left;
       const canvasY = event.clientY - rect.top;

       // Find which panel contains this point
       let hoveredPanel = null;
       for (const panel of Object.values(this.panels)) {
         if (panel && panel.containsPoint(canvasX, canvasY)) {
           hoveredPanel = panel;
           break;
         }
       }

       // Update hover state
       if (hoveredPanel !== this.currentHoverPanel) {
         this.currentHoverPanel = hoveredPanel;
         if (this.callbacks.onHoverChange) {
           this.callbacks.onHoverChange(hoveredPanel);
         }
       }

       // Get tooltip from hovered panel
       if (hoveredPanel) {
         this.currentTooltip = hoveredPanel.handleMouseMove(
           canvasX,
           canvasY,
           this.callbacks.getSimulation()
         );

         if (this.callbacks.onTooltipChange) {
           this.callbacks.onTooltipChange(this.currentTooltip);
         }
       }
     }

     handleMouseLeave() {
       this.currentHoverPanel = null;
       this.currentTooltip = null;

       if (this.callbacks.onHoverChange) {
         this.callbacks.onHoverChange(null);
       }
       if (this.callbacks.onTooltipChange) {
         this.callbacks.onTooltipChange(null);
       }
     }

     handleClick(event) {
       const rect = this.canvas.getBoundingClientRect();
       const canvasX = event.clientX - rect.left;
       const canvasY = event.clientY - rect.top;

       // Try each panel until one handles the click
       for (const panel of Object.values(this.panels)) {
         if (panel && panel.containsPoint(canvasX, canvasY)) {
           const handled = panel.handleClick(
             canvasX,
             canvasY,
             this.callbacks.getSimulation()
           );

           if (handled) {
             // Panel handled the click, notify
             if (this.callbacks.onPanelClick) {
               this.callbacks.onPanelClick(panel, canvasX, canvasY);
             }
             break;
           }
         }
       }
     }

     getCurrentTooltip() {
       return this.currentTooltip;
     }

     getCurrentHoverPanel() {
       return this.currentHoverPanel;
     }
   }
   ```

2. Update `Controller` to use `InteractionManager`:
   ```javascript
   // In Controller constructor:
   this.interactionManager = new InteractionManager(
     this.ui.canvas,
     this.visualizer.panels,
     {
       getSimulation: () => this.simulation,
       onHoverChange: (panel) => {
         // Update measurement circle visibility
         if (panel && panel.name === 'wavefunction') {
           // Show measurement circle
         } else {
           // Hide measurement circle
         }
       },
       onTooltipChange: (tooltip) => {
         if (tooltip) {
           this.ui.hoverProbability.textContent = tooltip.text;
           this.ui.hoverProbability.style.left = `${tooltip.x}px`;
           this.ui.hoverProbability.style.top = `${tooltip.y}px`;
           this.ui.hoverProbability.style.display = 'block';
         } else {
           this.ui.hoverProbability.style.display = 'none';
         }
       },
       onPanelClick: (panel, x, y) => {
         if (panel.name === 'wavefunction') {
           const gridCoords = panel.canvasToGrid(x, y, this.simulation.gridSize);
           this.performMeasurement(gridCoords.x, gridCoords.y);
         }
       }
     }
   );
   ```

**Benefits**:
- All mouse/touch logic is centralized
- No duplication between Controller and Visualizer
- Easy to add new interaction modes
- Clear separation: InteractionManager handles input, panels handle logic

---

### Phase 7: Update Visualizer as Coordinator (Low Risk)

**Goal**: Transform Visualizer into a lightweight coordinator

**Final `Visualizer` structure**:
```javascript
class Visualizer {
  constructor(canvas, simulation, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.simulation = simulation;
    this.config = {
      visualizationMode: config.visualizationMode || 'full',
      saturationScale: config.saturationScale || 5.0,
      showGrid: config.showGrid || false,
      showPhaseWheel: config.showPhaseWheel || true,
      showPotentialPlot: config.showPotentialPlot !== false
    };

    this.resize();
    this.createPanels();
  }

  createPanels() {
    // Calculate layout
    this.layout = new CanvasLayout(
      this.canvas.width,
      this.canvas.height,
      {
        showPlot: this.config.showPotentialPlot &&
                  this.simulation.potentialType !== 'none',
        showPhaseWheel: this.config.showPhaseWheel
      }
    );

    const bounds = this.layout.calculateLayout();

    // Create panels in render order (back to front)
    this.panels = {};

    // 1. Main wavefunction (background)
    this.panels.wavefunction = new WavefunctionPanel(
      bounds.wavefunction,
      {
        visualizationMode: this.config.visualizationMode,
        saturationScale: this.config.saturationScale
      }
    );

    // 2. Potential plot (if enabled)
    if (bounds.potentialPlot) {
      this.panels.potentialPlot = new PotentialPlotPanel(bounds.potentialPlot);
    }

    // 3. Grid overlay (if enabled)
    if (this.config.showGrid) {
      this.panels.gridOverlay = new GridOverlayPanel(
        bounds.wavefunction,
        this.simulation.gridSize,
        { lineColor: 'rgba(255, 255, 255, 0.2)', lineWidth: 1 }
      );
    }

    // 4. Phase wheel (if enabled)
    if (bounds.phaseWheel) {
      this.panels.phaseWheel = new PhaseWheelPanel(bounds.phaseWheel);
    }

    // 5. Measurement feedback (overlay)
    this.panels.measurementFeedback = new MeasurementFeedbackPanel(
      bounds.wavefunction,
      this.simulation.gridSize
    );

    // 6. Measurement circle (top overlay)
    this.panels.measurementCircle = new MeasurementCirclePanel(
      bounds.wavefunction,
      this.simulation.gridSize
    );
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Render panels in order
    const time = performance.now();
    for (const panel of Object.values(this.panels)) {
      if (panel) {
        panel.render(this.ctx, this.simulation, time);
      }
    }
  }

  resize() {
    // Update canvas size
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Recreate panels with new layout
    this.createPanels();
  }

  // Configuration methods
  setVisualizationMode(mode) {
    this.config.visualizationMode = mode;
    if (this.panels.wavefunction) {
      this.panels.wavefunction.config.visualizationMode = mode;
    }
  }

  setGridVisible(visible) {
    this.config.showGrid = visible;
    this.createPanels(); // Recreate to add/remove grid panel
  }

  showMeasurementFeedback(gridX, gridY, type, duration) {
    if (this.panels.measurementFeedback) {
      this.panels.measurementFeedback.showFeedback(gridX, gridY, type, duration);
    }
  }

  setHoverState(active, gridX, gridY) {
    if (this.panels.measurementCircle) {
      this.panels.measurementCircle.setHoverState(active, gridX, gridY);
    }
  }
}
```

**Benefits**:
- Visualizer is now ~150 lines instead of 726
- Clear, simple coordinator role
- All rendering logic is in panels
- Easy to understand and modify

---

## Migration Strategy

### Approach: Parallel Implementation

To minimize risk, implement the new system alongside the old one:

1. **Create new files** (don't modify existing yet):
   - `js/visualization/CanvasLayout.js`
   - `js/visualization/Panel.js`
   - `js/visualization/WavefunctionPanel.js`
   - `js/visualization/PotentialPlotPanel.js`
   - `js/visualization/OverlayPanels.js`
   - `js/visualization/InteractionManager.js`
   - `js/visualization/VisualizerV2.js`

2. **Test new system** independently:
   - Create `test-visualization-v2.html`
   - Compare side-by-side with old visualization
   - Verify pixel-perfect rendering
   - Test all interactions

3. **Gradual cutover**:
   - Add feature flag: `useNewVisualization`
   - Switch in `main.js`:
     ```javascript
     const Visualizer = config.useNewVisualization ? VisualizerV2 : VisualizerV1;
     ```
   - Test thoroughly with flag enabled
   - Remove old code once confident

4. **Rollback plan**:
   - Keep old `visualization.js` as `visualization-legacy.js`
   - Easy to switch back if issues arise
   - Can delete legacy code after 1-2 releases

---

## Benefits Summary

### For Developers

1. **Easier to Understand**
   - Each panel is self-contained (~100-150 lines)
   - Clear responsibilities
   - No tangled dependencies

2. **Easier to Modify**
   - Change one panel without affecting others
   - Add new visualizations by creating new panels
   - Reorder render stack trivially

3. **Easier to Test**
   - Test panels in isolation
   - Mock panel dependencies easily
   - Visual regression testing per panel

4. **Better Performance**
   - Can skip rendering off-screen panels
   - Can cache panel renders if unchanged
   - Parallel rendering possible (future: OffscreenCanvas)

### For Users

1. **More Flexible Layout**
   - Easy to add split views (momentum space + position space)
   - Configurable panel positions
   - Responsive layout adjustments

2. **Better Interactions**
   - Context-aware tooltips per panel
   - Panel-specific click behaviors
   - Multi-select, drag-and-drop (future)

3. **More Visualizations**
   - Energy histogram panel
   - Trajectory tracking panel
   - Measurement history panel
   - Eigenstate decomposition panel

---

## File Structure (After Refactor)

```
js/
├── main.js (unchanged)
├── quantum.js (unchanged)
├── controls.js (simplified, uses InteractionManager)
├── utils.js (unchanged)
│
└── visualization/
    ├── index.js (exports all visualization classes)
    │
    ├── core/
    │   ├── CanvasLayout.js
    │   ├── Panel.js (base class)
    │   ├── InteractionManager.js
    │   └── Visualizer.js (coordinator)
    │
    ├── panels/
    │   ├── WavefunctionPanel.js
    │   ├── PotentialPlotPanel.js
    │   ├── GridOverlayPanel.js
    │   ├── MeasurementFeedbackPanel.js
    │   ├── MeasurementCirclePanel.js
    │   └── PhaseWheelPanel.js
    │
    └── utils/
        ├── ColorUtils.js (hslToRgb, complexToColor)
        └── CoordinateUtils.js (shared conversion utilities)
```

---

## Timeline Estimate

- **Phase 1** (Layout): 2-3 hours
- **Phase 2** (Panel base): 2-3 hours
- **Phase 3** (Wavefunction): 4-5 hours
- **Phase 4** (Potential plot): 2-3 hours
- **Phase 5** (Overlays): 3-4 hours
- **Phase 6** (Interaction): 3-4 hours
- **Phase 7** (Visualizer): 2-3 hours
- **Testing & Integration**: 4-6 hours

**Total**: 22-31 hours of development time

---

## Testing Strategy

### Unit Tests (per panel)

```javascript
describe('WavefunctionPanel', () => {
  it('should render wavefunction to correct bounds', () => {
    const panel = new WavefunctionPanel({x: 0, y: 0, width: 512, height: 512}, {});
    const mockCtx = createMockContext();
    const mockSimulation = createMockSimulation();

    panel.render(mockCtx, mockSimulation, 0);

    expect(mockCtx.putImageData).toHaveBeenCalledWith(
      expect.any(ImageData),
      0, // bounds.x
      0  // bounds.y
    );
  });

  it('should convert canvas coords to grid coords correctly', () => {
    const panel = new WavefunctionPanel({x: 100, y: 50, width: 512, height: 512}, {});
    const gridCoords = panel.canvasToGrid(356, 306, 128);

    expect(gridCoords).toEqual({ x: 64, y: 64 }); // Center of 128x128 grid
  });
});
```

### Integration Tests

```javascript
describe('Visualizer', () => {
  it('should render all panels in correct order', () => {
    const canvas = createMockCanvas(800, 600);
    const simulation = createMockSimulation();
    const visualizer = new Visualizer(canvas, simulation);

    const renderSpy = jest.spyOn(visualizer.panels.wavefunction, 'render');
    visualizer.render();

    expect(renderSpy).toHaveBeenCalled();
  });

  it('should update panel bounds on resize', () => {
    const canvas = createMockCanvas(800, 600);
    const visualizer = new Visualizer(canvas, createMockSimulation());

    const oldBounds = visualizer.panels.wavefunction.bounds;
    canvas.width = 1024;
    canvas.height = 768;
    visualizer.resize();

    expect(visualizer.panels.wavefunction.bounds).not.toEqual(oldBounds);
  });
});
```

### Visual Regression Tests

Use Playwright or Puppeteer to capture screenshots:

```javascript
test('wavefunction panel renders correctly', async ({ page }) => {
  await page.goto('http://localhost:8000/test-panels.html');
  await page.waitForSelector('#quantum-canvas');

  const screenshot = await page.screenshot();
  expect(screenshot).toMatchSnapshot('wavefunction-initial.png');
});
```

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Create feature branch**: `feature/visualization-refactor`
3. **Start with Phase 1** (low risk, immediate benefit)
4. **Iterate phase by phase** with testing between each
5. **Create comparison tool** to validate new vs old rendering
6. **Document new API** as you build
7. **Add examples** of how to create custom panels

---

## Open Questions

1. **Should panels be able to communicate with each other?**
   - e.g., clicking wavefunction panel highlights corresponding point in plot
   - Could use event bus or observer pattern

2. **Should panels have lifecycle hooks?**
   - `onMount()`, `onUnmount()`, `onResize()`
   - Useful for initialization/cleanup

3. **Should panels support z-index/layering?**
   - Currently render order is fixed
   - Might want dynamic reordering (bring panel to front)

4. **Should coordinate systems be more abstract?**
   - Currently canvas pixels → local → grid/physical
   - Could use transformation matrices for more flexibility

5. **Should there be a panel registry/factory?**
   - For dynamically adding panels at runtime
   - Could support plugins/extensions

---

## Conclusion

This refactor transforms the visualization system from a monolithic, hard-to-modify structure into a flexible, maintainable, panel-based architecture. Each panel is self-contained, testable, and easy to understand. The new structure makes it trivial to:

- Add new visualizations (just create a new Panel subclass)
- Modify existing visualizations (edit one panel file)
- Reorder/resize/hide panels (change layout configuration)
- Add rich interactions (panel-specific mouse handling)
- Test components (unit test panels independently)

The panel-based approach follows software engineering best practices:
- **Single Responsibility**: Each panel does one thing
- **Open/Closed**: Open for extension (new panels), closed for modification
- **Dependency Inversion**: Panels depend on abstractions (Panel base class)
- **Separation of Concerns**: Rendering, interaction, layout are separate

This investment in architecture will pay dividends as the project grows and new features are added.
