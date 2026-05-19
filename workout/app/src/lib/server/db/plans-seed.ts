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
  // owner_slot wskazuje któremu userowi ustawić ten plan jako aktywny przy seedzie.
  // Plany są wspólne - oboje mogą używać dowolnego z istniejących planów.
  owner_slot: 'user1' | 'user2';
  name: string;
  description: string;
  days: PlanDay[];
};

const PLANS: StarterPlan[] = [
  {
    owner_slot: 'user1',
    name: 'Full-body 3x — siła i kalistenika',
    description: 'A: pull · B: push · C: legs + core. 3x/tydzień, fokus na progresję do skill-i.',
    days: [
      {
        label: 'A · Pull',
        items: [
          { slug: 'scap-circles', start_level: 1, target_sets: 2, rest_seconds: 30, notes: 'aktywacja barków' },
          { slug: 'pull-up', start_level: 1, target_sets: 4, rest_seconds: 120, notes: 'główne pull' },
          { slug: 'chin-up', start_level: 1, target_sets: 3, rest_seconds: 90, notes: 'secondary pull, więcej bicepsa' },
          { slug: 'ring-row', start_level: 1, target_sets: 3, rest_seconds: 75 },
          { slug: 'hanging-knee-raise', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'easy cooldown' }
        ]
      },
      {
        label: 'B · Push',
        items: [
          { slug: 'push-up', start_level: 1, target_sets: 4, rest_seconds: 90, notes: 'główne push' },
          { slug: 'dip', start_level: 1, target_sets: 4, rest_seconds: 90, notes: 'klatka + triceps' },
          { slug: 'pike-push-up', start_level: 1, target_sets: 3, rest_seconds: 75, notes: 'progresja do handstand' },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'hollow-body-hold', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'steady' }
        ]
      },
      {
        label: 'C · Legs + Core',
        items: [
          { slug: 'squat', start_level: 1, target_sets: 4, rest_seconds: 90, notes: 'główne nogi' },
          { slug: 'bulgarian-split-squat', start_level: 1, target_sets: 3, rest_seconds: 75, notes: 'single-leg' },
          { slug: 'glute-bridge', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'calf-raise', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'sit-up', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'air-walker', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'cooldown 5 min' }
        ]
      }
    ]
  },
  {
    owner_slot: 'user2',
    name: 'Full-body 3x — sylwetka i kondycja',
    description: 'A: lower-heavy · B: upper + cardio · C: lower + core. 3x/tydzień, fokus na pośladki i wytrzymałość.',
    days: [
      {
        label: 'A · Lower-heavy',
        items: [
          { slug: 'squat', start_level: 1, target_sets: 4, rest_seconds: 75, notes: 'główne nogi' },
          { slug: 'glute-bridge', start_level: 1, target_sets: 4, rest_seconds: 60, notes: 'pośladki - izolacja' },
          { slug: 'bulgarian-split-squat', start_level: 1, target_sets: 3, rest_seconds: 60, notes: 'single-leg' },
          { slug: 'calf-raise', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'interwały finisher' }
        ]
      },
      {
        label: 'B · Upper + Cardio',
        items: [
          { slug: 'push-up', start_level: 1, target_sets: 3, rest_seconds: 75 },
          { slug: 'ring-row', start_level: 1, target_sets: 3, rest_seconds: 60 },
          { slug: 'pike-push-up', start_level: 1, target_sets: 2, rest_seconds: 60, notes: 'pike hold na start' },
          { slug: 'sit-up', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'plank', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'steady-state - main cardio' }
        ]
      },
      {
        label: 'C · Lower + Core',
        items: [
          { slug: 'lunge', start_level: 1, target_sets: 3, rest_seconds: 60, notes: 'dynamic single-leg' },
          { slug: 'glute-bridge', start_level: 1, target_sets: 4, rest_seconds: 60, notes: 'idź w stronę single-leg' },
          { slug: 'step-up', start_level: 1, target_sets: 3, rest_seconds: 45, notes: 'functional' },
          { slug: 'hollow-body-hold', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'sit-up', start_level: 1, target_sets: 3, rest_seconds: 45 },
          { slug: 'bike', start_level: 1, target_sets: 1, rest_seconds: 0, notes: 'tabata finisher' }
        ]
      }
    ]
  }
];

export function seedPlans(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM plans').get() as { n: number }).n;
  if (count > 0) return;
  doSeedPlans(db);
}

function doSeedPlans(db: Database.Database) {
  const getUserId = db.prepare('SELECT id FROM users WHERE slot = ?');
  const getExerciseId = db.prepare('SELECT id FROM exercises WHERE slug = ?');
  const insertPlan = db.prepare(`
    INSERT INTO plans (name, description) VALUES (?, ?)
  `);
  const insertPlanExercise = db.prepare(`
    INSERT INTO plan_exercises
      (plan_id, day_label, ord, exercise_id, start_level, target_sets, rest_seconds, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const setActivePlan = db.prepare('UPDATE users SET active_plan_id = ? WHERE id = ?');

  const tx = db.transaction(() => {
    for (const plan of PLANS) {
      const planInfo = insertPlan.run(plan.name, plan.description);
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

      // Ustaw plan jako aktywny dla seedowanego owner_slot (tylko jeśli user nie ma już aktywnego)
      const owner = getUserId.get(plan.owner_slot) as { id: number } | undefined;
      if (owner) {
        const u = db
          .prepare('SELECT active_plan_id FROM users WHERE id = ?')
          .get(owner.id) as { active_plan_id: number | null } | undefined;
        if (u && u.active_plan_id == null) {
          setActivePlan.run(planId, owner.id);
        }
      }
    }
  });
  tx();
}

/**
 * Migracja v2 - jednorazowo nadpisuje istniejące plany M i G nowymi wersjami
 * (rozbudowane o ćwiczenia z biblioteki 0.8.0). Sesje powiązane z usuwanymi
 * planami zachowują się dzięki ON DELETE SET NULL na sessions.plan_id -
 * historia treningów pozostaje, tylko traci wskaźnik do planu.
 *
 * Po wykonaniu zaznacza się w meta - kolejny start addona nie wykona ponownie.
 */
export function migrateRefreshPlans_v2(db: Database.Database) {
  const done = db
    .prepare('SELECT value FROM meta WHERE key = ?')
    .get('migration_v2_refresh_plans') as { value: string } | undefined;
  if (done) return;

  db.transaction(() => {
    // Czyścimy istniejące plany seedowanych userów (user1, user2)
    db.prepare(
      `DELETE FROM plans WHERE user_id IN (
         SELECT id FROM users WHERE slot IN ('user1', 'user2')
       )`
    ).run();
    // CASCADE w schema usuwa plan_exercises

    // Reseedujemy świeże
    doSeedPlans(db);

    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
      'migration_v2_refresh_plans',
      '1'
    );
  })();
}
