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

/**
 * Przelicza level usera od zera na podstawie pełnej historii completed sesji.
 * Używane po usunięciu sesji - bez tego user utknie na auto-awansowanym levelu
 * mimo że sesje które uzasadniały awans już nie istnieją.
 *
 * Algorytm:
 * - zaczyna od planStartLevel (typowo 1)
 * - iteruje chronologicznie ASC po completed sesjach z tym ćwiczeniem
 * - dla każdej sesji: jeśli wszystkie serie na bieżącym levelu wbiły max → counter+1
 * - po 2 consecutive hits → awans, counter=0
 * - sesja bez serii tego ćwiczenia na bieżącym levelu jest pomijana (counter zostaje)
 * - sesja z fail (jakaś seria pod max) → counter=0
 */
export function rebuildLevel(
  db: Database.Database,
  userId: number,
  exerciseId: number,
  planStartLevel: number
): number {
  const progs = db
    .prepare(
      `SELECT level, target_reps_max, target_duration_s
       FROM progressions WHERE exercise_id = ? ORDER BY level ASC`
    )
    .all(exerciseId) as Array<{
    level: number;
    target_reps_max: number | null;
    target_duration_s: number | null;
  }>;

  if (progs.length === 0) {
    db.prepare(
      'DELETE FROM user_exercise_level WHERE user_id = ? AND exercise_id = ?'
    ).run(userId, exerciseId);
    return planStartLevel;
  }

  let idx = progs.findIndex((p) => p.level === planStartLevel);
  if (idx < 0) idx = 0;

  const getSetsForSessionLevel = db.prepare(
    `SELECT reps, duration_s FROM sets
     WHERE session_id = ? AND exercise_id = ? AND level = ?`
  );

  const sessions = db
    .prepare(
      `SELECT DISTINCT s.id, s.completed_at FROM sessions s
       JOIN sets st ON st.session_id = s.id
       WHERE s.user_id = ?
         AND s.completed_at IS NOT NULL
         AND st.exercise_id = ?
       ORDER BY s.completed_at ASC`
    )
    .all(userId, exerciseId) as Array<{ id: number; completed_at: number }>;

  let consecutiveHits = 0;

  for (const sess of sessions) {
    const cur = progs[idx];
    const sets = getSetsForSessionLevel.all(sess.id, exerciseId, cur.level) as Array<{
      reps: number | null;
      duration_s: number | null;
    }>;
    if (sets.length === 0) continue;

    const allHit = sets.every(
      (s) =>
        (s.reps != null && cur.target_reps_max != null && s.reps >= cur.target_reps_max) ||
        (s.duration_s != null &&
          cur.target_duration_s != null &&
          s.duration_s >= cur.target_duration_s)
    );

    if (allHit) {
      consecutiveHits += 1;
      if (consecutiveHits >= 2 && idx < progs.length - 1) {
        idx += 1;
        consecutiveHits = 0;
      }
    } else {
      consecutiveHits = 0;
    }
  }

  const finalLevel = progs[idx].level;

  if (finalLevel === planStartLevel) {
    db.prepare(
      'DELETE FROM user_exercise_level WHERE user_id = ? AND exercise_id = ?'
    ).run(userId, exerciseId);
  } else {
    db.prepare(
      `INSERT INTO user_exercise_level (user_id, exercise_id, level, updated_at)
       VALUES (?, ?, ?, unixepoch())
       ON CONFLICT(user_id, exercise_id) DO UPDATE SET
         level = excluded.level,
         updated_at = excluded.updated_at`
    ).run(userId, exerciseId, finalLevel);
  }

  return finalLevel;
}
