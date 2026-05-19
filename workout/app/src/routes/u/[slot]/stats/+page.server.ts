import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

type ExerciseStats = {
  id: number;
  slug: string;
  name_pl: string;
  category: string;
  current_level: number;
  sessions_count: number;
  sets_count: number;
  total_reps: number | null;
  total_duration_s: number | null;
  last_session_at: number | null;
};

export const load: ServerLoad = ({ params }) => {
  const db = getDb();
  const slot = params.slot;
  if (slot !== 'user1' && slot !== 'user2') throw error(404, 'Nieznany profil');

  const user = db.prepare('SELECT id, slot, name FROM users WHERE slot = ?').get(slot) as
    | { id: number; slot: string; name: string }
    | undefined;
  if (!user) throw error(404, 'Profil nie istnieje');

  const exercises = db
    .prepare(
      `SELECT
         e.id,
         e.slug,
         e.name_pl,
         e.category,
         COALESCE(uel.level, 1) AS current_level,
         COUNT(DISTINCT s.id) AS sessions_count,
         COUNT(st.id) AS sets_count,
         SUM(st.reps) AS total_reps,
         SUM(st.duration_s) AS total_duration_s,
         MAX(s.completed_at) AS last_session_at
       FROM exercises e
       JOIN sets st ON st.exercise_id = e.id
       JOIN sessions s ON s.id = st.session_id
         AND s.user_id = ?
         AND s.completed_at IS NOT NULL
       LEFT JOIN user_exercise_level uel ON uel.user_id = ? AND uel.exercise_id = e.id
       GROUP BY e.id
       ORDER BY last_session_at DESC`
    )
    .all(user.id, user.id) as ExerciseStats[];

  // Agregaty globalne
  const summary = db
    .prepare(
      `SELECT
         COUNT(DISTINCT s.id) AS total_sessions,
         COUNT(st.id) AS total_sets,
         MAX(s.completed_at) AS last_session_at
       FROM sessions s
       LEFT JOIN sets st ON st.session_id = s.id
       WHERE s.user_id = ? AND s.completed_at IS NOT NULL`
    )
    .get(user.id) as {
    total_sessions: number;
    total_sets: number;
    last_session_at: number | null;
  };

  return { user, exercises, summary };
};
