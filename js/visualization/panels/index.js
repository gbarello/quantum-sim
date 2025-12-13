/**
 * @file index.js
 * @description Barrel export for all visualization panels.
 *
 * This file provides a convenient way to import all panel classes from a single
 * location. Instead of importing each panel individually, you can import them
 * all at once from this module.
 *
 * @author Quantum Playground Team
 * @version 1.0.0
 *
 * @example
 * // Import all panels at once
 * import {
 *     WavefunctionPanel,
 *     PotentialPlotPanel,
 *     GridOverlayPanel,
 *     MeasurementFeedbackPanel,
 *     MeasurementCirclePanel,
 *     PhaseWheelPanel
 * } from './visualization/panels/index.js';
 *
 * @example
 * // Or import specific panels
 * import { WavefunctionPanel, GridOverlayPanel } from './visualization/panels/index.js';
 */

// Core visualization panels
export { WavefunctionPanel } from './WavefunctionPanel.js';
export { PotentialPlotPanel } from './PotentialPlotPanel.js';

// Overlay panels
export { GridOverlayPanel } from './GridOverlayPanel.js';
export { MeasurementFeedbackPanel } from './MeasurementFeedbackPanel.js';
export { MeasurementCirclePanel } from './MeasurementCirclePanel.js';
export { PhaseWheelPanel } from './PhaseWheelPanel.js';
