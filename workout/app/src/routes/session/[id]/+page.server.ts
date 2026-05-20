import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { resolveLevel, rebuildLevel } from '$lib/server/db/progression';

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

  let exercises: Array<
    PlanExerciseRow & { progression: ProgressionRow | null; sets: SetRow[]; locations: string[] }
  > = [];

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
    const getLocations = db.prepare(
      `SELECT location FROM exercise_locations WHERE exercise_id = ? ORDER BY location`
    );

    const getSets = db.prepare(
      `SELECT id, exercise_id, set_number, level, reps, duration_s, rpe, notes
       FROM sets WHERE session_id = ? AND exercise_id = ?
       ORDER BY set_number`
    );

    // Ostatnia ZAKOŃCZONA sesja (różna od bieżącej) z tymi setami dla danego user'a,
    // ćwiczenia i levelu. Pokazujemy obok celu jako referencję do double progression.
    const getLastSetsForExerciseLevel = db.prepare(
      `SELECT st.set_number, st.reps, st.duration_s
       FROM sets st
       WHERE st.session_id = (
         SELECT s.id FROM sessions s
         JOIN sets st2 ON st2.session_id = s.id
         WHERE s.user_id = ?
           AND s.completed_at IS NOT NULL
           AND s.id != ?
           AND st2.exercise_id = ?
           AND st2.level = ?
         ORDER BY s.completed_at DESC
         LIMIT 1
       )
       AND st.exercise_id = ?
       ORDER BY st.set_number`
    );

    // Auto-promocję wykonujemy tylko gdy sesja jest jeszcze aktywna
    // (zakończona sesja powinna pokazywać historyczne dane bez modyfikacji)
    const isActive = session.completed_at == null;

    exercises = pes.map((pe) => {
      const eff = isActive
        ? resolveLevel(db, session.user_id, pe.exercise_id, pe.start_level)
        : { level: pe.start_level, promoted: false };
      const progression =
        (getProgression.get(pe.exercise_id, eff.level) as ProgressionRow) ?? null;
      const lastSets = getLastSetsForExerciseLevel.all(
        session.user_id,
        sessionId,
        pe.exercise_id,
        eff.level,
        pe.exercise_id
      ) as Array<{ set_number: number; reps: number | null; duration_s: number | null }>;
      const locations = (getLocations.all(pe.exercise_id) as Array<{ location: string }>).map(
        (r) => r.location
      );
      return {
        ...pe,
        locations,
        progression,
        promoted: eff.promoted,
        last_sets: lastSets,
        sets: getSets.all(sessionId, pe.exercise_id) as SetRow[]
      };
    });
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

  deleteSession: async ({ params, locals }) => {
    const sessionId = parseId(params.id);
    const db = getDb();
    const session = db
      .prepare('SELECT user_id FROM sessions WHERE id = ?')
      .get(sessionId) as { user_id: number } | undefined;
    if (!session) throw error(404, 'Sesja nie istnieje');

    // Zbieramy ćwiczenia z usuwanej sesji - po DELETE trzeba przeliczyć ich level,
    // żeby auto-awansy które się oparły na tej sesji się cofnęły.
    const affectedExercises = db
      .prepare('SELECT DISTINCT exercise_id FROM sets WHERE session_id = ?')
      .all(sessionId) as Array<{ exercise_id: number }>;

    // CASCADE w schema usuwa sety automatycznie
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

    for (const { exercise_id } of affectedExercises) {
      rebuildLevel(db, session.user_id, exercise_id, 1);
    }

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
