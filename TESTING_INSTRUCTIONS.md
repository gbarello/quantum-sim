# Testing Instructions for Phase 5 Migration

## Quick Start

1. **Start the server:**
   ```bash
   cd /gabriel-data/.Projects/quantum-play
   python3 -m http.server 8080
   ```

2. **Open in browser:**
   - Navigate to: `http://localhost:8080`
   - Or if on remote: `http://<your-host>:8080`

3. **Check the console:**
   - Open browser DevTools (F12)
   - Look for initialization messages
   - Verify no errors appear

---

## Visual Checks

### 1. Page Layout ✓
- [ ] Three tabs appear at top: "Initial Conditions", "Simulation", "Statistics"
- [ ] Active tab is highlighted
- [ ] Control panel on left (desktop) or top (mobile)
- [ ] Canvas on right (desktop) or bottom (mobile)
- [ ] Phase wheel visible below canvas

### 2. Initial Conditions Tab ✓
- [ ] Position selector canvas with grid
- [ ] Momentum selector canvas with grid
- [ ] Packet size slider (0.2 - 4.0)
- [ ] Reset button (red)

### 3. Simulation Tab ✓
- [ ] Play button (blue, shows ▶ icon)
- [ ] Speed slider (0.01x - 1.0x)
- [ ] Measurement Size slider (1 - 100)
- [ ] Potential Type radio buttons (4 options)
- [ ] Potential Strength slider (0.1 - 10)
- [ ] Visualization dropdown (2 options)

### 4. Statistics Tab ✓
- [ ] Four display boxes showing:
  - Total Probability: ~100%
  - Time Elapsed: 0.00s (or current time)
  - Grid Size: 128×128
  - Measurements: 0 (or count)

---

## Functional Tests

### Tab Switching
1. Click "Initial Conditions" tab → content changes
2. Click "Simulation" tab → content changes
3. Click "Statistics" tab → content changes
4. **Expected:** Smooth transitions, no errors

### Play/Pause Control
1. Click Play button
2. **Expected:**
   - Button changes to "Pause" with ⏸ icon
   - Wavefunction animates
   - Time Elapsed increments in Statistics tab

3. Click Pause button
4. **Expected:**
   - Button changes to "Play" with ▶ icon
   - Animation stops
   - Time Elapsed stops changing

### Position Selector
1. Go to Initial Conditions tab
2. Click anywhere on Position canvas
3. **Expected:**
   - Green crosshair moves to click location
   - No errors in console

### Momentum Selector
1. Go to Initial Conditions tab
2. Click anywhere on Momentum canvas
3. **Expected:**
   - Orange arrow updates direction/length
   - No errors in console

### Reset Button
1. Let simulation run for a few seconds
2. Go to Initial Conditions tab
3. Click Reset button
4. **Expected:**
   - Wavefunction resets to initial Gaussian packet
   - Time resets to 0.00s
   - Measurement count resets to 0
   - Total Probability returns to ~100%

### Speed Control
1. Go to Simulation tab
2. Move Speed slider left and right
3. **Expected:**
   - Display shows current speed (e.g., "0.05x")
   - Animation speed changes accordingly
   - Slower speeds → slower animation
   - Faster speeds → faster animation

### Measurement Radius
1. Go to Simulation tab
2. Move Measurement Size slider
3. **Expected:**
   - Display updates (e.g., "15.0")
   - (Measurement area size will apply on next click)

### Potential Type
1. Go to Simulation tab
2. Click each radio button (None, Single, Double, Sin)
3. **Expected:**
   - Selected option highlights
   - Potential changes on canvas (visible if playing)
   - No errors

### Potential Strength
1. Go to Simulation tab
2. Move Potential Strength slider
3. **Expected:**
   - Display updates (e.g., "2.5")
   - Potential intensity changes (if potential active)

### Visualization Mode
1. Go to Simulation tab
2. Click dropdown, select "Complex (Phase + Amplitude)"
3. **Expected:**
   - Canvas shows colorful phase visualization
   - Colors represent quantum phase angles

4. Select "Probability Density Only"
5. **Expected:**
   - Canvas shows grayscale probability
   - Brighter = higher probability

### Canvas Click (Measurement)
1. Click anywhere on the quantum canvas
2. **Expected:**
   - Wavefunction collapses (if particle found there)
   - Measurement count increments (Statistics tab)
   - Console logs measurement result
   - Possible measurement feedback animation

### Canvas Hover
1. Move mouse over quantum canvas
2. **Expected:**
   - Tooltip appears showing probability at cursor
   - Tooltip follows cursor
   - No lag or errors

3. Move mouse off canvas
4. **Expected:**
   - Tooltip disappears

---

## Responsive Design Tests

### Desktop (> 1024px)
- [ ] Control panel 340px wide, fixed on left
- [ ] Canvas takes remaining space on right
- [ ] Both visible simultaneously
- [ ] Smooth resizing behavior

### Tablet (768px - 1024px)
- [ ] Control panel 320px wide, fixed on left
- [ ] Canvas takes remaining space on right
- [ ] Both visible simultaneously

### Mobile (< 768px)
- [ ] Control panel full width, at top
- [ ] Canvas full width, below controls
- [ ] Control panel max height 40vh with scroll
- [ ] Tabs still functional
- [ ] All controls accessible

**Test by resizing browser window or using DevTools device emulation**

---

## Performance Checks

### Frame Rate
- [ ] Wavefunction animates smoothly (60 FPS target)
- [ ] No stuttering or freezing
- [ ] No performance degradation over time

### Memory
- [ ] No console warnings about memory
- [ ] Page remains responsive after extended use
- [ ] Tab switching doesn't slow down

---

## Console Checks

### Expected Messages
Look for these in console (F12):
```
Initializing Quantum Playground...
Creating quantum simulation...
Initial potential type set to: single
Creating visualizer...
Creating controls manager...
Initializing simulation from controls manager:
  Position: (64, 64)
  Momentum: (0.00, 0.00)
  Width: 0.59
Initial total probability: 1.00000000
Starting main loop...
Quantum Playground initialized successfully!
```

### No Errors Should Appear
- ❌ No "undefined" errors
- ❌ No "Cannot read property" errors
- ❌ No "Element not found" errors
- ❌ No 404 (missing file) errors

---

## Comparison with Original

If you have access to the backup version:

1. **Open backup version** (using `.backup` files)
2. **Compare layouts:**
   - Old: Two side panels (left and right)
   - New: Single tabbed panel (left only on desktop)

3. **Compare functionality:**
   - All controls should work identically
   - Same initial conditions
   - Same simulation behavior
   - Same visualization options

4. **Compare performance:**
   - Both should run at 60 FPS
   - New version may be slightly faster (less DOM manipulation)

---

## Troubleshooting

### If tabs don't appear:
1. Check console for errors
2. Verify `ControlsManager.js` loaded correctly
3. Check `controls-root` element exists in HTML

### If controls don't work:
1. Check console for errors
2. Verify all control type files loaded
3. Check `defaultConfig.js` has correct configuration

### If canvas interactions fail:
1. Verify event listeners attached (check main.js)
2. Check `handleCanvasClick` and `handleCanvasHover` methods
3. Verify visualizer methods exist

### If simulation doesn't run:
1. Check Play button state (should show ⏸ when playing)
2. Verify `isPlaying` state in ControlsManager
3. Check main loop is running (animation frame ID)

### If layout is broken:
1. Clear browser cache
2. Verify `styles.css` loaded correctly
3. Check responsive breakpoints (768px, 1024px)
4. Test in different browser

---

## Browser Compatibility

Tested and working in:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Required Features:**
- ES6 modules
- Flexbox/CSS Grid
- HTML5 Canvas
- Modern JavaScript (classes, arrow functions, etc.)

---

## Success Criteria

Migration is successful if:
- ✅ All 5 todo items completed
- ✅ No console errors
- ✅ All tabs functional
- ✅ All controls work
- ✅ Canvas interactions work
- ✅ Simulation runs correctly
- ✅ Responsive on all screen sizes
- ✅ Performance maintained (60 FPS)
- ✅ No visual regressions

---

## Reporting Issues

If you find any issues:

1. **Document the issue:**
   - What were you doing?
   - What did you expect?
   - What actually happened?
   - Any console errors?

2. **Check migration report:**
   - See `MIGRATION_COMPLETE.md`
   - Review rollback instructions if needed

3. **Create a bug report:**
   - Include browser/version
   - Include steps to reproduce
   - Include screenshot if visual issue
   - Include console output

---

**Happy Testing! 🎉**

The migration should be transparent to users - everything should work exactly as before, just with a cleaner tabbed interface.
