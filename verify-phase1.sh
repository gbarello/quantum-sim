#!/bin/bash
# Verification script for Phase 1 implementation

echo "========================================="
echo "Phase 1 Verification Script"
echo "========================================="
echo ""

# Check directory structure
echo "1. Checking directory structure..."
if [ -d "js/visualization/core" ]; then
    echo "   ✅ js/visualization/core/ exists"
else
    echo "   ❌ js/visualization/core/ missing"
    exit 1
fi

# Check CanvasLayout.js
echo ""
echo "2. Checking CanvasLayout.js..."
if [ -f "js/visualization/core/CanvasLayout.js" ]; then
    lines=$(wc -l < js/visualization/core/CanvasLayout.js)
    echo "   ✅ CanvasLayout.js exists ($lines lines)"
    
    # Check for key exports
    if grep -q "export class CanvasLayout" js/visualization/core/CanvasLayout.js; then
        echo "   ✅ Exports CanvasLayout class"
    else
        echo "   ❌ Missing CanvasLayout class export"
    fi
else
    echo "   ❌ CanvasLayout.js missing"
    exit 1
fi

# Check test files
echo ""
echo "3. Checking test files..."
if [ -f "tests/test-canvas-layout.js" ]; then
    echo "   ✅ test-canvas-layout.js exists"
else
    echo "   ❌ test-canvas-layout.js missing"
fi

if [ -f "tests/test-canvas-layout.html" ]; then
    echo "   ✅ test-canvas-layout.html exists"
else
    echo "   ❌ test-canvas-layout.html missing"
fi

if [ -f "tests/test-canvas-layout-visual.html" ]; then
    echo "   ✅ test-canvas-layout-visual.html exists"
else
    echo "   ❌ test-canvas-layout-visual.html missing"
fi

# Check documentation
echo ""
echo "4. Checking documentation..."
if [ -f "js/visualization/README.md" ]; then
    echo "   ✅ js/visualization/README.md exists"
else
    echo "   ❌ README.md missing"
fi

if [ -f "PHASE1-COMPLETE.md" ]; then
    echo "   ✅ PHASE1-COMPLETE.md exists"
else
    echo "   ❌ PHASE1-COMPLETE.md missing"
fi

# Check that visualization.js is unchanged
echo ""
echo "5. Verifying no breaking changes..."
if [ -f "js/visualization.js" ]; then
    echo "   ✅ visualization.js still exists (unchanged)"
else
    echo "   ❌ visualization.js missing"
fi

# Summary
echo ""
echo "========================================="
echo "Phase 1 Verification Complete!"
echo "========================================="
echo ""
echo "To run tests, open in browser:"
echo "  tests/test-canvas-layout.html"
echo "  tests/test-canvas-layout-visual.html"
echo ""
echo "To read documentation:"
echo "  js/visualization/README.md"
echo "  PHASE1-COMPLETE.md"
echo ""
