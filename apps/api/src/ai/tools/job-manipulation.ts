import { z } from "zod";
import { tool } from "ai";
import { graphRepo, jobRepo } from "../../db/repos";
import { Cadence, JobScores, Phase } from "../../domain/schemas";

const JobPatchSchema = z
  .object({
    formulation: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    phase: Phase.optional(),
    cadence: Cadence.optional(),
    cadenceHint: z.string().nullable().optional(),
    whenText: z.string().nullable().optional(),
    want: z.string().nullable().optional(),
    soThat: z.string().nullable().optional(),
    suggestedNext: z.string().nullable().optional(),
    scoresJson: JobScores.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

const NewJobPayloadSchema = z.object({
  formulation: z.string().min(1),
  label: z.string().min(1),
  phase: Phase.optional(),
  cadence: Cadence.optional(),
  cadenceHint: z.string().nullable().optional(),
  whenText: z.string().nullable().optional(),
  want: z.string().nullable().optional(),
  soThat: z.string().nullable().optional(),
  suggestedNext: z.string().nullable().optional(),
  scoresJson: JobScores.nullable().optional(),
});

/**
 * Tool: job_update
 * Update an existing job's content or metadata
 */
export const jobUpdateTool = tool({
  description: "Update a job's formulation, label, phase, cadence, or notes. Use for edits or corrections.",
  parameters: z.object({
    jobId: z.string().describe("The job ID to update"),
    changes: JobPatchSchema.describe("Fields to update"),
  }),
  execute: async ({ jobId, changes }) => {
    const existing = jobRepo.findById(jobId);
    if (!existing) {
      return {
        success: false,
        error: `Job not found: ${jobId}`,
      };
    }

    const updated = jobRepo.update(jobId, changes);
    if (!updated) {
      return {
        success: false,
        error: "Failed to update job",
      };
    }

    return {
      success: true,
      jobId,
      job: updated,
      message: `Updated ${updated.level} job "${updated.label}"`,
    };
  },
});

/**
 * Tool: job_insert_after
 * Insert a new job after an existing one (same parent and level)
 */
export const jobInsertAfterTool = tool({
  description: "Insert a new job immediately after another job at the same level. Respects level limits (12 small, 6 micro).",
  parameters: z.object({
    afterJobId: z.string().describe("The job ID to insert after"),
    job: NewJobPayloadSchema.describe("New job details. Phase/cadence default to the target job if omitted."),
  }),
  execute: async ({ afterJobId, job }) => {
    const afterJob = jobRepo.findById(afterJobId);
    if (!afterJob) {
      return {
        success: false,
        error: `Job not found: ${afterJobId}`,
      };
    }

    const parentId = afterJob.parentId;
    const siblingCount = parentId
      ? jobRepo.countChildren(parentId)
      : jobRepo.findRootJobs(afterJob.graphId).length;

    const maxByLevel = afterJob.level === "small" ? 12 : afterJob.level === "micro" ? 6 : null;
    if (maxByLevel && siblingCount >= maxByLevel) {
      return {
        success: false,
        error: `Cannot add more than ${maxByLevel} ${afterJob.level} jobs under this parent`,
      };
    }

    const created = jobRepo.insertAfter(afterJobId, {
      graphId: afterJob.graphId,
      level: afterJob.level,
      parentId,
      formulation: job.formulation,
      label: job.label,
      phase: job.phase ?? afterJob.phase,
      cadence: job.cadence ?? afterJob.cadence,
      cadenceHint: job.cadenceHint ?? afterJob.cadenceHint ?? null,
      whenText: job.whenText ?? null,
      want: job.want ?? null,
      soThat: job.soThat ?? null,
      suggestedNext: job.suggestedNext ?? null,
      scoresJson: job.scoresJson ?? null,
    });

    return {
      success: true,
      newJobId: created.id,
      parentId: created.parentId ?? null,
      level: created.level,
      message: `Inserted ${created.level} job "${created.label}" after "${afterJob.label}"`,
    };
  },
});

/**
 * Tool: job_reorder
 * Reorder jobs under a parent (or root) using a full ID list
 */
export const jobReorderTool = tool({
  description: "Reorder jobs under the same parent. Provide all job IDs in the new order.",
  parameters: z.object({
    graphId: z.string().describe("Graph ID to scope the reorder"),
    parentId: z.string().nullable().optional().describe("Parent job ID (null for root-level reorder)"),
    jobIds: z.array(z.string()).min(1).describe("Job IDs in desired order"),
  }),
  execute: async ({ graphId, parentId = null, jobIds }) => {
    const graph = graphRepo.findById(graphId);
    if (!graph) {
      return {
        success: false,
        error: `Graph not found: ${graphId}`,
      };
    }

    const uniqueCount = new Set(jobIds).size;
    if (uniqueCount !== jobIds.length) {
      return {
        success: false,
        error: "jobIds must be unique",
      };
    }

    if (parentId) {
      const parentJob = jobRepo.findById(parentId);
      if (!parentJob || parentJob.graphId !== graphId) {
        return {
          success: false,
          error: `Parent job not found in graph: ${parentId}`,
        };
      }
    }

    const expectedJobs = parentId
      ? jobRepo.findByParentId(parentId)
      : jobRepo.findRootJobs(graphId);

    const expectedIds = new Set(expectedJobs.map((j) => j.id));
    const missingIds = Array.from(expectedIds).filter((id) => !jobIds.includes(id));
    if (missingIds.length > 0) {
      return {
        success: false,
        error: "jobIds must include all jobs under the target parent",
        missingJobIds: missingIds,
      };
    }

    const mismatchedParents = jobIds.filter((id) => {
      const job = jobRepo.findById(id);
      return !job || job.graphId !== graphId || (parentId ? job.parentId !== parentId : job.parentId !== null);
    });
    if (mismatchedParents.length > 0) {
      return {
        success: false,
        error: "All jobIds must belong to the same parent/graph",
        invalidJobIds: mismatchedParents,
      };
    }

    jobRepo.reorder(jobIds);

    return {
      success: true,
      parentId,
      jobCount: jobIds.length,
      message: `Reordered ${jobIds.length} jobs under ${parentId ?? "root"}`,
    };
  },
});
