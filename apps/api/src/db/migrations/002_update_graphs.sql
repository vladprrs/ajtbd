-- Update graphs table to use inputJson structure
-- SQLite doesn't support ALTER TABLE DROP COLUMN in older versions,
-- so we recreate the table

-- Create new graphs table with updated schema
CREATE TABLE graphs_new (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'ru',
  input_json TEXT NOT NULL,
  core_job_id TEXT NOT NULL,
  big_job_id TEXT,
  warnings_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Migrate existing data (if any)
INSERT INTO graphs_new (id, language, input_json, core_job_id, big_job_id, warnings_json, created_at, updated_at)
SELECT
  id,
  COALESCE(language, 'ru'),
  json_object(
    'segment', segment,
    'coreJob', core_job,
    'bigJob', big_job,
    'options', json(options_json)
  ),
  '', -- core_job_id will need to be set manually for existing data
  NULL,
  NULL,
  created_at,
  updated_at
FROM graphs;

-- Drop old table and rename new one
DROP TABLE graphs;
ALTER TABLE graphs_new RENAME TO graphs;

-- Create index for segment search within JSON
CREATE INDEX idx_graphs_updated_at ON graphs(updated_at);
