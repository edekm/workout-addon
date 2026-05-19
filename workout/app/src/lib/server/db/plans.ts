import type Database from 'better-sqlite3';

export type PlanRow = {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
};

export type PlanExerciseInput = {
  exercise_id: number;
  start_level: number;
  target_sets: number;
  rest_seconds: number;
  notes: string | null;
};

export type PlanDayInput = {
  label: string;
  items: PlanExerciseInput[];
};

export type PlanInput = {
  name: string;
  description: string | null;
  days: PlanDayInput[];
};

export type PlanExerciseRow = {
  pe_id: number;
  plan_id: number;
  day_label: string;
  ord: number;
  exercise_id: number;
  start_level: number;
  target_sets: number;
  rest_seconds: number;
  notes: string | null;
};

export type PlanSummary = PlanRow & {
  days_count: number;
  exercises_count: number;
  active_for: string[]; // sloty userów dla których ten plan jest aktywny
};

export type PlanWithDays = PlanRow & {
  days: Array<{
    label: string;
    items: Array<
      PlanExerciseRow & {
        exercise_name_pl: string;
        exercise_slug: string;
        exercise_category: string;
      }
    >;
  }>;
};

// ----------- Walidacja -----------

export function validatePlanInput(input: Partial<PlanInput>): {
  ok: boolean;
  errors: string[];
  value?: PlanInput;
} {
  const errors: string[] = [];

  const name = (input.name ?? '').trim();
  if (!name || name.length > 100) {
    errors.push('Nazwa: wymagana, max 100 znaków');
  }

  const description = input.description?.trim() || null;
  if (description && description.length > 500) {
    errors.push('Opis: max 500 znaków');
  }

  const days = input.days ?? [];
  if (days.length === 0) errors.push('Dni: dodaj co najmniej jeden dzień');
  if (days.length > 14) errors.push('Dni: max 14');

  const seenLabels = new Set<string>();
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const label = (d.label ?? '').trim();
    if (!label || label.length > 60) {
      errors.push(`Dzień #${i + 1}: nazwa wymagana, max 60 znaków`);
    } else if (seenLabels.has(label)) {
      errors.push(`Dzień #${i + 1}: zduplikowana nazwa "${label}"`);
    } else {
      seenLabels.add(label);
    }
    const items = d.items ?? [];
    if (items.length === 0) {
      errors.push(`Dzień #${i + 1}: dodaj co najmniej jedno ćwiczenie`);
    }
    if (items.length > 30) {
      errors.push(`Dzień #${i + 1}: max 30 ćwiczeń`);
    }
    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      const exId = Number(it.exercise_id);
      if (!Number.isInteger(exId) || exId <= 0) {
        errors.push(`Dzień #${i + 1}, poz. ${j + 1}: brak ćwiczenia`);
      }
      const lvl = Number(it.start_level);
      if (!Number.isInteger(lvl) || lvl < 1 || lvl > 20) {
        errors.push(`Dzień #${i + 1}, poz. ${j + 1}: poziom 1-20`);
      }
      const sets = Number(it.target_sets);
      if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
        errors.push(`Dzień #${i + 1}, poz. ${j + 1}: serie 1-20`);
      }
      const rest = Number(it.rest_seconds);
      if (!Number.isInteger(rest) || rest < 0 || rest > 600) {
        errors.push(`Dzień #${i + 1}, poz. ${j + 1}: odpoczynek 0-600 sek.`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const value: PlanInput = {
    name,
    description,
    days: days.map((d) => ({
      label: (d.label ?? '').trim(),
      items: (d.items ?? []).map((it) => ({
        exercise_id: Number(it.exercise_id),
        start_level: Number(it.start_level),
        target_sets: Number(it.target_sets),
        rest_seconds: Number(it.rest_seconds),
        notes: it.notes?.trim() || null
      }))
    }))
  };
  return { ok: true, errors: [], value };
}

// ----------- Zapytania -----------

export function listPlans(db: Database.Database): PlanSummary[] {
  const plans = db
    .prepare('SELECT id, name, description, created_at FROM plans ORDER BY created_at ASC')
    .all() as PlanRow[];

  const stmtCounts = db.prepare(
    `SELECT
       COUNT(DISTINCT day_label) AS days_count,
       COUNT(*) AS exercises_count
     FROM plan_exercises WHERE plan_id = ?`
  );
  const stmtActiveFor = db.prepare(
    `SELECT slot FROM users WHERE active_plan_id = ? ORDER BY slot`
  );

  return plans.map((p) => {
    const counts = stmtCounts.get(p.id) as {
      days_count: number;
      exercises_count: number;
    };
    const slots = (stmtActiveFor.all(p.id) as Array<{ slot: string }>).map((x) => x.slot);
    return {
      ...p,
      days_count: counts.days_count,
      exercises_count: counts.exercises_count,
      active_for: slots
    };
  });
}

export function getPlanById(db: Database.Database, id: number): PlanWithDays | null {
  const plan = db
    .prepare('SELECT id, name, description, created_at FROM plans WHERE id = ?')
    .get(id) as PlanRow | undefined;
  if (!plan) return null;

  const rows = db
    .prepare(
      `SELECT
         pe.id AS pe_id, pe.plan_id, pe.day_label, pe.ord, pe.exercise_id,
         pe.start_level, pe.target_sets, pe.rest_seconds, pe.notes,
         e.name_pl AS exercise_name_pl, e.slug AS exercise_slug,
         e.category AS exercise_category
       FROM plan_exercises pe
       JOIN exercises e ON e.id = pe.exercise_id
       WHERE pe.plan_id = ?
       ORDER BY pe.day_label, pe.ord`
    )
    .all(id) as Array<
    PlanExerciseRow & {
      exercise_name_pl: string;
      exercise_slug: string;
      exercise_category: string;
    }
  >;

  // Stabilna kolejność dni: kolejność pierwszego wystąpienia
  const daysMap = new Map<string, PlanWithDays['days'][number]>();
  for (const r of rows) {
    if (!daysMap.has(r.day_label)) {
      daysMap.set(r.day_label, { label: r.day_label, items: [] });
    }
    daysMap.get(r.day_label)!.items.push(r);
  }
  // Sortujemy items per day po ord
  for (const d of daysMap.values()) d.items.sort((a, b) => a.ord - b.ord);

  return { ...plan, days: Array.from(daysMap.values()) };
}

export function createPlan(db: Database.Database, input: PlanInput): number {
  return db.transaction(() => {
    const info = db
      .prepare('INSERT INTO plans (name, description) VALUES (?, ?)')
      .run(input.name, input.description);
    const planId = Number(info.lastInsertRowid);
    writePlanExercises(db, planId, input);
    return planId;
  })();
}

export function updatePlan(db: Database.Database, id: number, input: PlanInput): void {
  db.transaction(() => {
    db.prepare('UPDATE plans SET name = ?, description = ? WHERE id = ?').run(
      input.name,
      input.description,
      id
    );
    db.prepare('DELETE FROM plan_exercises WHERE plan_id = ?').run(id);
    writePlanExercises(db, id, input);
  })();
}

function writePlanExercises(db: Database.Database, planId: number, input: PlanInput) {
  const insert = db.prepare(
    `INSERT INTO plan_exercises
       (plan_id, day_label, ord, exercise_id, start_level, target_sets, rest_seconds, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const day of input.days) {
    day.items.forEach((it, idx) => {
      insert.run(
        planId,
        day.label,
        idx + 1,
        it.exercise_id,
        it.start_level,
        it.target_sets,
        it.rest_seconds,
        it.notes
      );
    });
  }
}

export function deletePlan(db: Database.Database, id: number): void {
  // CASCADE w schema usuwa plan_exercises. Sessions.plan_id ma ON DELETE SET NULL
  // - historia treningów zostaje. Users.active_plan_id też SET NULL.
  db.prepare('DELETE FROM plans WHERE id = ?').run(id);
}

export function duplicatePlan(db: Database.Database, sourceId: number, newName: string): number | null {
  const src = getPlanById(db, sourceId);
  if (!src) return null;
  const input: PlanInput = {
    name: newName,
    description: src.description,
    days: src.days.map((d) => ({
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
  return createPlan(db, input);
}

export function setActivePlan(
  db: Database.Database,
  userId: number,
  planId: number | null
): void {
  if (planId !== null) {
    const exists = db.prepare('SELECT 1 FROM plans WHERE id = ?').get(planId);
    if (!exists) throw new Error('Plan nie istnieje');
  }
  db.prepare('UPDATE users SET active_plan_id = ? WHERE id = ?').run(planId, userId);
}
