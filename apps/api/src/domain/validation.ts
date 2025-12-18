import { jobRepo, solutionRepo } from "../db/repos";
import type { Job, Graph } from "./schemas";

/**
 * Validation error with context
 */
export interface ValidationError {
  code: string;
  message: string;
  jobId?: string;
  field?: string;
  severity: "error" | "warning";
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalJobs: number;
    smallJobCount: number;
    microJobCounts: Record<string, number>;
    jobsWithSolutions: number;
    jobsWithScores: number;
  };
}

// Russian first-person prefixes
const FORMULATION_PREFIXES_RU = [
  "я хочу",
  "я хотел бы",
  "мне нужно",
  "мне необходимо",
];

// English first-person prefixes
const FORMULATION_PREFIXES_EN = [
  "i want to",
  "i need to",
  "i would like to",
];

/**
 * Check if formulation starts with first-person prefix
 */
function hasValidFormulationPrefix(formulation: string, language: string): boolean {
  const lower = formulation.toLowerCase().trim();
  const prefixes = language === "ru" ? FORMULATION_PREFIXES_RU : FORMULATION_PREFIXES_EN;
  return prefixes.some((prefix) => lower.startsWith(prefix));
}

/**
 * Check if label is an infinitive (doesn't start with "I want" etc.)
 */
function hasValidLabelFormat(label: string, language: string): boolean {
  const lower = label.toLowerCase().trim();

  // Should NOT start with first-person prefix
  const prefixes = language === "ru" ? FORMULATION_PREFIXES_RU : FORMULATION_PREFIXES_EN;
  if (prefixes.some((prefix) => lower.startsWith(prefix))) {
    return false;
  }

  // Should start with a verb (basic check - first word capitalized or lowercase verb)
  // For Russian: infinitives often end in -ть, -ти, -чь
  // For English: should be action verb
  if (label.trim().length === 0) {
    return false;
  }

  return true;
}

/**
 * Check if job contains "and" indicating multiple actions
 */
function hasMultipleActions(text: string, language: string): boolean {
  const lower = text.toLowerCase();

  if (language === "ru") {
    // Russian conjunctions that indicate multiple actions
    return / и /.test(lower) || / а также /.test(lower) || /, а /.test(lower);
  } else {
    // English
    return / and /.test(lower) || / & /.test(lower);
  }
}

/**
 * Validate a single job
 */
function validateJob(job: Job, language: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check formulation prefix
  if (!hasValidFormulationPrefix(job.formulation, language)) {
    errors.push({
      code: "INVALID_FORMULATION",
      message: `Formulation must start with first-person prefix (e.g., "${language === "ru" ? "Я хочу" : "I want to"}")`,
      jobId: job.id,
      field: "formulation",
      severity: "error",
    });
  }

  // Check label format
  if (!hasValidLabelFormat(job.label, language)) {
    errors.push({
      code: "INVALID_LABEL",
      message: "Label should be an infinitive verb without first-person prefix",
      jobId: job.id,
      field: "label",
      severity: "error",
    });
  }

  // Check for multiple actions
  if (hasMultipleActions(job.formulation, language)) {
    errors.push({
      code: "MULTIPLE_ACTIONS",
      message: "Job should contain only one action (no 'and')",
      jobId: job.id,
      field: "formulation",
      severity: "warning",
    });
  }

  // Check phase is valid
  if (job.phase === "unknown") {
    errors.push({
      code: "UNKNOWN_PHASE",
      message: "Phase should be 'before', 'during', or 'after'",
      jobId: job.id,
      field: "phase",
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate job count constraints
 */
function validateJobCounts(
  jobs: Job[],
  level: "small" | "micro",
  parentId: string | null,
  min: number,
  max: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  const filtered = jobs.filter((j) =>
    j.level === level &&
    (parentId === null ? j.parentId === null : j.parentId === parentId)
  );

  if (filtered.length < min) {
    errors.push({
      code: `TOO_FEW_${level.toUpperCase()}_JOBS`,
      message: `Expected at least ${min} ${level} jobs, found ${filtered.length}`,
      severity: "warning",
    });
  }

  if (filtered.length > max) {
    errors.push({
      code: `TOO_MANY_${level.toUpperCase()}_JOBS`,
      message: `Expected at most ${max} ${level} jobs, found ${filtered.length}`,
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate an entire graph
 */
export function validateGraph(graphId: string, language: string = "ru"): ValidationResult {
  const jobs = jobRepo.findByGraphId(graphId);
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Stats
  const stats = {
    totalJobs: jobs.length,
    smallJobCount: 0,
    microJobCounts: {} as Record<string, number>,
    jobsWithSolutions: 0,
    jobsWithScores: 0,
  };

  // Validate each job
  for (const job of jobs) {
    const jobErrors = validateJob(job, language);
    for (const err of jobErrors) {
      if (err.severity === "error") {
        errors.push(err);
      } else {
        warnings.push(err);
      }
    }

    // Check solutions
    const solutionCount = solutionRepo.countByJobId(job.id);
    if (solutionCount > 0) {
      stats.jobsWithSolutions++;
    }

    // Check scores
    if (job.scoresJson) {
      stats.jobsWithScores++;
    }

    // Count by level
    if (job.level === "small") {
      stats.smallJobCount++;
    } else if (job.level === "micro" && job.parentId) {
      stats.microJobCounts[job.parentId] = (stats.microJobCounts[job.parentId] || 0) + 1;
    }
  }

  // Validate small job count (8-12)
  const smallJobErrors = validateJobCounts(jobs, "small", null, 8, 12);
  for (const err of smallJobErrors) {
    warnings.push(err);
  }

  // Validate micro job counts per small job (3-6)
  const smallJobs = jobs.filter((j) => j.level === "small");
  for (const smallJob of smallJobs) {
    const microErrors = validateJobCounts(jobs, "micro", smallJob.id, 3, 6);
    for (const err of microErrors) {
      err.jobId = smallJob.id;
      warnings.push(err);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

/**
 * Quick validation check (just errors, no warnings)
 */
export function isGraphValid(graphId: string, language: string = "ru"): boolean {
  const result = validateGraph(graphId, language);
  return result.valid;
}
