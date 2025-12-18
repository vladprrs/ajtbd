import { jobRepo } from "../db/repos";
import type { Job } from "./schemas";

/**
 * Normalization change record
 */
export interface NormalizationChange {
  jobId: string;
  field: string;
  oldValue: string;
  newValue: string;
}

/**
 * Normalization result
 */
export interface NormalizationResult {
  normalized: boolean;
  changes: NormalizationChange[];
}

// Russian first-person prefix (canonical form)
const CANONICAL_PREFIX_RU = "Я хочу";
const CANONICAL_PREFIX_EN = "I want to";

// Patterns to normalize for Russian
const FORMULATION_NORMALIZE_RU: [RegExp, string][] = [
  [/^я хотел бы\s+/i, "Я хочу "],
  [/^мне нужно\s+/i, "Я хочу "],
  [/^мне необходимо\s+/i, "Я хочу "],
  [/^хочу\s+/i, "Я хочу "],
  [/^нужно\s+/i, "Я хочу "],
];

// Patterns to normalize for English
const FORMULATION_NORMALIZE_EN: [RegExp, string][] = [
  [/^i need to\s+/i, "I want to "],
  [/^i would like to\s+/i, "I want to "],
  [/^i'd like to\s+/i, "I want to "],
  [/^want to\s+/i, "I want to "],
  [/^need to\s+/i, "I want to "],
];

/**
 * Normalize formulation to canonical first-person prefix
 */
export function normalizeFormulation(formulation: string, language: string): string {
  let result = formulation.trim();
  const patterns = language === "ru" ? FORMULATION_NORMALIZE_RU : FORMULATION_NORMALIZE_EN;
  const canonicalPrefix = language === "ru" ? CANONICAL_PREFIX_RU : CANONICAL_PREFIX_EN;

  // Apply normalization patterns
  for (const [pattern, replacement] of patterns) {
    result = result.replace(pattern, replacement);
  }

  // Ensure starts with canonical prefix
  const lower = result.toLowerCase();
  const prefixLower = canonicalPrefix.toLowerCase();

  if (!lower.startsWith(prefixLower)) {
    // Add prefix if missing
    result = `${canonicalPrefix} ${result}`;
  } else {
    // Fix capitalization
    result = canonicalPrefix + result.slice(canonicalPrefix.length);
  }

  return result;
}

/**
 * Extract label from formulation (remove first-person prefix)
 */
export function extractLabel(formulation: string, language: string): string {
  const normalized = normalizeFormulation(formulation, language);
  const prefixes = language === "ru"
    ? ["я хочу ", "я хотел бы ", "мне нужно "]
    : ["i want to ", "i need to ", "i would like to "];

  let label = normalized;
  for (const prefix of prefixes) {
    if (label.toLowerCase().startsWith(prefix)) {
      label = label.slice(prefix.length);
      break;
    }
  }

  // Capitalize first letter
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Normalize label (ensure proper format)
 */
export function normalizeLabel(label: string, language: string): string {
  let result = label.trim();

  // Remove any first-person prefix that shouldn't be there
  const prefixes = language === "ru"
    ? ["я хочу ", "я хотел бы ", "мне нужно "]
    : ["i want to ", "i need to ", "i would like to "];

  for (const prefix of prefixes) {
    if (result.toLowerCase().startsWith(prefix)) {
      result = result.slice(prefix.length);
    }
  }

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  // Remove trailing period if present
  result = result.replace(/\.$/, "");

  return result;
}

/**
 * Normalize phase value
 */
export function normalizePhase(phase: string): "before" | "during" | "after" | "unknown" {
  const lower = phase.toLowerCase().trim();

  // Russian mappings
  if (["до", "перед", "before", "pre"].includes(lower)) return "before";
  if (["во время", "в процессе", "during", "while"].includes(lower)) return "during";
  if (["после", "завершение", "after", "post"].includes(lower)) return "after";

  return "unknown";
}

/**
 * Normalize cadence value
 */
export function normalizeCadence(cadence: string): "once" | "repeat" {
  const lower = cadence.toLowerCase().trim();

  if (["repeat", "повторяющийся", "регулярно", "recurring", "multiple"].includes(lower)) {
    return "repeat";
  }

  return "once";
}

/**
 * Normalize a single job
 */
export function normalizeJob(
  job: Partial<Job> & { formulation: string; label: string },
  language: string
): { formulation: string; label: string; phase?: "before" | "during" | "after" | "unknown"; cadence?: "once" | "repeat" } {
  return {
    formulation: normalizeFormulation(job.formulation, language),
    label: normalizeLabel(job.label, language),
    ...(job.phase && { phase: normalizePhase(job.phase) }),
    ...(job.cadence && { cadence: normalizeCadence(job.cadence) }),
  };
}

/**
 * Apply normalization to all jobs in a graph
 */
export function normalizeGraph(graphId: string, language: string = "ru"): NormalizationResult {
  const jobs = jobRepo.findByGraphId(graphId);
  const changes: NormalizationChange[] = [];

  for (const job of jobs) {
    const updates: Partial<Job> = {};

    // Normalize formulation
    const normalizedFormulation = normalizeFormulation(job.formulation, language);
    if (normalizedFormulation !== job.formulation) {
      changes.push({
        jobId: job.id,
        field: "formulation",
        oldValue: job.formulation,
        newValue: normalizedFormulation,
      });
      updates.formulation = normalizedFormulation;
    }

    // Normalize label
    const normalizedLabel = normalizeLabel(job.label, language);
    if (normalizedLabel !== job.label) {
      changes.push({
        jobId: job.id,
        field: "label",
        oldValue: job.label,
        newValue: normalizedLabel,
      });
      updates.label = normalizedLabel;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      jobRepo.update(job.id, updates);
    }
  }

  return {
    normalized: changes.length > 0,
    changes,
  };
}

/**
 * Auto-fix common issues during normalization
 */
export function autofixGraph(graphId: string, language: string = "ru"): NormalizationResult {
  // First normalize
  const normResult = normalizeGraph(graphId, language);

  // Additional fixes could be added here:
  // - Split jobs with "and"
  // - Set unknown phases based on context
  // - Add missing scores

  return normResult;
}
