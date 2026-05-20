export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS exercises (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT NOT NULL UNIQUE,
  name_pl       TEXT NOT NULL,
  name_en       TEXT,
  category      TEXT NOT NULL CHECK (category IN ('pull','push','legs','core','cardio','mobility','skill')),
  equipment_ref TEXT NOT NULL,
  technique_md  TEXT,
  video_url     TEXT,
  is_archived   INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
-- idx_exercises_archived: tworzony w migrateAddArchivedColumn_v3 (po ALTER ADD COLUMN
-- dla istniejących baz, inaczej index wybucha bo kolumna jeszcze nie istnieje).

CREATE TABLE IF NOT EXISTS exercise_locations (
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  location    TEXT NOT NULL CHECK (location IN ('gym1','gym2','home')),
  PRIMARY KEY (exercise_id, location)
);

CREATE INDEX IF NOT EXISTS idx_exercise_locations_loc ON exercise_locations(location);

CREATE TABLE IF NOT EXISTS progressions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id       INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  level             INTEGER NOT NULL,
  variant_name      TEXT NOT NULL,
  target_reps_min   INTEGER,
  target_reps_max   INTEGER,
  target_duration_s INTEGER,
  notes             TEXT,
  UNIQUE (exercise_id, level)
);

CREATE INDEX IF NOT EXISTS idx_progressions_exercise ON progressions(exercise_id);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slot            TEXT NOT NULL UNIQUE CHECK (slot IN ('user1','user2')),
  name            TEXT NOT NULL,
  pin_hash        TEXT,
  goals           TEXT,
  active_plan_id  INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  created_at      INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS plans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS plan_exercises (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id         INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_label       TEXT NOT NULL,
  ord             INTEGER NOT NULL,
  exercise_id     INTEGER NOT NULL REFERENCES exercises(id),
  start_level     INTEGER NOT NULL DEFAULT 1,
  target_sets     INTEGER NOT NULL DEFAULT 3,
  rest_seconds    INTEGER NOT NULL DEFAULT 90,
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan ON plan_exercises(plan_id, day_label, ord);

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  day_label     TEXT,
  started_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at  INTEGER,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS sets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id   INTEGER NOT NULL REFERENCES exercises(id),
  set_number    INTEGER NOT NULL,
  level         INTEGER NOT NULL,
  reps          INTEGER,
  duration_s    INTEGER,
  rpe           INTEGER CHECK (rpe BETWEEN 1 AND 10),
  notes         TEXT,
  recorded_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sets_session ON sets(session_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_exercise_level (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  level       INTEGER NOT NULL,
  source      TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','manual')),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, exercise_id)
);
`;
