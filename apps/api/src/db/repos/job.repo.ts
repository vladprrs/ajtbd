import { db } from "../index";
import { BaseRepo } from "../repo";
import { Job, JobLevel, Phase, type Job as JobType } from "../../domain/schemas";

/**
 * Repository for Job entities
 * Extends BaseRepo with hierarchy and bulk operations
 */
export class JobRepo extends BaseRepo<JobType> {
  constructor() {
    super(db, "jobs", Job);
  }

  /**
   * Find all jobs belonging to a graph
   */
  findByGraphId(graphId: string): JobType[] {
    return this.findMany({ graphId } as Partial<JobType>, {
      orderBy: "sortOrder",
      orderDir: "ASC",
    });
  }

  /**
   * Find jobs by parent ID (direct children)
   */
  findByParentId(parentId: string): JobType[] {
    return this.findMany({ parentId } as Partial<JobType>, {
      orderBy: "sortOrder",
      orderDir: "ASC",
    });
  }

  /**
   * Find jobs by level within a graph
   */
  findByLevel(graphId: string, level: JobLevel): JobType[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE graph_id = ? AND level = ?
      ORDER BY sort_order ASC
    `;
    const rows = this.db.query(sql).all(graphId, level) as Record<string, unknown>[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Find jobs by phase within a graph
   */
  findByPhase(graphId: string, phase: Phase): JobType[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE graph_id = ? AND phase = ?
      ORDER BY sort_order ASC
    `;
    const rows = this.db.query(sql).all(graphId, phase) as Record<string, unknown>[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Find root jobs (big or core level, no parent)
   */
  findRootJobs(graphId: string): JobType[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE graph_id = ? AND parent_id IS NULL
      ORDER BY sort_order ASC
    `;
    const rows = this.db.query(sql).all(graphId) as Record<string, unknown>[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Bulk insert jobs (for AI-generated jobs)
   * Returns array of created jobs
   */
  createMany(jobs: Omit<JobType, "id" | "createdAt" | "updatedAt">[]): JobType[] {
    return this.transaction(() => {
      return jobs.map((job) => this.create(job));
    });
  }

  /**
   * Get the next sort order for a new job under a parent
   */
  getNextSortOrder(graphId: string, parentId: string | null): number {
    const sql = parentId
      ? `SELECT MAX(sort_order) as max_order FROM ${this.tableName} WHERE graph_id = ? AND parent_id = ?`
      : `SELECT MAX(sort_order) as max_order FROM ${this.tableName} WHERE graph_id = ? AND parent_id IS NULL`;

    const params = parentId ? [graphId, parentId] : [graphId];
    const result = this.db.query(sql).get(...params) as { max_order: number | null } | null;

    return (result?.max_order ?? -1) + 1;
  }

  /**
   * Reorder jobs by updating sort_order
   * @param jobIds Array of job IDs in desired order
   */
  reorder(jobIds: string[]): void {
    this.transaction(() => {
      jobIds.forEach((id, index) => {
        this.db.run(
          `UPDATE ${this.tableName} SET sort_order = ?, updated_at = ? WHERE id = ?`,
          [index, Date.now(), id]
        );
      });
    });
  }

  /**
   * Insert a job after another job (same parent level)
   */
  insertAfter(afterJobId: string, newJob: Omit<JobType, "id" | "createdAt" | "updatedAt" | "sortOrder">): JobType {
    return this.transaction(() => {
      const afterJob = this.findById(afterJobId);
      if (!afterJob) {
        throw new Error(`Job not found: ${afterJobId}`);
      }

      // Shift all subsequent jobs
      this.db.run(
        `UPDATE ${this.tableName}
         SET sort_order = sort_order + 1, updated_at = ?
         WHERE graph_id = ? AND parent_id ${afterJob.parentId ? '= ?' : 'IS NULL'} AND sort_order > ?`,
        afterJob.parentId
          ? [Date.now(), afterJob.graphId, afterJob.parentId, afterJob.sortOrder]
          : [Date.now(), afterJob.graphId, afterJob.sortOrder]
      );

      // Create new job with sort_order after the target
      return this.create({
        ...newJob,
        sortOrder: afterJob.sortOrder + 1,
      });
    });
  }

  /**
   * Count jobs by level within a graph
   */
  countByLevel(graphId: string, level: JobLevel): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE graph_id = ? AND level = ?`;
    const result = this.db.query(sql).get(graphId, level) as { count: number };
    return result.count;
  }

  /**
   * Count children of a job
   */
  countChildren(parentId: string): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE parent_id = ?`;
    const result = this.db.query(sql).get(parentId) as { count: number };
    return result.count;
  }

  /**
   * Get job with its children (one level deep)
   */
  findWithChildren(jobId: string): { job: JobType; children: JobType[] } | null {
    const job = this.findById(jobId);
    if (!job) return null;

    const children = this.findByParentId(jobId);
    return { job, children };
  }

  /**
   * Delete all jobs for a graph
   */
  deleteByGraphId(graphId: string): number {
    return this.deleteMany({ graphId } as Partial<JobType>);
  }

  /**
   * Get job hierarchy for a graph (organized by level)
   */
  getHierarchy(graphId: string): {
    big: JobType | null;
    core: JobType | null;
    small: JobType[];
    micro: Map<string, JobType[]>;
  } {
    const jobs = this.findByGraphId(graphId);

    const big = jobs.find((j) => j.level === "big") ?? null;
    const core = jobs.find((j) => j.level === "core") ?? null;
    const small = jobs.filter((j) => j.level === "small");
    const microJobs = jobs.filter((j) => j.level === "micro");

    // Group micro jobs by parent
    const micro = new Map<string, JobType[]>();
    for (const job of microJobs) {
      if (job.parentId) {
        const existing = micro.get(job.parentId) ?? [];
        existing.push(job);
        micro.set(job.parentId, existing);
      }
    }

    return { big, core, small, micro };
  }
}

/** Singleton instance of JobRepo */
export const jobRepo = new JobRepo();
