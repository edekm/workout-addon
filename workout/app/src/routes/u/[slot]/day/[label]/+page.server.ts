import { error, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { resolveLevel } from '$lib/server/db/progression';

type ProgressionRow = {
  level: number;
  variant_name: string;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
  notes: string | null;
};

type ExerciseRow = {
  pe_id: number;
  ord: number;
  start_level: number;
  target_sets: number;
  rest_seconds: number;
  pe_notes: string | null;
  exercise_id: number;
  slug: string;
  name_pl: string;
  category: string;
  equipment_ref: string;
};

export const load: ServerLoad = ({ params }) => {
  const db = getDb();
  const slot = params.slot;
  const dayLabel = decodeURIComponent(params.label ?? '');
  if (slot !== 'user1' && slot !== 'user2') throw error(404, 'Nieznany profil');

  const user = db
    .prepare('SELECT id, slot, name, active_plan_id FROM users WHERE slot = ?')
    .get(slot) as
    | { id: number; slot: string; name: string; active_plan_id: number | null }
    | undefined;
  if (!user) throw error(404, 'Profil nie istnieje');
  if (!user.active_plan_id) throw error(404, 'Brak aktywnego planu');

  const plan = db
    .prepare('SELECT id, name FROM plans WHERE id = ?')
    .get(user.active_plan_id) as { id: number; name: string } | undefined;
  if (!plan) throw error(404, 'Brak aktywnego planu');

  const exercises = db
    .prepare(
      `SELECT
         pe.id            AS pe_id,
         pe.ord           AS ord,
         pe.start_level   AS start_level,
         pe.target_sets   AS target_sets,
         pe.rest_seconds  AS rest_seconds,
         pe.notes         AS pe_notes,
         e.id             AS exercise_id,
         e.slug           AS slug,
         e.name_pl        AS name_pl,
         e.category       AS category,
         e.equipment_ref  AS equipment_ref
       FROM plan_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.plan_id = ? AND pe.day_label = ?
       ORDER BY pe.ord`
    )
    .all(plan.id, dayLabel) as ExerciseRow[];

  if (exercises.length === 0) throw error(404, 'Brak ćwiczeń dla dnia ' + dayLabel);

  const getProgression = db.prepare(
    `SELECT level, variant_name, target_reps_min, target_reps_max, target_duration_s, notes
     FROM progressions WHERE exercise_id = ? AND level = ?`
  );

  const getLastSetsForExerciseLevel = db.prepare(
    `SELECT st.set_number, st.reps, st.duration_s
     FROM sets st
     WHERE st.session_id = (
       SELECT s.id FROM sessions s
       JOIN sets st2 ON st2.session_id = s.id
       WHERE s.user_id = ?
         AND s.completed_at IS NOT NULL
         AND st2.exercise_id = ?
         AND st2.level = ?
       ORDER BY s.completed_at DESC
       LIMIT 1
     )
     AND st.exercise_id = ?
     ORDER BY st.set_number`
  );

  const items = exercises.map((ex) => {
    const eff = resolveLevel(db, user.id, ex.exercise_id, ex.start_level);
    const prog = getProgression.get(ex.exercise_id, eff.level) as
      | ProgressionRow
      | undefined;
    const lastSets = getLastSetsForExerciseLevel.all(
      user.id,
      ex.exercise_id,
      eff.level,
      ex.exercise_id
    ) as Array<{ set_number: number; reps: number | null; duration_s: number | null }>;
    return {
      ...ex,
      progression: prog ?? null,
      promoted: eff.promoted,
      last_sets: lastSets
    };
  });

  return { user, plan, dayLabel, items };
};

export const actions: Actions = {
  startSession: async ({ params, locals }) => {
    const db = getDb();
    const slot = params.slot;
    const dayLabel = decodeURIComponent(params.label ?? '');
    if (slot !== 'user1' && slot !== 'user2') throw error(400, 'Bad slot');

    const user = db
      .prepare('SELECT id, active_plan_id FROM users WHERE slot = ?')
      .get(slot) as { id: number; active_plan_id: number | null } | undefined;
    if (!user) throw error(404, 'Brak usera');

    // "Albo się ćwiczy albo nie" - usuwamy wszystkie niezakończone sesje tego usera
    // (nie tylko tego dnia) zanim utworzymy nową. CASCADE usuwa sety.
    db.prepare(
      `DELETE FROM sessions WHERE user_id = ? AND completed_at IS NULL`
    ).run(user.id);

    const info = db
      .prepare(`INSERT INTO sessions (user_id, plan_id, day_label) VALUES (?, ?, ?)`)
      .run(user.id, user.active_plan_id ?? null, dayLabel);
    const sessionId = Number(info.lastInsertRowid);

    throw redirect(303, `${locals.ingressPath}/session/${sessionId}`);
  }
};
