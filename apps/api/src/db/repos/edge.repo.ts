import { db } from "../index";
import { BaseRepo } from "../repo";
import { Edge, EdgeType, type Edge as EdgeType_ } from "../../domain/schemas";

/**
 * Repository for Edge entities
 * Edges represent relationships between jobs
 */
export class EdgeRepo extends BaseRepo<EdgeType_> {
  constructor() {
    super(db, "edges", Edge);
  }

  /**
   * Find all edges for a graph
   */
  findByGraphId(graphId: string): EdgeType_[] {
    return this.findMany({ graphId } as Partial<EdgeType_>);
  }

  /**
   * Find edges originating from a job
   */
  findByFromId(fromId: string): EdgeType_[] {
    return this.findMany({ fromId } as Partial<EdgeType_>);
  }

  /**
   * Find edges pointing to a job
   */
  findByToId(toId: string): EdgeType_[] {
    return this.findMany({ toId } as Partial<EdgeType_>);
  }

  /**
   * Find edges by type within a graph
   */
  findByType(graphId: string, type: EdgeType): EdgeType_[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE graph_id = ? AND type = ?
    `;
    const rows = this.db.query(sql).all(graphId, type) as Record<string, unknown>[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Find edge between two specific jobs
   */
  findBetween(fromId: string, toId: string): EdgeType_ | null {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE from_id = ? AND to_id = ?
      LIMIT 1
    `;
    const row = this.db.query(sql).get(fromId, toId) as Record<string, unknown> | null;
    return row ? this.parseRow(row) : null;
  }

  /**
   * Check if an edge exists between two jobs
   */
  exists_between(fromId: string, toId: string): boolean {
    return this.findBetween(fromId, toId) !== null;
  }

  /**
   * Create edge if it doesn't exist
   */
  createIfNotExists(edge: Omit<EdgeType_, "id" | "createdAt">): EdgeType_ {
    const existing = this.findBetween(edge.fromId, edge.toId);
    if (existing) {
      return existing;
    }
    return this.create(edge);
  }

  /**
   * Bulk create edges
   */
  createMany(edges: Omit<EdgeType_, "id" | "createdAt">[]): EdgeType_[] {
    return this.transaction(() => {
      return edges.map((edge) => this.create(edge));
    });
  }

  /**
   * Delete all edges for a graph
   */
  deleteByGraphId(graphId: string): number {
    return this.deleteMany({ graphId } as Partial<EdgeType_>);
  }

  /**
   * Delete all edges involving a job (both directions)
   */
  deleteByJobId(jobId: string): number {
    const sql = `DELETE FROM ${this.tableName} WHERE from_id = ? OR to_id = ?`;
    const result = this.db.run(sql, [jobId, jobId]);
    return result.changes;
  }

  /**
   * Get job dependencies (jobs that must come before)
   */
  getDependencies(jobId: string): string[] {
    const sql = `
      SELECT from_id FROM ${this.tableName}
      WHERE to_id = ? AND type = 'depends_on'
    `;
    const rows = this.db.query(sql).all(jobId) as { from_id: string }[];
    return rows.map((r) => r.from_id);
  }

  /**
   * Get job dependents (jobs that depend on this one)
   */
  getDependents(jobId: string): string[] {
    const sql = `
      SELECT to_id FROM ${this.tableName}
      WHERE from_id = ? AND type = 'depends_on'
    `;
    const rows = this.db.query(sql).all(jobId) as { to_id: string }[];
    return rows.map((r) => r.to_id);
  }

  /**
   * Get next jobs in sequence
   */
  getNextJobs(jobId: string): string[] {
    const sql = `
      SELECT to_id FROM ${this.tableName}
      WHERE from_id = ? AND type = 'next'
    `;
    const rows = this.db.query(sql).all(jobId) as { to_id: string }[];
    return rows.map((r) => r.to_id);
  }
}

/** Singleton instance of EdgeRepo */
export const edgeRepo = new EdgeRepo();
