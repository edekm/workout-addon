import Database from 'better-sqlite3';
import { join } from 'node:path';
import { SCHEMA_SQL } from './schema';
import { seed } from './seed';
import { seedPlans, migrateRefreshPlans_v2 } from './plans-seed';
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

  // Migracje strukturalne PRZED seed (żeby ALTER ADD COLUMN zadziałało dla starych baz).
  migrateAddArchivedColumn_v3(db);
  migrateSharedPlans_v4(db);

  // seed jest idempotentny - INSERT OR IGNORE per progresja, exercise dodaje
  // się tylko gdy nie ma slugu. Dzięki temu nowe ćwiczenia dodane w późniejszych
  // wersjach dolatują do istniejących baz.
  seed(db);

  syncUserNames(db);
  seedPlans(db);
  ensureTechniques(db);
  migrateStartLevelsToOne(db);
  migrateRefreshPlans_v2(db);
  migrateDefaultLocations_v3(db);

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

function migrateAddArchivedColumn_v3(db: Database.Database) {
  // CREATE TABLE IF NOT EXISTS nie doda is_archived do istniejących baz - ALTER potrzebny.
  const cols = db.prepare("PRAGMA table_info(exercises)").all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'is_archived')) {
    db.prepare('ALTER TABLE exercises ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0').run();
  }
}

function migrateSharedPlans_v4(db: Database.Database) {
  // Plans przechodzą z 'per user' na 'wspólne'. Dodajemy users.active_plan_id,
  // przenosimy własność planów do user.active_plan_id, usuwamy plans.user_id.
  // CREATE TABLE IF NOT EXISTS w SCHEMA_SQL nie pomoże dla starych baz - musimy
  // rebuild table żeby pozbyć się user_id i is_active.

  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const hasActivePlanId = userCols.some((c) => c.name === 'active_plan_id');

  const planCols = db.prepare("PRAGMA table_info(plans)").all() as Array<{ name: string }>;
  const hasUserId = planCols.some((c) => c.name === 'user_id');

  if (hasActivePlanId && !hasUserId) return; // już zmigrowane

  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    if (!hasActivePlanId) {
      db.prepare(
        'ALTER TABLE users ADD COLUMN active_plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL'
      ).run();
    }

    if (hasUserId) {
      // Przed dropowaniem user_id - skopiuj relację do users.active_plan_id.
      // Bierzemy najnowszy aktywny plan każdego usera (jeśli kolumna is_active istnieje).
      const hasIsActive = planCols.some((c) => c.name === 'is_active');
      const orderByActive = hasIsActive ? 'is_active DESC, id DESC' : 'id DESC';
      db.prepare(
        `UPDATE users SET active_plan_id = (
           SELECT id FROM plans p
           WHERE p.user_id = users.id
           ORDER BY ${orderByActive}
           LIMIT 1
         )
         WHERE active_plan_id IS NULL`
      ).run();

      // Rebuild plans: drop user_id i is_active.
      db.prepare(
        `CREATE TABLE plans_new (
           id          INTEGER PRIMARY KEY AUTOINCREMENT,
           name        TEXT NOT NULL,
           description TEXT,
           created_at  INTEGER NOT NULL DEFAULT (unixepoch())
         )`
      ).run();
      db.prepare(
        `INSERT INTO plans_new (id, name, description, created_at)
         SELECT id, name, description, created_at FROM plans`
      ).run();
      db.prepare('DROP TABLE plans').run();
      db.prepare('ALTER TABLE plans_new RENAME TO plans').run();
    }
  })();
  db.pragma('foreign_keys = ON');

  const fkCheck = db.prepare('PRAGMA foreign_key_check').all() as unknown[];
  if (fkCheck.length > 0) {
    console.warn('[workout] FK check po migrate_v4:', fkCheck);
  }
}

function migrateDefaultLocations_v3(db: Database.Database) {
  // Wszystkie istniejące ćwiczenia trafiają domyślnie do 'gym1' (KOMPAN/parkowa).
  // User może potem dodać/usunąć lokalizacje w UI biblioteki.
  const done = db
    .prepare('SELECT value FROM meta WHERE key = ?')
    .get('migration_v3_default_locations') as { value: string } | undefined;
  if (done) return;

  db.transaction(() => {
    const exs = db.prepare('SELECT id FROM exercises').all() as Array<{ id: number }>;
    const insertLoc = db.prepare(
      `INSERT OR IGNORE INTO exercise_locations (exercise_id, location) VALUES (?, 'gym1')`
    );
    for (const ex of exs) insertLoc.run(ex.id);
    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
      'migration_v3_default_locations',
      '1'
    );
  })();
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
