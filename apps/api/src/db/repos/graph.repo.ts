import { db } from "../index";
import { BaseRepo } from "../repo";
import { Graph, type Graph as GraphType } from "../../domain/schemas";

/**
 * Repository for Graph entities
 * Extends BaseRepo with graph-specific query methods
 */
export class GraphRepo extends BaseRepo<GraphType> {
  constructor() {
    super(db, "graphs", Graph);
  }

  /**
   * Find graphs by segment (case-insensitive search within inputJson)
   * Searches the segment field inside the input_json column
   */
  findBySegment(segment: string): GraphType[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE json_extract(input_json, '$.segment') LIKE ?
      ORDER BY updated_at DESC
    `;
    const pattern = `%${segment}%`;
    const rows = this.db.query(sql).all(pattern) as Record<string, unknown>[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Find most recently updated graphs
   * @param limit Number of graphs to return (default: 10)
   */
  findRecent(limit: number = 10): GraphType[] {
    return this.findMany(undefined, {
      orderBy: "updatedAt",
      orderDir: "DESC",
      limit,
    });
  }

  /**
   * Touch the updated_at timestamp without changing other fields
   */
  updateTimestamp(id: string): void {
    const sql = `UPDATE ${this.tableName} SET updated_at = ? WHERE id = ?`;
    this.db.run(sql, [Date.now(), id]);
  }

  /**
   * Find graphs by coreJobId
   */
  findByCoreJobId(coreJobId: string): GraphType | null {
    return this.findFirst({ coreJobId } as Partial<GraphType>);
  }

  /**
   * Get segment from a graph (convenience method)
   */
  getSegment(id: string): string | null {
    const graph = this.findById(id);
    return graph?.inputJson.segment ?? null;
  }

  /**
   * Add a warning to a graph
   */
  addWarning(id: string, warning: string): GraphType | null {
    const graph = this.findById(id);
    if (!graph) return null;

    const warnings = graph.warningsJson ?? [];
    warnings.push(warning);

    return this.update(id, { warningsJson: warnings });
  }

  /**
   * Clear all warnings from a graph
   */
  clearWarnings(id: string): GraphType | null {
    return this.update(id, { warningsJson: null });
  }
}

/** Singleton instance of GraphRepo */
export const graphRepo = new GraphRepo();
