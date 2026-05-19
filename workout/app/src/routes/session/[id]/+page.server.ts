import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

type SessionRow = {
  id: number;
  user_id: number;
  plan_id: number | null;
  day_label: string | null;
  started_at: number;
  completed_at: number | null;
  notes: string | null;
};

type PlanExerciseRow = {
  pe_id: number;
  ord: number;
  exercise_id: number;
  start_level: number;
  target_sets: number;
  rest_seconds: number;
  pe_notes: string | null;
  slug: string;
  name_pl: string;
  category: string;
  equipment_ref: string;
  technique_md: string | null;
};

type ProgressionRow = {
  level: number;
  variant_name: string;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
};

type SetRow = {
  id: number;
  exercise_id: number;
  set_number: number;
  level: number;
  reps: number | null;
  duration_s: number | null;
  rpe: number | null;
  notes: string | null;
};

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw error(400, 'Bad session id');
  return id;
}

export const load: ServerLoad = ({ params }) => {
  const sessionId = parseId(params.id);
  const db = getDb();

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
    | SessionRow
    | undefined;
  if (!session) throw error(404, 'Sesja nie istnieje');

  const user = db.prepare('SELECT slot, name FROM users WHERE id = ?').get(session.user_id) as
    | { slot: string; name: string }
    | undefined;

  let exercises: Array<PlanExerciseRow & { progression: ProgressionRow | null; sets: SetRow[] }> =
    [];

  if (session.plan_id && session.day_label) {
    const pes = db
      .prepare(
        `SELECT
           pe.id AS pe_id, pe.ord, pe.exercise_id, pe.start_level,
           pe.target_sets, pe.rest_seconds, pe.notes AS pe_notes,
           e.slug, e.name_pl, e.category, e.equipment_ref, e.technique_md
         FROM plan_exercises pe
         JOIN exercises e ON e.id = pe.exercise_id
         WHERE pe.plan_id = ? AND pe.day_label = ?
         ORDER BY pe.ord`
      )
      .all(session.plan_id, session.day_label) as PlanExerciseRow[];

    const getProgression = db.prepare(
      `SELECT level, variant_name, target_reps_min, target_reps_max, target_duration_s
       FROM progressions WHERE exercise_id = ? AND level = ?`
    );
    const getSets = db.prepare(
      `SELECT id, exercise_id, set_number, level, reps, duration_s, rpe, notes
       FROM sets WHERE session_id = ? AND exercise_id = ?
       ORDER BY set_number`
    );

    exercises = pes.map((pe) => ({
      ...pe,
      progression: (getProgression.get(pe.exercise_id, pe.start_level) as ProgressionRow) ?? null,
      sets: getSets.all(sessionId, pe.exercise_id) as SetRow[]
    }));
  }

  return { session, user, exercises };
};

export const actions: Actions = {
  logSet: async ({ params, request }) => {
    const sessionId = parseId(params.id);
    const db = getDb();
    const session = db
      .prepare('SELECT id, completed_at FROM sessions WHERE id = ?')
      .get(sessionId) as { id: number; completed_at: number | null } | undefined;
    if (!session) throw error(404, 'Sesja nie istnieje');
    if (session.completed_at) return fail(400, { message: 'Sesja zakończona' });

    const form = await request.formData();
    const exerciseId = Number(form.get('exercise_id'));
    const setNumber = Number(form.get('set_number'));
    const level = Number(form.get('level'));
    const repsRaw = form.get('reps');
    const durationRaw = form.get('duration_s');
    const reps = repsRaw && repsRaw !== '' ? Number(repsRaw) : null;
    const durationS = durationRaw && durationRaw !== '' ? Number(durationRaw) : null;

    if (!Number.isInteger(exerciseId) || !Number.isInteger(setNumber) || !Number.isInteger(level)) {
      return fail(400, { message: 'Złe dane' });
    }
    if (reps === null && durationS === null) {
      return fail(400, { message: 'Podaj powtórzenia lub czas' });
    }

    const existing = db
      .prepare(
        `SELECT id FROM sets WHERE session_id = ? AND exercise_id = ? AND set_number = ?`
      )
      .get(sessionId, exerciseId, setNumber) as { id: number } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE sets SET level = ?, reps = ?, duration_s = ?, recorded_at = unixepoch()
         WHERE id = ?`
      ).run(level, reps, durationS, existing.id);
    } else {
      db.prepare(
        `INSERT INTO sets (session_id, exercise_id, set_number, level, reps, duration_s)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(sessionId, exerciseId, setNumber, level, reps, durationS);
    }

    return { success: true };
  },

  deleteSet: async ({ params, request }) => {
    const sessionId = parseId(params.id);
    const db = getDb();
    const form = await request.formData();
    const setId = Number(form.get('set_id'));
    if (!Number.isInteger(setId)) return fail(400, { message: 'Bad set id' });
    db.prepare('DELETE FROM sets WHERE id = ? AND session_id = ?').run(setId, sessionId);
    return { success: true };
  },

  complete: async ({ params, locals }) => {
    const sessionId = parseId(params.id);
    const db = getDb();
    const session = db
      .prepare('SELECT user_id FROM sessions WHERE id = ?')
      .get(sessionId) as { user_id: number } | undefined;
    if (!session) throw error(404, 'Sesja nie istnieje');

    db.prepare(
      `UPDATE sessions SET completed_at = unixepoch() WHERE id = ? AND completed_at IS NULL`
    ).run(sessionId);

    const user = db.prepare('SELECT slot FROM users WHERE id = ?').get(session.user_id) as
      | { slot: string }
      | undefined;
    throw redirect(303, `${locals.ingressPath}${user ? `/u/${user.slot}` : '/'}`);
  },

  cancel: async ({ params, locals }) => {
    const sessionId = parseId(params.id);
    const db = getDb();
    const session = db
      .prepare(`SELECT user_id, completed_at FROM sessions WHERE id = ?`)
      .get(sessionId) as { user_id: number; completed_at: number | null } | undefined;
    if (!session) throw error(404, 'Sesja nie istnieje');

    // Bezpieczeństwo: usuwamy tylko pustą, niedokończoną sesję
    const setCount = (db.prepare('SELECT COUNT(*) AS n FROM sets WHERE session_id = ?').get(
      sessionId
    ) as { n: number }).n;
    if (session.completed_at === null && setCount === 0) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }

    const user = db.prepare('SELECT slot FROM users WHERE id = ?').get(session.user_id) as
      | { slot: string }
      | undefined;
    throw redirect(303, `${locals.ingressPath}${user ? `/u/${user.slot}` : '/'}`);
  }
};
