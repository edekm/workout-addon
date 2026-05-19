import { error, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

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

  const user = db.prepare('SELECT id, slot, name FROM users WHERE slot = ?').get(slot) as
    | { id: number; slot: string; name: string }
    | undefined;
  if (!user) throw error(404, 'Profil nie istnieje');

  const plan = db
    .prepare(
      `SELECT id, name FROM plans
       WHERE user_id = ? AND is_active = 1
       ORDER BY id DESC LIMIT 1`
    )
    .get(user.id) as { id: number; name: string } | undefined;
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

  const items = exercises.map((ex) => {
    const prog = getProgression.get(ex.exercise_id, ex.start_level) as
      | ProgressionRow
      | undefined;
    return { ...ex, progression: prog ?? null };
  });

  const activeSession = db
    .prepare(
      `SELECT id FROM sessions
       WHERE user_id = ? AND day_label = ? AND completed_at IS NULL
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(user.id, dayLabel) as { id: number } | undefined;

  return { user, plan, dayLabel, items, activeSession: activeSession ?? null };
};

export const actions: Actions = {
  startSession: async ({ params, locals }) => {
    const db = getDb();
    const slot = params.slot;
    const dayLabel = decodeURIComponent(params.label ?? '');
    if (slot !== 'user1' && slot !== 'user2') throw error(400, 'Bad slot');

    const user = db.prepare('SELECT id FROM users WHERE slot = ?').get(slot) as
      | { id: number }
      | undefined;
    if (!user) throw error(404, 'Brak usera');

    const plan = db
      .prepare(
        `SELECT id FROM plans WHERE user_id = ? AND is_active = 1
         ORDER BY id DESC LIMIT 1`
      )
      .get(user.id) as { id: number } | undefined;

    const existing = db
      .prepare(
        `SELECT id FROM sessions
         WHERE user_id = ? AND day_label = ? AND completed_at IS NULL
         ORDER BY started_at DESC LIMIT 1`
      )
      .get(user.id, dayLabel) as { id: number } | undefined;

    let sessionId: number;
    if (existing) {
      sessionId = existing.id;
    } else {
      const info = db
        .prepare(
          `INSERT INTO sessions (user_id, plan_id, day_label)
           VALUES (?, ?, ?)`
        )
        .run(user.id, plan?.id ?? null, dayLabel);
      sessionId = Number(info.lastInsertRowid);
    }

    throw redirect(303, `${locals.ingressPath}/session/${sessionId}`);
  }
};
