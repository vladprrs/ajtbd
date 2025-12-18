/**
 * Database utility functions for case mapping and JSON field handling
 */

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCaseKey(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCaseKey(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Check if a key represents a JSON field (ends with _json or Json)
 */
function isJsonKey(key: string): boolean {
  return key.endsWith("_json") || key.endsWith("Json");
}

/**
 * Convert object keys from camelCase to snake_case for DB writes
 * Also serializes JSON fields (keys ending with Json become _json strings)
 */
export function toSnakeCase<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCaseKey(key);

    if (value === undefined) {
      continue;
    }

    if (isJsonKey(key) && value !== null) {
      // Serialize JSON fields
      result[snakeKey] = JSON.stringify(value);
    } else if (Array.isArray(value)) {
      // Handle arrays
      result[snakeKey] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? toSnakeCase(item as Record<string, unknown>)
          : item
      );
    } else if (value !== null && typeof value === "object") {
      // Handle nested objects (but not JSON fields)
      result[snakeKey] = toSnakeCase(value as Record<string, unknown>);
    } else {
      result[snakeKey] = value;
    }
  }

  return result;
}

/**
 * Convert object keys from snake_case to camelCase for reads
 * Also deserializes JSON fields (_json strings become objects)
 */
export function toCamelCase<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCaseKey(key);

    if (isJsonKey(key) && typeof value === "string") {
      // Deserialize JSON fields
      try {
        result[camelKey] = JSON.parse(value);
      } catch {
        result[camelKey] = value;
      }
    } else if (isJsonKey(key) && value === null) {
      result[camelKey] = null;
    } else if (Array.isArray(value)) {
      // Handle arrays
      result[camelKey] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? toCamelCase(item as Record<string, unknown>)
          : item
      );
    } else if (value !== null && typeof value === "object") {
      // Handle nested objects
      result[camelKey] = toCamelCase(value as Record<string, unknown>);
    } else {
      result[camelKey] = value;
    }
  }

  return result;
}

/**
 * Build a simple WHERE clause from partial object
 * Returns { sql: string, params: unknown[] }
 */
export function buildWhereClause(
  where: Record<string, unknown>
): { sql: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    const snakeKey = toSnakeCaseKey(key);
    if (value === null) {
      conditions.push(`${snakeKey} IS NULL`);
    } else {
      conditions.push(`${snakeKey} = ?`);
      params.push(value);
    }
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/**
 * Build SET clause for UPDATE from partial object
 * Returns { sql: string, params: unknown[] }
 */
export function buildSetClause(
  data: Record<string, unknown>
): { sql: string; params: unknown[] } {
  const sets: string[] = [];
  const params: unknown[] = [];

  const snakeData = toSnakeCase(data);

  for (const [key, value] of Object.entries(snakeData)) {
    if (value === undefined) continue;
    sets.push(`${key} = ?`);
    params.push(value);
  }

  return {
    sql: sets.join(", "),
    params,
  };
}

/**
 * Build INSERT column/value lists
 */
export function buildInsertClause(
  data: Record<string, unknown>
): { columns: string; placeholders: string; params: unknown[] } {
  const columns: string[] = [];
  const params: unknown[] = [];

  const snakeData = toSnakeCase(data);

  for (const [key, value] of Object.entries(snakeData)) {
    if (value === undefined) continue;
    columns.push(key);
    params.push(value);
  }

  return {
    columns: columns.join(", "),
    placeholders: columns.map(() => "?").join(", "),
    params,
  };
}
