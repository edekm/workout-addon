import { fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createExercise, getExerciseBySlug, validateExerciseInput } from '$lib/server/db/library';

export const load: ServerLoad = () => {
  return {
    initial: {
      slug: '',
      name_pl: '',
      name_en: null,
      category: 'push' as const,
      equipment_ref: 'floor',
      technique_md: null,
      video_url: null,
      locations: ['gym1' as const],
      progressions: [
        {
          level: 1,
          variant_name: '',
          target_reps_min: 8,
          target_reps_max: 12,
          target_duration_s: null,
          notes: null
        }
      ]
    }
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const db = getDb();
    const form = await request.formData();
    const raw = form.get('payload');
    if (typeof raw !== 'string') return fail(400, { errors: ['Brak danych formularza'] });

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return fail(400, { errors: ['Nieprawidłowy format danych'] });
    }

    const result = validateExerciseInput(parsed);
    if (!result.ok) return fail(400, { errors: result.errors, payload: raw });

    // Slug musi być unikalny
    const existing = getExerciseBySlug(db, result.value!.slug);
    if (existing) {
      return fail(400, {
        errors: [`Ćwiczenie o slugu "${result.value!.slug}" już istnieje`],
        payload: raw
      });
    }

    createExercise(db, result.value!);
    throw redirect(303, `${locals.ingressPath}/library/${result.value!.slug}`);
  }
};
