import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import {
  getExerciseBySlug,
  setArchived,
  updateExercise,
  validateExerciseInput
} from '$lib/server/db/library';

export const load: ServerLoad = ({ params }) => {
  const db = getDb();
  const ex = getExerciseBySlug(db, params.slug ?? '');
  if (!ex) throw error(404, 'Ćwiczenie nie istnieje');

  const initial = {
    slug: ex.slug,
    name_pl: ex.name_pl,
    name_en: ex.name_en,
    category: ex.category,
    equipment_ref: ex.equipment_ref,
    technique_md: ex.technique_md,
    video_url: ex.video_url,
    locations: ex.locations,
    progressions: ex.progressions.map((p) => ({
      level: p.level,
      variant_name: p.variant_name,
      target_reps_min: p.target_reps_min,
      target_reps_max: p.target_reps_max,
      target_duration_s: p.target_duration_s,
      notes: p.notes
    }))
  };

  return {
    exerciseId: ex.id,
    isArchived: ex.is_archived === 1,
    initial
  };
};

export const actions: Actions = {
  update: async ({ params, request, locals }) => {
    const db = getDb();
    const ex = getExerciseBySlug(db, params.slug ?? '');
    if (!ex) throw error(404, 'Ćwiczenie nie istnieje');

    const form = await request.formData();
    const raw = form.get('payload');
    if (typeof raw !== 'string') return fail(400, { errors: ['Brak danych formularza'] });

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fail(400, { errors: ['Nieprawidłowy format danych'] });
    }

    // Slug niezmienny - wymuszamy oryginał
    parsed.slug = ex.slug;

    const result = validateExerciseInput(parsed);
    if (!result.ok) return fail(400, { errors: result.errors, payload: raw });

    updateExercise(db, ex.id, result.value!);
    throw redirect(303, `${locals.ingressPath}/library/${ex.slug}`);
  },

  archive: async ({ params, locals }) => {
    const db = getDb();
    const ex = getExerciseBySlug(db, params.slug ?? '');
    if (!ex) throw error(404, 'Ćwiczenie nie istnieje');
    setArchived(db, ex.id, true);
    throw redirect(303, `${locals.ingressPath}/library`);
  },

  unarchive: async ({ params, locals }) => {
    const db = getDb();
    const ex = getExerciseBySlug(db, params.slug ?? '');
    if (!ex) throw error(404, 'Ćwiczenie nie istnieje');
    setArchived(db, ex.id, false);
    throw redirect(303, `${locals.ingressPath}/library/${ex.slug}`);
  }
};
