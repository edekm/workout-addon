import type Database from 'better-sqlite3';

export type EffectiveLevel = {
  level: number;
  promoted: boolean; // czy podniesione automatycznie w tym wywołaniu
  source: 'auto' | 'manual' | 'plan';
};

type ProgRow = {
  level: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
};

type SessionAgg = { session_id: number; ok: number; total: number };

/**
 * Pobiera lub wylicza aktualny poziom user'a dla danego ćwiczenia.
 * Auto-promocja: gdy ostatnie 2 zakończone sesje miały wszystkie serie tego
 * ćwiczenia (na aktualnym levelu) >= cel (target_reps_max / target_duration_s),
 * level automatycznie wskakuje wyżej (jeśli istnieje wyższy w progressions).
 *
 * Zapisuje wynik do user_exercise_level (source='auto') żeby przy kolejnym
 * wywołaniu nie liczyć ponownie i żeby user mógł cofnąć przez "..." menu.
 */
export function resolveLevel(
  db: Database.Database,
  userId: number,
  exerciseId: number,
  planStartLevel: number
): EffectiveLevel {
  const existing = db
    .prepare(
      'SELECT level, source FROM user_exercise_level WHERE user_id = ? AND exercise_id = ?'
    )
    .get(userId, exerciseId) as { level: number; source: 'auto' | 'manual' } | undefined;

  const baseLevel = existing?.level ?? planStartLevel;
  const baseSource: 'auto' | 'manual' | 'plan' = existing
    ? existing.source
    : 'plan';

  // Manual jest tylko jednorazową korektą punktu startowego - nie blokuje
  // auto-promocji. Jeśli user na manualnie ustawionym levelu wbije 2 sesje
  // z hit max, normalnie awansujemy i source wraca do 'auto'.

  // Pobierz cel dla baseLevel
  const baseProg = db
    .prepare(
      `SELECT level, target_reps_min, target_reps_max, target_duration_s
       FROM progressions WHERE exercise_id = ? AND level = ?`
    )
    .get(exerciseId, baseLevel) as ProgRow | undefined;

  if (!baseProg) return { level: baseLevel, promoted: false, source: baseSource };

  // Czy istnieje wyższy level w progresji?
  const nextProg = db
    .prepare(
      `SELECT MIN(level) AS next_level FROM progressions
       WHERE exercise_id = ? AND level > ?`
    )
    .get(exerciseId, baseLevel) as { next_level: number | null } | undefined;

  const nextLevel = nextProg?.next_level ?? null;
  if (nextLevel == null) return { level: baseLevel, promoted: false, source: baseSource };

  // Pobierz 2 ostatnie zakończone sesje gdzie user logował to ćwiczenie na baseLevel
  const recentSessions = db
    .prepare(
      `SELECT
         s.id AS session_id,
         SUM(CASE WHEN
           (st.reps IS NOT NULL AND ? IS NOT NULL AND st.reps >= ?)
           OR (st.duration_s IS NOT NULL AND ? IS NOT NULL AND st.duration_s >= ?)
         THEN 1 ELSE 0 END) AS ok,
         COUNT(*) AS total
       FROM sessions s
       JOIN sets st ON st.session_id = s.id
       WHERE s.user_id = ?
         AND s.completed_at IS NOT NULL
         AND st.exercise_id = ?
         AND st.level = ?
       GROUP BY s.id
       ORDER BY s.completed_at DESC
       LIMIT 2`
    )
    .all(
      baseProg.target_reps_max,
      baseProg.target_reps_max,
      baseProg.target_duration_s,
      baseProg.target_duration_s,
      userId,
      exerciseId,
      baseLevel
    ) as SessionAgg[];

  const passed =
    recentSessions.length >= 2 &&
    recentSessions.every((r) => r.total > 0 && r.ok === r.total);

  if (!passed) {
    return { level: baseLevel, promoted: false, source: baseSource };
  }

  // Auto-promocja
  db.prepare(
    `INSERT INTO user_exercise_level (user_id, exercise_id, level, source, updated_at)
     VALUES (?, ?, ?, 'auto', unixepoch())
     ON CONFLICT(user_id, exercise_id) DO UPDATE SET
       level = excluded.level,
       source = 'auto',
       updated_at = excluded.updated_at`
  ).run(userId, exerciseId, nextLevel);

  return { level: nextLevel, promoted: true, source: 'auto' };
}

export function setManualLevel(
  db: Database.Database,
  userId: number,
  exerciseId: number,
  level: number
) {
  db.prepare(
    `INSERT INTO user_exercise_level (user_id, exercise_id, level, source, updated_at)
     VALUES (?, ?, ?, 'manual', unixepoch())
     ON CONFLICT(user_id, exercise_id) DO UPDATE SET
       level = excluded.level,
       source = 'manual',
       updated_at = excluded.updated_at`
  ).run(userId, exerciseId, level);
}

export function revertLevel(
  db: Database.Database,
  userId: number,
  exerciseId: number,
  toLevel: number
) {
  db.prepare(
    `INSERT INTO user_exercise_level (user_id, exercise_id, level, source, updated_at)
     VALUES (?, ?, ?, 'manual', unixepoch())
     ON CONFLICT(user_id, exercise_id) DO UPDATE SET
       level = excluded.level,
       source = 'manual',
       updated_at = excluded.updated_at`
  ).run(userId, exerciseId, toLevel);
}
