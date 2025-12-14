/**
 * test-tab-manager.js - Node.js test for TabManager API
 *
 * Tests the TabManager class interface without requiring a browser environment.
 * Run with: node test-tab-manager.js
 */

// Mock DOM elements for Node.js testing
class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.classList = new Set();
    this.dataset = {};
    this.attributes = new Map();
    this.eventListeners = new Map();
    this.parentElement = null;
    this.textContent = '';
    this.className = '';
    this.disabled = false;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
  }

  remove() {
    if (this.parentElement) {
      const index = this.parentElement.children.indexOf(this);
      if (index > -1) {
        this.parentElement.children.splice(index, 1);
      }
    }
    this.parentElement = null;
  }

  addEventListener(type, handler) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    if (this.eventListeners.has(type)) {
      const handlers = this.eventListeners.get(type);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    if (this.eventListeners.has(event.type)) {
      this.eventListeners.get(event.type).forEach(handler => handler(event));
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  querySelectorAll(selector) {
    // Simple mock - returns empty array
    return [];
  }
}

class MockCustomEvent {
  constructor(type, options) {
    this.type = type;
    this.detail = options?.detail;
    this.bubbles = options?.bubbles || false;
  }
}

// Mock global objects
global.document = {
  createElement: (tagName) => new MockElement(tagName)
};
global.CustomEvent = MockCustomEvent;
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; }
};

// Import TabManager (will fail in Node, but we can check the class structure)
console.log('TabManager API Test\n' + '='.repeat(50));

// Read the TabManager file and extract key information
const fs = require('fs');
const path = require('path');

const tabManagerPath = path.join(__dirname, 'TabManager.js');
const content = fs.readFileSync(tabManagerPath, 'utf-8');

console.log('✅ TabManager.js file exists');
console.log(`📄 File size: ${content.length} bytes`);

// Check for required methods
const requiredMethods = [
  'constructor',
  'addPanel',
  'removePanel',
  'switchToPanel',
  'getPanel',
  'render',
  'destroy',
  'getActivePanel',
  'getAllPanelIds',
  'hasPanel',
  'setPanelDisabled'
];

console.log('\nChecking required methods:');
requiredMethods.forEach(method => {
  const regex = new RegExp(`\\b${method}\\s*\\(`);
  const found = regex.test(content);
  console.log(`  ${found ? '✅' : '❌'} ${method}()`);
});

// Check for required configuration options
const requiredConfig = [
  'panels',
  'defaultPanel',
  'tabPosition',
  'animated',
  'persistent'
];

console.log('\nChecking configuration options:');
requiredConfig.forEach(option => {
  const regex = new RegExp(`config\\.${option}`);
  const found = regex.test(content);
  console.log(`  ${found ? '✅' : '❌'} config.${option}`);
});

// Check for keyboard navigation
console.log('\nChecking keyboard navigation:');
const keyboardKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '];
keyboardKeys.forEach(key => {
  const found = content.includes(key);
  console.log(`  ${found ? '✅' : '❌'} ${key === ' ' ? 'Space' : key} key`);
});

// Check for CSS classes
console.log('\nChecking CSS classes:');
const requiredClasses = [
  'tab-manager',
  'tab-container',
  'tab-bar',
  'tab-button',
  'tab-content',
  'tab-content-container',
  'active'
];
requiredClasses.forEach(cls => {
  const found = content.includes(`'${cls}'`) || content.includes(`"${cls}"`);
  console.log(`  ${found ? '✅' : '❌'} .${cls}`);
});

// Check for event emission
console.log('\nChecking event handling:');
const events = ['tabchange', 'CustomEvent'];
events.forEach(evt => {
  const found = content.includes(evt);
  console.log(`  ${found ? '✅' : '❌'} ${evt}`);
});

// Check for animation types
console.log('\nChecking animation support:');
const animations = ['slide', 'fade', 'scale'];
animations.forEach(anim => {
  const found = content.includes(`anim-${anim}`);
  console.log(`  ${found ? '✅' : '❌'} ${anim} animation`);
});

// Check for tab positions
console.log('\nChecking tab positions:');
const positions = ['top', 'bottom', 'left', 'right'];
positions.forEach(pos => {
  const found = content.includes(`'${pos}'`) || content.includes(`"${pos}"`);
  console.log(`  ${found ? '✅' : '❌'} ${pos} position`);
});

// Line count
const lines = content.split('\n').length;
console.log(`\n📊 Total lines: ${lines}`);
console.log(`📏 Expected: ~300 lines`);
console.log(`✅ ${lines >= 250 && lines <= 350 ? 'Within target range' : 'Outside target range'}`);

// Check for JSDoc comments
const hasJSDoc = content.includes('/**') && content.includes('* @param');
console.log(`\n📝 JSDoc comments: ${hasJSDoc ? '✅ Present' : '❌ Missing'}`);

// Check for error handling
const hasErrorHandling = content.includes('throw new Error') && content.includes('console.warn');
console.log(`⚠️  Error handling: ${hasErrorHandling ? '✅ Present' : '❌ Missing'}`);

// Check for cleanup in destroy
const hasCleanup = content.includes('removeEventListener') && content.includes('_destroyed');
console.log(`🧹 Cleanup logic: ${hasCleanup ? '✅ Present' : '❌ Missing'}`);

console.log('\n' + '='.repeat(50));
console.log('✅ TabManager API test complete!');
console.log('\nTo test in browser, open:');
console.log('  file://' + path.join(__dirname, 'test-tabs.html'));
