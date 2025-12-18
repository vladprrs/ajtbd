/**
 * Domain module exports
 */

// Schemas
export * from "./schemas";

// Validation
export { validateGraph, isGraphValid, type ValidationResult, type ValidationError } from "./validation";

// Normalization
export {
  normalizeFormulation,
  normalizeLabel,
  normalizeJob,
  normalizeGraph,
  autofixGraph,
  extractLabel,
  type NormalizationResult,
  type NormalizationChange,
} from "./normalization";

// Graph Views
export {
  generateUIv1View,
  generateMermaidView,
  generateView,
  type UIv1View,
  type JobWithMicros,
  type ViewMode,
} from "./graph-views";
