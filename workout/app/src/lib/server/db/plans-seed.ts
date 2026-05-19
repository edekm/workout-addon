import type Database from 'better-sqlite3';

type PlanDayItem = {
  slug: string;
  start_level: number;
  target_sets: number;
  rest_seconds?: number;
  notes?: string;
};

type PlanDay = {
  label: string;
  items: PlanDayItem[];
};

type StarterPlan = {
  user_slot: 'user1' | 'user2';
  name: string;
  description: string;
  days: PlanDay[];
};

// Plany używają tylko ćwiczeń obecnych w seed (exercises slug),
// czyli: pull-up, ring-row, push-up, dip, bulgarian-split-squat,
// glute-bridge, plank, hanging-knee-raise, bike, air-walker.
const PLANS: StarterPlan[] = [
  {
    user_slot: 'user1',
    name: 'Full-body 3x — siła i kalistenika',
    description: 'A: pull · B: push · C: legs + core. 3x/tydzień, fokus na progresję do skill-i.',
    days: [
      {
        label: 'A · Pull',
        items: [
          { slug: 'pull-up', start_level: 1, target_sets: 4, rest_seconds: 120, notes: 'główne pull' },
          { slug: 'ring-row', start_level: 1, target_sets: 3, rest_seconds: 90 },
          { slug: 'dip', start_level: 1, target_sets: 3, rest_seconds: 90, notes: 'przeciwwaga push' },
          { slug: 'hanging-knee-raise', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'finisher' }
        ]
      },
      {
        label: 'B · Push',
        items: [
          { slug: 'push-up', start_level: 1, target_sets: 4, rest_seconds: 90, notes: 'główne push' },
          { slug: 'dip', start_level: 1, target_sets: 3, rest_seconds: 90 },
          { slug: 'pull-up', start_level: 1, target_sets: 3, rest_seconds: 60, notes: 'scapular - aktywacja' },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0 }
        ]
      },
      {
        label: 'C · Legs + Core',
        items: [
          { slug: 'bulgarian-split-squat', start_level: 1, target_sets: 4, rest_seconds: 90, notes: 'główne nogi' },
          { slug: 'glute-bridge', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'hanging-knee-raise', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'air-walker', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'cooldown' }
        ]
      }
    ]
  },
  {
    user_slot: 'user2',
    name: 'Full-body 3x — sylwetka i kondycja',
    description: 'A: lower-heavy · B: upper + cardio · C: lower + core. 3x/tydzień, fokus na pośladki i wytrzymałość.',
    days: [
      {
        label: 'A · Lower-heavy',
        items: [
          { slug: 'bulgarian-split-squat', start_level: 1, target_sets: 4, rest_seconds: 75, notes: 'główne nogi' },
          { slug: 'glute-bridge', start_level: 1, target_sets: 4, rest_seconds: 60, notes: 'pośladki - izolacja' },
          { slug: 'push-up', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'interwały finisher' }
        ]
      },
      {
        label: 'B · Upper + Cardio',
        items: [
          { slug: 'push-up', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'ring-row', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'dip', start_level: 1, target_sets: 3, rest_seconds: 60, notes: 'bench dip - triceps' },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'steady-state główne cardio' }
        ]
      },
      {
        label: 'C · Lower + Core',
        items: [
          { slug: 'bulgarian-split-squat', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'glute-bridge', start_level: 1, target_sets: 4, rest_seconds: 60, notes: 'single-leg' },
          { slug: 'hanging-knee-raise', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'tabata finisher' }
        ]
      }
    ]
  }
];

export function seedPlans(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM plans').get() as { n: number }).n;
  if (count > 0) return;

  const getUserId = db.prepare('SELECT id FROM users WHERE slot = ?');
  const getExerciseId = db.prepare('SELECT id FROM exercises WHERE slug = ?');
  const insertPlan = db.prepare(`
    INSERT INTO plans (user_id, name, description, is_active)
    VALUES (?, ?, ?, 1)
  `);
  const insertPlanExercise = db.prepare(`
    INSERT INTO plan_exercises
      (plan_id, day_label, ord, exercise_id, start_level, target_sets, rest_seconds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const plan of PLANS) {
      const user = getUserId.get(plan.user_slot) as { id: number } | undefined;
      if (!user) continue;
      const planInfo = insertPlan.run(user.id, plan.name, plan.description);
      const planId = Number(planInfo.lastInsertRowid);

      for (const day of plan.days) {
        day.items.forEach((item, idx) => {
          const ex = getExerciseId.get(item.slug) as { id: number } | undefined;
          if (!ex) return;
          insertPlanExercise.run(
            planId,
            day.label,
            idx + 1,
            ex.id,
            item.start_level,
            item.target_sets,
            item.rest_seconds ?? 90,
            item.notes ?? null
          );
        });
      }
    }
  });
  tx();
}
