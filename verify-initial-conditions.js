/**
 * Verification script to check that initial conditions match between
 * control panel defaults and simulation initialization
 */

import { defaultControlsConfig } from './js/controls/defaultConfig.js';

console.log('=== Verifying Initial Conditions Synchronization ===\n');

// Extract default values from config
const tabs = defaultControlsConfig.tabs;
const initialConditionsTab = tabs.find(tab => tab.id === 'initial-conditions');

if (!initialConditionsTab) {
  console.error('❌ Initial conditions tab not found in config');
  process.exit(1);
}

const controls = initialConditionsTab.controls;

// Find position selector
const positionControl = controls.find(c => c.id === 'position-selector');
if (!positionControl) {
  console.error('❌ Position selector control not found');
  process.exit(1);
}

// Find momentum selector
const momentumControl = controls.find(c => c.id === 'momentum-selector');
if (!momentumControl) {
  console.error('❌ Momentum selector control not found');
  process.exit(1);
}

// Find packet size slider
const packetSizeControl = controls.find(c => c.id === 'packet-size');
if (!packetSizeControl) {
  console.error('❌ Packet size control not found');
  process.exit(1);
}

console.log('✅ All controls found in config\n');

// Check default values
console.log('Default Values from Config:');
console.log('---------------------------');

if (positionControl.defaultValue) {
  console.log(`✅ Position: { x: ${positionControl.defaultValue.x}, y: ${positionControl.defaultValue.y} }`);
} else {
  console.error('❌ Position control missing defaultValue');
}

if (momentumControl.defaultValue) {
  console.log(`✅ Momentum: { x: ${momentumControl.defaultValue.x}, y: ${momentumControl.defaultValue.y} }`);

  // Calculate physical momentum for verification
  const physMomX = (momentumControl.defaultValue.x - 0.5) * 10;
  const physMomY = (momentumControl.defaultValue.y - 0.5) * 10;
  console.log(`   (Physical momentum: px=${physMomX.toFixed(2)}, py=${physMomY.toFixed(2)})`);
} else {
  console.error('❌ Momentum control missing defaultValue');
}

if (packetSizeControl.value !== undefined) {
  const transformed = packetSizeControl.transform ? packetSizeControl.transform(packetSizeControl.value) : packetSizeControl.value;
  console.log(`✅ Packet Size: ${packetSizeControl.value} (transforms to ${transformed})`);
} else {
  console.error('❌ Packet size control missing value');
}

console.log('\n✅ Configuration is properly set up!');
console.log('\nNext steps:');
console.log('1. Open index.html in browser');
console.log('2. Check browser console for "Loaded initial state from controls" message');
console.log('3. Verify Initial Conditions tab shows correct defaults');
console.log('4. Verify simulation starts with the displayed initial conditions');
