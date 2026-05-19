import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

type SessionRow = {
  session_id: number;
  day_label: string | null;
  completed_at: number;
  set_number: number;
  level: number;
  reps: number | null;
  duration_s: number | null;
};

type SessionStats = {
  session_id: number;
  day_label: string | null;
  completed_at: number;
  level: number;
  sets: Array<{ set_number: number; reps: number | null; duration_s: number | null }>;
  best: number; // max reps lub duration_s w sesji
};

type Progression = {
  level: number;
  variant_name: string;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
};

export const load: ServerLoad = ({ params }) => {
  const db = getDb();
  const slot = params.slot;
  if (slot !== 'user1' && slot !== 'user2') throw error(404, 'Nieznany profil');

  const user = db.prepare('SELECT id, slot, name FROM users WHERE slot = ?').get(slot) as
    | { id: number; slot: string; name: string }
    | undefined;
  if (!user) throw error(404, 'Profil nie istnieje');

  const exercise = db
    .prepare('SELECT id, slug, name_pl, category, equipment_ref FROM exercises WHERE slug = ?')
    .get(params.slug) as
    | { id: number; slug: string; name_pl: string; category: string; equipment_ref: string }
    | undefined;
  if (!exercise) throw error(404, 'Nieznane ćwiczenie');

  const rows = db
    .prepare(
      `SELECT
         s.id AS session_id, s.day_label, s.completed_at,
         st.set_number, st.level, st.reps, st.duration_s
       FROM sessions s
       JOIN sets st ON st.session_id = s.id
       WHERE s.user_id = ? AND s.completed_at IS NOT NULL AND st.exercise_id = ?
       ORDER BY s.completed_at ASC, st.set_number ASC`
    )
    .all(user.id, exercise.id) as SessionRow[];

  const sessionMap = new Map<number, SessionStats>();
  for (const r of rows) {
    let entry = sessionMap.get(r.session_id);
    if (!entry) {
      entry = {
        session_id: r.session_id,
        day_label: r.day_label,
        completed_at: r.completed_at,
        level: r.level,
        sets: [],
        best: 0
      };
      sessionMap.set(r.session_id, entry);
    }
    entry.sets.push({
      set_number: r.set_number,
      reps: r.reps,
      duration_s: r.duration_s
    });
    const v = r.reps ?? r.duration_s ?? 0;
    if (v > entry.best) entry.best = v;
  }
  const sessions = Array.from(sessionMap.values());

  const progressions = db
    .prepare(
      `SELECT level, variant_name, target_reps_min, target_reps_max, target_duration_s
       FROM progressions WHERE exercise_id = ? ORDER BY level ASC`
    )
    .all(exercise.id) as Progression[];

  const currentLevelRow = db
    .prepare(
      'SELECT level FROM user_exercise_level WHERE user_id = ? AND exercise_id = ?'
    )
    .get(user.id, exercise.id) as { level: number } | undefined;
  const currentLevel = currentLevelRow?.level ?? 1;
  const currentProgression =
    progressions.find((p) => p.level === currentLevel) ?? null;
  const mode = currentProgression?.target_duration_s != null ? 'duration' : 'reps';

  return {
    user,
    exercise,
    sessions,
    progressions,
    currentLevel,
    currentProgression,
    mode
  };
};
