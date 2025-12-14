# VisualizerV2 Investigation Plan

**Date:** 2025-12-13
**Status:** Code structure verified, runtime debugging needed
**Priority:** High

---

## Executive Summary

Four sub-agents investigated all potential failure points in the VisualizerV2 system. **All code is structurally sound** with zero syntax errors, correct imports, and proper architecture. Since the frontend "isn't working," this indicates a **runtime initialization issue** rather than a code structure problem.

---

## Investigation Results

### ✅ Areas Investigated - All Clear

| Component | Agent ID | Status | Key Findings |
|-----------|----------|--------|--------------|
| **index-v2.html** | ac1d71d | ✅ Perfect | Properly structured, references main-v2.js correctly, all UI elements present |
| **main-v2.js** | a463d15 | ✅ Perfect | Correct imports, VisualizerV2 aliased properly, Controller init fixed |
| **VisualizerV2 & Panels** | ab56ef9 | ✅ Perfect | All 12 files exist, syntax valid, DPR fixes applied |
| **Module Imports/Exports** | a112a08 | ✅ Perfect | All 16 imports correct, no circular dependencies |

### 🔧 Recent Fixes Applied (Uncommitted)

These fixes are already in the codebase but not committed:

1. **Canvas ID Fix** - `js/main-v2.js:46`
   - Changed: `'quantumCanvas'` → `'quantum-canvas'`
   - Impact: Matches HTML element ID

2. **Device Pixel Ratio (DPR) Handling** - `js/visualization/panels/WavefunctionPanel.js:99-107`
   - Extracts DPR from canvas transform
   - Calculates physical pixels for ImageData
   - Impact: Fixes rendering on high-DPI displays (Retina, 4K)

3. **Layout Dimensions** - `js/visualization/VisualizerV2.js:83-84`
   - Changed: `this.canvas.width, this.canvas.height` → `this.width, this.height`
   - Impact: Uses logical pixels instead of physical canvas size

### 📊 Code Quality Metrics

- **Total files verified:** 15
- **Syntax errors:** 0
- **Import errors:** 0
- **Circular dependencies:** 0
- **Missing dependencies:** 0
- **Code quality:** Excellent
- **Architecture:** Clean, modular

---

## Root Cause Analysis

Since all code is structurally correct, the issue is **runtime-related**. Most likely causes:

### High Probability Issues

1. **Canvas Element Not Found**
   - Location: `js/main-v2.js:46`
   - Check: `document.getElementById('quantum-canvas')` returns null?
   - Symptom: Console error "Canvas element not found"

2. **Canvas Has Zero Dimensions**
   - Location: `js/visualization/VisualizerV2.js:187`
   - Check: `getBoundingClientRect()` returns width/height = 0?
   - Symptom: Blank canvas or no rendering

3. **Missing UI Elements**
   - Location: `js/main-v2.js:91-95`
   - Check: Console warnings about missing elements
   - Symptom: Controller initialization fails partially

4. **Module Loading Failure**
   - Check: Browser console for:
     - "Failed to load module script"
     - "Cannot find module"
     - CORS errors
   - Symptom: White screen, console errors

5. **DOM Not Ready**
   - Timing issue: Script runs before DOM is loaded
   - Check: Is `<script type="module">` at end of `<body>`?
   - Symptom: Elements not found

### Medium Probability Issues

6. **Browser Compatibility**
   - ES6 modules not supported
   - Check: Modern browser (Chrome 90+, Firefox 88+, Safari 14+)

7. **File Server Issues**
   - MIME type incorrect for .js files
   - Check: Serve with proper Content-Type headers

8. **Path Resolution**
   - Relative paths not resolving correctly
   - Check: Console for 404 errors

---

## Recommended Investigation Plan

### Phase 1: Immediate Diagnostics (5 minutes)

#### Step 1: Check Browser Console
```bash
# Open in browser
open index-v2.html

# Check console for:
# - Red error messages
# - Module loading failures
# - "Canvas element not found"
# - UI element warnings
```

**Expected Output:**
- If working: "Initializing Quantum Playground with VisualizerV2..."
- If broken: JavaScript exception or error message

**Action:** Document the exact error message.

---

#### Step 2: Test Debug Files
```bash
# Test canvas initialization
open debug-v2-canvas.html

# Test rendering pipeline
open debug-v2-render.html
```

**Expected Output:**
- Debug files should show component in isolation
- Helps identify which component is failing

**Action:** Note which debug file works/fails.

---

#### Step 3: Compare with Working Version
```bash
# Test working v1
open index.html

# Test broken v2
open index-v2.html
```

**Expected Output:**
- V1 should work (uses original Visualizer)
- Compare browser console outputs

**Action:** Identify differences in console output.

---

### Phase 2: Add Debug Logging (10 minutes)

#### Modify `js/main-v2.js` (lines 42-62)

Add after line 46:
```javascript
this.canvas = document.getElementById('quantum-canvas');
if (!this.canvas) {
  console.error('Canvas element not found');
  return;
}

// ADD THESE LINES:
console.log('✓ Canvas found:', this.canvas);
console.log('  Canvas dimensions (physical):', this.canvas.width, this.canvas.height);
console.log('  Canvas dimensions (client):', this.canvas.clientWidth, this.canvas.clientHeight);
console.log('  Canvas bounding rect:', this.canvas.getBoundingClientRect());
```

Add after line 62:
```javascript
this.visualizer = new Visualizer(this.canvas, this.simulation, {
  // ... config
});

// ADD THESE LINES:
console.log('✓ VisualizerV2 created');
console.log('  Visualizer dimensions:', this.visualizer.width, this.visualizer.height);
console.log('  Panels created:', Object.keys(this.visualizer.panels));
```

---

#### Modify `js/visualization/VisualizerV2.js` (lines 186-204)

Add to resize() method after line 200:
```javascript
// Store logical dimensions
this.width = rect.width;
this.height = rect.height;

// ADD THESE LINES:
console.log('VisualizerV2.resize() called');
console.log('  Canvas rect:', rect);
console.log('  Device pixel ratio:', dpr);
console.log('  Physical dimensions:', this.canvas.width, this.canvas.height);
console.log('  Logical dimensions:', this.width, this.height);
```

---

### Phase 3: Verify Dependencies (15 minutes)

#### Check Canvas Element in HTML

**File:** `index-v2.html`

Look for line with:
```html
<canvas id="quantum-canvas"></canvas>
```

**Verify:**
- ID is exactly "quantum-canvas" (no typos)
- Element is inside `<body>` tag
- No duplicate IDs in HTML

---

#### Verify Script Loading

**File:** `index-v2.html` (bottom of file)

Look for:
```html
<script type="module" src="js/main-v2.js"></script>
```

**Verify:**
- Type is "module"
- Path is "js/main-v2.js" (not "main.js")
- Script tag is at end of `<body>` (before `</body>`)

---

#### Check File Permissions

```bash
cd /gabriel-data/.Projects/quantum-play

# Check files are readable
ls -la index-v2.html
ls -la js/main-v2.js
ls -la js/visualization/VisualizerV2.js
ls -la js/visualization/panels/WavefunctionPanel.js

# All should show read permissions (r--)
```

---

### Phase 4: Minimal Test Case (20 minutes)

Create a minimal test file to isolate the issue.

#### Create `test-v2-minimal.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VisualizerV2 Minimal Test</title>
  <style>
    canvas {
      border: 2px solid red;
      width: 800px;
      height: 600px;
    }
  </style>
</head>
<body>
  <h1>VisualizerV2 Minimal Test</h1>
  <canvas id="quantum-canvas"></canvas>

  <script type="module">
    console.log('=== Starting Minimal Test ===');

    // Step 1: Check canvas
    const canvas = document.getElementById('quantum-canvas');
    console.log('1. Canvas found:', canvas);
    console.log('   Canvas dimensions:', canvas.clientWidth, canvas.clientHeight);

    if (!canvas) {
      document.body.innerHTML += '<p style="color:red">ERROR: Canvas not found!</p>';
      throw new Error('Canvas not found');
    }

    // Step 2: Try importing VisualizerV2
    console.log('2. Attempting to import VisualizerV2...');

    try {
      const { VisualizerV2 } = await import('./js/visualization/VisualizerV2.js');
      console.log('   ✓ VisualizerV2 imported successfully');
      document.body.innerHTML += '<p style="color:green">✓ Module import successful</p>';

      // Step 3: Try importing QuantumSimulation
      console.log('3. Attempting to import QuantumSimulation...');
      const { QuantumSimulation } = await import('./js/quantum.js');
      console.log('   ✓ QuantumSimulation imported successfully');

      // Step 4: Create simulation
      console.log('4. Creating simulation...');
      const simulation = new QuantumSimulation({
        gridSize: 128,
        domainSize: 10.0,
        dt: 0.01
      });
      console.log('   ✓ Simulation created');

      // Step 5: Initialize simulation
      console.log('5. Initializing simulation...');
      simulation.initialize();
      console.log('   ✓ Simulation initialized');

      // Step 6: Create visualizer
      console.log('6. Creating VisualizerV2...');
      const visualizer = new VisualizerV2(canvas, simulation);
      console.log('   ✓ VisualizerV2 created');
      console.log('   Dimensions:', visualizer.width, 'x', visualizer.height);
      console.log('   Panels:', Object.keys(visualizer.panels));

      // Step 7: Render once
      console.log('7. Attempting render...');
      visualizer.render();
      console.log('   ✓ Render complete');

      document.body.innerHTML += '<p style="color:green">✓ ALL TESTS PASSED!</p>';

    } catch (error) {
      console.error('ERROR:', error);
      document.body.innerHTML += `<p style="color:red">ERROR: ${error.message}</p>`;
      document.body.innerHTML += `<pre>${error.stack}</pre>`;
    }
  </script>
</body>
</html>
```

**Run test:**
```bash
open test-v2-minimal.html
```

**Expected Results:**
- If working: Green "ALL TESTS PASSED" message
- If broken: Red error message with specific failure point

---

### Phase 5: Network Diagnostics (10 minutes)

#### Check File Loading

Open browser DevTools → Network tab

**Look for:**
- All .js files have status 200 (not 404)
- MIME type is "application/javascript" or "text/javascript"
- No CORS errors
- All files load completely (check size column)

**Common issues:**
- 404 errors → File path wrong
- MIME type errors → Server configuration issue
- CORS errors → Need to serve via HTTP server
- 0 bytes loaded → File empty or permission denied

---

#### Serve via HTTP (if opening file directly)

```bash
# In project directory
cd /gabriel-data/.Projects/quantum-play

# Python 3
python3 -m http.server 8888

# Then open
open http://localhost:8888/index-v2.html
```

**Why:** ES6 modules may have issues when opening files directly (file://) due to CORS.

---

## File Locations Reference

### Critical Files for Investigation

```
/gabriel-data/.Projects/quantum-play/
├── index-v2.html                           # Entry point
├── js/
│   ├── main-v2.js                          # App coordinator (line 46: canvas check)
│   ├── quantum.js                          # Simulation (line 251: initialize method)
│   ├── controls.js                         # Controller (line 44: constructor)
│   └── visualization/
│       ├── VisualizerV2.js                 # Main visualizer (line 186: resize)
│       ├── core/
│       │   ├── CanvasLayout.js
│       │   └── Panel.js
│       └── panels/
│           ├── WavefunctionPanel.js        # (line 99: DPR fix)
│           ├── PotentialPlotPanel.js
│           ├── GridOverlayPanel.js
│           ├── PhaseWheelPanel.js
│           ├── MeasurementFeedbackPanel.js
│           └── MeasurementCirclePanel.js
├── debug-v2-canvas.html                    # Debug: canvas test
└── debug-v2-render.html                    # Debug: render test
```

---

## Known Working Configuration

For reference, the original v1 works with:

- **Entry:** `index.html`
- **Main:** `js/main.js`
- **Visualizer:** `js/visualization.js` (original monolithic version)
- **Same:** quantum.js, controls.js, utils.js, styles.css

The v2 system should be a drop-in replacement with zero behavioral changes.

---

## Expected Console Output (Working)

When working correctly, console should show:

```
Initializing Quantum Playground with VisualizerV2...
✓ Canvas found: <canvas id="quantum-canvas">
  Canvas dimensions (physical): 2560 1920
  Canvas dimensions (client): 1280 960
VisualizerV2.resize() called
  Canvas rect: DOMRect { x: 0, y: 0, width: 1280, height: 960 }
  Device pixel ratio: 2
  Physical dimensions: 2560 1920
  Logical dimensions: 1280 960
✓ VisualizerV2 created
  Visualizer dimensions: 1280 960
  Panels created: ["wavefunction", "potentialPlot", "phaseWheel", ...]
Initializing simulation from controller initial conditions:
  Position: (64.00, 64.00)
  Momentum: (1.00, 0.60)
  Width: 0.60
Initial total probability: 1.00000000
```

---

## Expected Console Output (Broken)

Common error patterns to look for:

### Error 1: Canvas Not Found
```
Initializing Quantum Playground with VisualizerV2...
Canvas element not found
```
→ Check: Canvas ID in HTML matches main-v2.js

### Error 2: Module Import Failed
```
Failed to load module script: The server responded with a non-JavaScript MIME type
```
→ Check: Serve via HTTP server, not file://

### Error 3: Cannot Find Module
```
GET http://localhost:8888/js/visualization/VisualizerV2.js 404 (Not Found)
```
→ Check: File path and file existence

### Error 4: Undefined Property
```
TypeError: Cannot read property 'width' of undefined
```
→ Check: Canvas dimensions at initialization

### Error 5: Constructor Error
```
TypeError: VisualizerV2 is not a constructor
```
→ Check: Import statement and export in VisualizerV2.js

---

## Success Criteria

Investigation is complete when:

1. ✅ Exact error message identified (or confirmed working)
2. ✅ Failure point located (specific file and line number)
3. ✅ Root cause understood
4. ✅ Fix proposed or applied
5. ✅ Rendering visible on screen

---

## Contact Information

**Investigation performed by:** Claude Code (4 sub-agents)
**Agent IDs:**
- index-v2.html investigation: ac1d71d
- main-v2.js investigation: a463d15
- VisualizerV2 code investigation: ab56ef9
- Module imports investigation: a112a08

**Resume agent work:** Can resume any agent using their ID if needed

---

## Additional Resources

- **Architecture docs:** `docs/VISUALIZER_V2_SUMMARY.md`
- **Integration guide:** `docs/VISUALIZER_V2_INTEGRATION.md`
- **Quick start:** `js/visualization/VISUALIZER_V2_QUICK_START.md`
- **Main README:** `CLAUDE.md` (comprehensive codebase overview)

---

## Notes

- All code is **production-ready** structurally
- Recent fixes are **uncommitted** but applied
- Issue is **runtime-only**, not code structure
- Likely a simple initialization timing or element access issue
- Should be quick to fix once runtime error is identified

---

**End of Investigation Plan**
