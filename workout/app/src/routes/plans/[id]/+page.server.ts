import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import {
  deletePlan,
  duplicatePlan,
  getPlanById,
  updatePlan,
  validatePlanInput,
  setActivePlan
} from '$lib/server/db/plans';
import { listExercises } from '$lib/server/db/library';

function parseId(raw: string | undefined): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw error(400, 'Bad plan id');
  return id;
}

export const load: ServerLoad = ({ params }) => {
  const db = getDb();
  const planId = parseId(params.id);
  const plan = getPlanById(db, planId);
  if (!plan) throw error(404, 'Plan nie istnieje');

  const choices = listExercises(db, { includeArchived: false }).map((e) => ({
    id: e.id,
    name_pl: e.name_pl,
    category: e.category,
    locations: e.locations
  }));

  // Wskaż dla których userów ten plan jest obecnie aktywny
  const activeFor = db
    .prepare('SELECT slot, name FROM users WHERE active_plan_id = ? ORDER BY slot')
    .all(planId) as Array<{ slot: string; name: string }>;

  const users = db
    .prepare('SELECT id, slot, name, active_plan_id FROM users ORDER BY slot')
    .all() as Array<{ id: number; slot: string; name: string; active_plan_id: number | null }>;

  const initial = {
    name: plan.name,
    description: plan.description,
    days: plan.days.map((d) => ({
      label: d.label,
      items: d.items.map((it) => ({
        exercise_id: it.exercise_id,
        start_level: it.start_level,
        target_sets: it.target_sets,
        rest_seconds: it.rest_seconds,
        notes: it.notes
      }))
    }))
  };

  return { planId, initial, choices, activeFor, users };
};

export const actions: Actions = {
  update: async ({ params, request, locals }) => {
    const db = getDb();
    const planId = parseId(params.id);
    const plan = getPlanById(db, planId);
    if (!plan) throw error(404, 'Plan nie istnieje');

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

    updatePlan(db, planId, result.value!);
    throw redirect(303, `${locals.ingressPath}/plans/${planId}`);
  },

  delete: async ({ params, locals }) => {
    const db = getDb();
    const planId = parseId(params.id);
    deletePlan(db, planId);
    throw redirect(303, `${locals.ingressPath}/plans`);
  },

  duplicate: async ({ params, locals }) => {
    const db = getDb();
    const planId = parseId(params.id);
    const plan = getPlanById(db, planId);
    if (!plan) throw error(404, 'Plan nie istnieje');
    const newId = duplicatePlan(db, planId, `${plan.name} (kopia)`);
    if (!newId) throw error(500, 'Nie udało się zduplikować planu');
    throw redirect(303, `${locals.ingressPath}/plans/${newId}`);
  },

  setActive: async ({ params, request, locals }) => {
    const db = getDb();
    const planId = parseId(params.id);
    const form = await request.formData();
    const slot = form.get('slot');
    if (slot !== 'user1' && slot !== 'user2') return fail(400, { errors: ['Bad slot'] });

    const user = db.prepare('SELECT id FROM users WHERE slot = ?').get(slot) as
      | { id: number }
      | undefined;
    if (!user) throw error(404, 'User nie istnieje');

    setActivePlan(db, user.id, planId);
    throw redirect(303, `${locals.ingressPath}/plans/${planId}`);
  }
};
