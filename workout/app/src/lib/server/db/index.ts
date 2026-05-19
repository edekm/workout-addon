import Database from 'better-sqlite3';
import { join } from 'node:path';
import { SCHEMA_SQL } from './schema';
import { seed } from './seed';
import { seedPlans } from './plans-seed';
import { ensureTechniques } from './techniques';

const DATA_DIR = process.env.DATA_DIR ?? '/data';
const DB_PATH = process.env.DB_PATH ?? join(DATA_DIR, 'workout.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(SCHEMA_SQL);

  // seed jest idempotentny - INSERT OR IGNORE per progresja, exercise dodaje
  // się tylko gdy nie ma slugu. Dzięki temu nowe ćwiczenia dodane w późniejszych
  // wersjach dolatują do istniejących baz.
  seed(db);

  syncUserNames(db);
  seedPlans(db);
  ensureTechniques(db);
  migrateStartLevelsToOne(db);

  dbInstance = db;
  return db;
}

function migrateStartLevelsToOne(db: Database.Database) {
  // Plan_exercises.start_level miał historycznie wpisane różne wartości (np. L4 dla M
  // bo "trochę umie"). Mieszało to "rekomendację autora planu" z "stanem konkretnego
  // usera". Aktualnie user_exercise_level jest źródłem prawdy - plan zawsze startuje
  // od podstaw, a auto-promocja / ręczny override podbijają poziom.
  const done = db
    .prepare('SELECT value FROM meta WHERE key = ?')
    .get('migration_v1_start_levels_reset') as { value: string } | undefined;
  if (done) return;
  db.prepare('UPDATE plan_exercises SET start_level = 1').run();
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
    'migration_v1_start_levels_reset',
    '1'
  );
}

function syncUserNames(db: Database.Database) {
  const user1Name = process.env.USER1_NAME ?? 'M';
  const user2Name = process.env.USER2_NAME ?? 'Ona';

  const upsert = db.prepare(`
    INSERT INTO users (slot, name) VALUES (?, ?)
    ON CONFLICT(slot) DO UPDATE SET name = excluded.name
  `);
  upsert.run('user1', user1Name);
  upsert.run('user2', user2Name);
}

export function dbStats() {
  const db = getDb();
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
  return {
    exercises: count('exercises'),
    progressions: count('progressions'),
    users: count('users'),
    plans: count('plans'),
    sessions: count('sessions'),
    sets: count('sets'),
    db_path: DB_PATH
  };
}
