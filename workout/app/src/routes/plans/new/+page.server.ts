import { fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { createPlan, validatePlanInput } from '$lib/server/db/plans';
import { listExercises } from '$lib/server/db/library';

export const load: ServerLoad = () => {
  const db = getDb();
  const choices = listExercises(db, { includeArchived: false }).map((e) => ({
    id: e.id,
    name_pl: e.name_pl,
    category: e.category,
    locations: e.locations
  }));
  return {
    initial: {
      name: '',
      description: null,
      days: [{ label: 'A', items: [] }]
    },
    choices
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

    const result = validatePlanInput(parsed);
    if (!result.ok) return fail(400, { errors: result.errors, payload: raw });

    const planId = createPlan(db, result.value!);
    throw redirect(303, `${locals.ingressPath}/plans/${planId}`);
  }
};
