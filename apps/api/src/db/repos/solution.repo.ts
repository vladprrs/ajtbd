import { db } from "../index";
import { BaseRepo } from "../repo";
import { Solution, SolutionType, type Solution as SolutionType_ } from "../../domain/schemas";

/**
 * Repository for Solution entities
 * Solutions represent ways to accomplish a job
 */
export class SolutionRepo extends BaseRepo<SolutionType_> {
  constructor() {
    super(db, "solutions", Solution);
  }

  /**
   * Find all solutions for a job
   */
  findByJobId(jobId: string): SolutionType_[] {
    return this.findMany({ jobId } as Partial<SolutionType_>);
  }

  /**
   * Find solutions by type
   */
  findByType(type: SolutionType): SolutionType_[] {
    return this.findMany({ type } as Partial<SolutionType_>);
  }

  /**
   * Find solutions by actor
   */
  findByActorId(actorId: string): SolutionType_[] {
    return this.findMany({ actorId } as Partial<SolutionType_>);
  }

  /**
   * Bulk create solutions for a job
   */
  createMany(solutions: Omit<SolutionType_, "id" | "createdAt" | "updatedAt">[]): SolutionType_[] {
    return this.transaction(() => {
      return solutions.map((solution) => this.create(solution));
    });
  }

  /**
   * Delete all solutions for a job
   */
  deleteByJobId(jobId: string): number {
    return this.deleteMany({ jobId } as Partial<SolutionType_>);
  }

  /**
   * Count solutions for a job
   */
  countByJobId(jobId: string): number {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE job_id = ?`;
    const result = this.db.query(sql).get(jobId) as { count: number };
    return result.count;
  }

  /**
   * Check if a job has at least one solution
   */
  hasSolutions(jobId: string): boolean {
    return this.countByJobId(jobId) > 0;
  }

  /**
   * Get solutions grouped by type for a job
   */
  getByTypeForJob(jobId: string): Map<SolutionType, SolutionType_[]> {
    const solutions = this.findByJobId(jobId);
    const grouped = new Map<SolutionType, SolutionType_[]>();

    for (const solution of solutions) {
      const existing = grouped.get(solution.type) ?? [];
      existing.push(solution);
      grouped.set(solution.type, existing);
    }

    return grouped;
  }
}

/** Singleton instance of SolutionRepo */
export const solutionRepo = new SolutionRepo();
