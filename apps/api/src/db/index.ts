import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";

const DATABASE_URL = process.env.DATABASE_URL || "./data/ajtbd.db";

function ensureDbDir(dbPath: string): void {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function createConnection(): Database {
  ensureDbDir(DATABASE_URL);
  const db = new Database(DATABASE_URL, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

export const db = createConnection();

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const migrationsDir = join(import.meta.dir, "migrations");
  if (!existsSync(migrationsDir)) {
    console.log("No migrations directory found");
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const applied = new Set(
    db
      .query<{ version: string }, []>("SELECT version FROM schema_migrations")
      .all()
      .map((r) => r.version)
  );

  for (const file of files) {
    const version = file.replace(".sql", "");
    if (applied.has(version)) {
      console.log(`Migration ${version} already applied`);
      continue;
    }

    console.log(`Applying migration: ${version}`);
    const sql = readFileSync(join(migrationsDir, file), "utf-8");

    db.transaction(() => {
      db.exec(sql);
      db.run(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        [version, Date.now()]
      );
    })();

    console.log(`Migration ${version} applied successfully`);
  }
}

export function closeDb(): void {
  db.close();
}
