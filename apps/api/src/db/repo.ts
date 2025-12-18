import { Database, type SQLQueryBindings } from "bun:sqlite";
import { ZodSchema } from "zod";
import {
  toCamelCase,
  buildWhereClause,
  buildSetClause,
  buildInsertClause,
  toSnakeCaseKey,
} from "./utils";

/** SQLite-compatible parameter type */
type SqlParams = SQLQueryBindings[];

/**
 * Base interface for all entities
 */
export interface Entity {
  id: string;
}

/**
 * Options for findMany queries
 */
export interface FindManyOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

/**
 * Generic repository class for type-safe SQLite CRUD operations
 */
export class BaseRepo<T extends Entity> {
  constructor(
    protected db: Database,
    protected tableName: string,
    protected schema: ZodSchema<T>
  ) {}

  /**
   * Create a new entity
   * Auto-generates ID and timestamps
   */
  create(data: Omit<T, "id" | "createdAt" | "updatedAt">): T {
    const now = Date.now();
    const id = crypto.randomUUID();

    const fullData = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as unknown as Record<string, unknown>;

    const { columns, placeholders, params } = buildInsertClause(fullData);
    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;

    return this.transaction(() => {
      this.db.run(sql, params as SqlParams);
      const created = this.findById(id);
      if (!created) {
        throw new Error(`Failed to create entity in ${this.tableName}`);
      }
      return created;
    });
  }

  /**
   * Find entity by ID
   */
  findById(id: string): T | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    const row = this.db.query(sql).get(id) as Record<string, unknown> | null;

    if (!row) {
      return null;
    }

    return this.parseRow(row);
  }

  /**
   * Find multiple entities with optional filtering, pagination, and ordering
   */
  findMany(
    where?: Partial<T>,
    options?: FindManyOptions
  ): T[] {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: SQLQueryBindings[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereClause = buildWhereClause(where as Record<string, unknown>);
      sql += ` ${whereClause.sql}`;
      params.push(...(whereClause.params as SqlParams));
    }

    if (options?.orderBy) {
      const orderCol = toSnakeCaseKey(options.orderBy);
      const orderDir = options.orderDir || "ASC";
      sql += ` ORDER BY ${orderCol} ${orderDir}`;
    }

    if (options?.limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset !== undefined) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const rows = this.db.query(sql).all(...params) as Record<string, unknown>[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Find first entity matching criteria
   */
  findFirst(where: Partial<T>): T | null {
    const results = this.findMany(where, { limit: 1 });
    return results[0] || null;
  }

  /**
   * Update entity by ID
   * Returns updated entity or null if not found
   */
  update(id: string, data: Partial<Omit<T, "id" | "createdAt">>): T | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: Date.now(),
    } as Record<string, unknown>;

    const { sql: setClause, params: setParams } = buildSetClause(updateData);

    if (!setClause) {
      return existing;
    }

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;

    return this.transaction(() => {
      this.db.run(sql, [...setParams, id] as SqlParams);
      return this.findById(id);
    });
  }

  /**
   * Delete entity by ID
   * Returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;

    return this.transaction(() => {
      const result = this.db.run(sql, [id]);
      return result.changes > 0;
    });
  }

  /**
   * Delete multiple entities matching criteria
   * Returns number of deleted entities
   */
  deleteMany(where: Partial<T>): number {
    const { sql: whereClause, params } = buildWhereClause(
      where as Record<string, unknown>
    );

    if (!whereClause) {
      throw new Error("deleteMany requires at least one condition");
    }

    const sql = `DELETE FROM ${this.tableName} ${whereClause}`;

    return this.transaction(() => {
      const result = this.db.run(sql, params as SqlParams);
      return result.changes;
    });
  }

  /**
   * Count entities matching criteria
   */
  count(where?: Partial<T>): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: SQLQueryBindings[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereClause = buildWhereClause(where as Record<string, unknown>);
      sql += ` ${whereClause.sql}`;
      params.push(...(whereClause.params as SqlParams));
    }

    const result = this.db.query(sql).get(...params) as { count: number };
    return result.count;
  }

  /**
   * Check if entity exists
   */
  exists(id: string): boolean {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`;
    const result = this.db.query(sql).get(id);
    return result !== null;
  }

  /**
   * Execute function within a transaction
   * Automatically rolls back on error
   */
  transaction<R>(fn: () => R): R {
    return this.db.transaction(fn)();
  }

  /**
   * Parse database row into typed entity
   * Converts snake_case to camelCase and validates with Zod schema
   */
  protected parseRow(row: Record<string, unknown>): T {
    const camelCased = toCamelCase(row);
    const result = this.schema.safeParse(camelCased);

    if (!result.success) {
      throw new Error(
        `Invalid data from ${this.tableName}: ${result.error.message}`
      );
    }

    return result.data;
  }

  /**
   * Execute raw SQL query
   * Use with caution - no automatic case mapping
   */
  raw<R = unknown>(sql: string, params: SqlParams = []): R[] {
    return this.db.query(sql).all(...params) as R[];
  }

  /**
   * Execute raw SQL and return first result
   */
  rawFirst<R = unknown>(sql: string, params: SqlParams = []): R | null {
    return (this.db.query(sql).get(...params) as R) || null;
  }
}

/**
 * Create a repository instance for a specific entity type
 */
export function createRepo<T extends Entity>(
  db: Database,
  tableName: string,
  schema: ZodSchema<T>
): BaseRepo<T> {
  return new BaseRepo(db, tableName, schema);
}
