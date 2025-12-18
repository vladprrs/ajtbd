-- Graphs: top-level container for a job analysis
CREATE TABLE graphs (
  id TEXT PRIMARY KEY,
  segment TEXT NOT NULL,
  core_job TEXT NOT NULL,
  big_job TEXT,
  language TEXT DEFAULT 'en',
  options_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Jobs: hierarchical job structure (big -> core -> small -> micro)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('big', 'core', 'small', 'micro')),
  parent_id TEXT REFERENCES jobs(id) ON DELETE CASCADE,
  formulation TEXT NOT NULL,
  label TEXT NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('before', 'during', 'after', 'unknown')),
  cadence TEXT NOT NULL CHECK (cadence IN ('once', 'repeat')),
  cadence_hint TEXT,
  when_text TEXT,
  want TEXT,
  so_that TEXT,
  suggested_next TEXT,
  scores_json TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_jobs_graph_id ON jobs(graph_id);
CREATE INDEX idx_jobs_parent_id ON jobs(parent_id);
CREATE INDEX idx_jobs_level ON jobs(level);
CREATE INDEX idx_jobs_phase ON jobs(phase);

-- Solutions: ways to accomplish a job
CREATE TABLE solutions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('self', 'product', 'service', 'our_product', 'partner')),
  actor_id TEXT REFERENCES actors(id) ON DELETE SET NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_solutions_job_id ON solutions(job_id);

-- Actors: entities that provide solutions
CREATE TABLE actors (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_actors_graph_id ON actors(graph_id);

-- Problems: issues or pain points related to jobs
CREATE TABLE problems (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_problems_job_id ON problems(job_id);

-- Edges: relationships between jobs
CREATE TABLE edges (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  from_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  to_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('next', 'depends_on', 'optional', 'repeats')),
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_edges_graph_id ON edges(graph_id);
CREATE INDEX idx_edges_from_id ON edges(from_id);
CREATE INDEX idx_edges_to_id ON edges(to_id);

-- Sequences: ordered lists of jobs for specific views
CREATE TABLE sequences (
  id TEXT PRIMARY KEY,
  graph_id TEXT NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  job_ids_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_sequences_graph_id ON sequences(graph_id);
