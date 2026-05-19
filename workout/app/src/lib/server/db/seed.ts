import type Database from 'better-sqlite3';

type ProgressionSeed = {
  variant_name: string;
  target_reps_min?: number;
  target_reps_max?: number;
  target_duration_s?: number;
  notes?: string;
};

type ExerciseSeed = {
  slug: string;
  name_pl: string;
  name_en?: string;
  category: 'pull' | 'push' | 'legs' | 'core' | 'cardio' | 'mobility' | 'skill';
  equipment_ref: string;
  technique_md?: string;
  progressions: ProgressionSeed[];
};

const EXERCISES: ExerciseSeed[] = [
  {
    slug: 'pull-up',
    name_pl: 'Podciąganie nachwytem',
    name_en: 'Pull-up',
    category: 'pull',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Dead hang', target_duration_s: 60, notes: 'budowa chwytu' },
      { variant_name: 'Scapular pull', target_reps_min: 8, target_reps_max: 12 },
      { variant_name: 'Australian pull-up', target_reps_min: 8, target_reps_max: 15 },
      { variant_name: 'Negative pull-up', target_reps_min: 5, target_reps_max: 8 },
      { variant_name: 'Band-assisted pull-up', target_reps_min: 6, target_reps_max: 10 },
      { variant_name: 'Pull-up', target_reps_min: 5, target_reps_max: 10 },
      { variant_name: 'Weighted / archer pull-up', target_reps_min: 3, target_reps_max: 8 }
    ]
  },
  {
    slug: 'ring-row',
    name_pl: 'Wiosłowanie na kółkach',
    name_en: 'Ring row',
    category: 'pull',
    equipment_ref: 'rings',
    progressions: [
      { variant_name: 'High row', target_reps_min: 12, target_reps_max: 15 },
      { variant_name: 'Mid row', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Low row', target_reps_min: 8, target_reps_max: 12 },
      { variant_name: 'Feet elevated row', target_reps_min: 8, target_reps_max: 12 },
      { variant_name: 'Archer row', target_reps_min: 5, target_reps_max: 8 }
    ]
  },
  {
    slug: 'push-up',
    name_pl: 'Pompka',
    name_en: 'Push-up',
    category: 'push',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Wall push-up', target_reps_min: 12, target_reps_max: 20 },
      { variant_name: 'Incline push-up', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Knee push-up', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Standard push-up', target_reps_min: 8, target_reps_max: 15 },
      { variant_name: 'Decline push-up', target_reps_min: 8, target_reps_max: 12 },
      { variant_name: 'Diamond push-up', target_reps_min: 6, target_reps_max: 12 }
    ]
  },
  {
    slug: 'dip',
    name_pl: 'Pompki na poręczach',
    name_en: 'Dip',
    category: 'push',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Bench dip', target_reps_min: 12, target_reps_max: 15 },
      { variant_name: 'Bench dip feet elevated', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Jump-up dip negative', target_reps_min: 5, target_reps_max: 8 },
      { variant_name: 'Parallel bar dip', target_reps_min: 5, target_reps_max: 10 },
      { variant_name: 'Ring dip', target_reps_min: 5, target_reps_max: 8 }
    ]
  },
  {
    slug: 'bulgarian-split-squat',
    name_pl: 'Bulgarian split squat',
    name_en: 'Bulgarian split squat',
    category: 'legs',
    equipment_ref: 'bench',
    progressions: [
      { variant_name: 'Static lunge', target_reps_min: 10, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Bulgarian split squat', target_reps_min: 8, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Deficit Bulgarian', target_reps_min: 6, target_reps_max: 10, notes: 'per nogę' }
    ]
  },
  {
    slug: 'glute-bridge',
    name_pl: 'Most pośladkowy',
    name_en: 'Glute bridge',
    category: 'legs',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Two-leg glute bridge', target_reps_min: 15, target_reps_max: 20 },
      { variant_name: 'Two-leg bridge pause 2s', target_reps_min: 12, target_reps_max: 15 },
      { variant_name: 'Single-leg glute bridge', target_reps_min: 10, target_reps_max: 12 },
      { variant_name: 'Hip thrust on bench', target_reps_min: 12, target_reps_max: 15 }
    ]
  },
  {
    slug: 'plank',
    name_pl: 'Deska',
    name_en: 'Plank',
    category: 'core',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Knee plank', target_duration_s: 30 },
      { variant_name: 'Standard plank', target_duration_s: 45 },
      { variant_name: 'Long plank', target_duration_s: 75 },
      { variant_name: 'RKC plank', target_duration_s: 30, notes: 'maks spięcie' }
    ]
  },
  {
    slug: 'hanging-knee-raise',
    name_pl: 'Unoszenie kolan w zwisie',
    name_en: 'Hanging knee raise',
    category: 'core',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Hanging knee raise', target_reps_min: 8, target_reps_max: 12 },
      { variant_name: 'Hanging knee raise slow', target_reps_min: 6, target_reps_max: 10 },
      { variant_name: 'Hanging straight leg raise', target_reps_min: 6, target_reps_max: 10 },
      { variant_name: 'Toes-to-bar', target_reps_min: 5, target_reps_max: 10 }
    ]
  },
  {
    slug: 'bike',
    name_pl: 'Rower stacjonarny',
    name_en: 'Stationary bike',
    category: 'cardio',
    equipment_ref: 'bike',
    progressions: [
      { variant_name: 'Easy steady-state 10 min', target_duration_s: 600 },
      { variant_name: 'Steady-state 20 min', target_duration_s: 1200 },
      { variant_name: 'Intervals 30s/30s × 8', target_duration_s: 480, notes: '8 rund' },
      { variant_name: 'Intervals 1min/1min × 10', target_duration_s: 1200, notes: '10 rund' },
      { variant_name: 'Tabata 20/10 × 8', target_duration_s: 240, notes: '8 rund' }
    ]
  },
  {
    slug: 'air-walker',
    name_pl: 'Air Walker',
    name_en: 'Air walker',
    category: 'mobility',
    equipment_ref: 'airwalker',
    progressions: [
      { variant_name: 'Easy 5 min', target_duration_s: 300, notes: 'rozgrzewka' },
      { variant_name: 'Steady 10 min', target_duration_s: 600 }
    ]
  }
];

export function seed(db: Database.Database) {
  const insertExercise = db.prepare(`
    INSERT INTO exercises (slug, name_pl, name_en, category, equipment_ref, technique_md)
    VALUES (@slug, @name_pl, @name_en, @category, @equipment_ref, @technique_md)
  `);
  const insertProgression = db.prepare(`
    INSERT INTO progressions
      (exercise_id, level, variant_name, target_reps_min, target_reps_max, target_duration_s, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const ex of EXERCISES) {
      const info = insertExercise.run({
        slug: ex.slug,
        name_pl: ex.name_pl,
        name_en: ex.name_en ?? null,
        category: ex.category,
        equipment_ref: ex.equipment_ref,
        technique_md: ex.technique_md ?? null
      });
      const exId = Number(info.lastInsertRowid);
      ex.progressions.forEach((p, idx) => {
        insertProgression.run(
          exId,
          idx + 1,
          p.variant_name,
          p.target_reps_min ?? null,
          p.target_reps_max ?? null,
          p.target_duration_s ?? null,
          p.notes ?? null
        );
      });
    }
  });
  tx();
}
