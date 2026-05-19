import type Database from 'better-sqlite3';

export type EffectiveLevel = {
  level: number;
  promoted: boolean; // czy podniesione automatycznie w tym wywołaniu
};

type ProgRow = {
  level: number;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
};

type SessionAgg = { session_id: number; ok: number; total: number };

/**
 * Wylicza aktualny poziom usera dla danego ćwiczenia.
 *
 * Auto-promocja: gdy ostatnie 2 zakończone sesje miały wszystkie serie tego
 * ćwiczenia (na aktualnym levelu) >= cel (target_reps_max / target_duration_s),
 * level wskakuje wyżej (jeśli istnieje wyższy w progressions).
 *
 * Zapisuje wynik do user_exercise_level żeby kolejne wywołanie nie liczyło
 * ponownie. Jeśli pusto - fallback do planStartLevel (typowo 1).
 */
export function resolveLevel(
  db: Database.Database,
  userId: number,
  exerciseId: number,
  planStartLevel: number
): EffectiveLevel {
  const existing = db
    .prepare(
      'SELECT level FROM user_exercise_level WHERE user_id = ? AND exercise_id = ?'
    )
    .get(userId, exerciseId) as { level: number } | undefined;

  const baseLevel = existing?.level ?? planStartLevel;

  const baseProg = db
    .prepare(
      `SELECT level, target_reps_min, target_reps_max, target_duration_s
       FROM progressions WHERE exercise_id = ? AND level = ?`
    )
    .get(exerciseId, baseLevel) as ProgRow | undefined;

  if (!baseProg) return { level: baseLevel, promoted: false };

  const nextProg = db
    .prepare(
      `SELECT MIN(level) AS next_level FROM progressions
       WHERE exercise_id = ? AND level > ?`
    )
    .get(exerciseId, baseLevel) as { next_level: number | null } | undefined;

  const nextLevel = nextProg?.next_level ?? null;
  if (nextLevel == null) return { level: baseLevel, promoted: false };

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
    return { level: baseLevel, promoted: false };
  }

  db.prepare(
    `INSERT INTO user_exercise_level (user_id, exercise_id, level, updated_at)
     VALUES (?, ?, ?, unixepoch())
     ON CONFLICT(user_id, exercise_id) DO UPDATE SET
       level = excluded.level,
       updated_at = excluded.updated_at`
  ).run(userId, exerciseId, nextLevel);

  return { level: nextLevel, promoted: true };
}
