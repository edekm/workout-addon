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
  // ===== PULL =====
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
    slug: 'chin-up',
    name_pl: 'Podciąganie podchwytem',
    name_en: 'Chin-up',
    category: 'pull',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Dead hang chin grip', target_duration_s: 60 },
      { variant_name: 'Australian chin-up', target_reps_min: 8, target_reps_max: 15 },
      { variant_name: 'Negative chin-up', target_reps_min: 5, target_reps_max: 8 },
      { variant_name: 'Band-assisted chin-up', target_reps_min: 6, target_reps_max: 10 },
      { variant_name: 'Chin-up', target_reps_min: 5, target_reps_max: 10 },
      { variant_name: 'Weighted chin-up', target_reps_min: 3, target_reps_max: 8 }
    ]
  },
  {
    slug: 'ring-row',
    name_pl: 'Wiosłowanie na kółkach',
    name_en: 'Ring row',
    category: 'pull',
    equipment_ref: 'rings',
    progressions: [
      { variant_name: 'High row', target_reps_min: 12, target_reps_max: 15, notes: 'ciało prawie pionowo' },
      { variant_name: 'Mid row', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Low row', target_reps_min: 8, target_reps_max: 12, notes: 'ciało poziomo' },
      { variant_name: 'Feet elevated row', target_reps_min: 8, target_reps_max: 12 },
      { variant_name: 'Archer row', target_reps_min: 5, target_reps_max: 8, notes: 'per stronę' }
    ]
  },

  // ===== PUSH =====
  {
    slug: 'push-up',
    name_pl: 'Pompka',
    name_en: 'Push-up',
    category: 'push',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Wall push-up', target_reps_min: 12, target_reps_max: 20 },
      { variant_name: 'Incline push-up', target_reps_min: 10, target_reps_max: 15, notes: 'ręce na ławce' },
      { variant_name: 'Knee push-up', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Standard push-up', target_reps_min: 8, target_reps_max: 15 },
      { variant_name: 'Decline push-up', target_reps_min: 8, target_reps_max: 12, notes: 'nogi na ławce' },
      { variant_name: 'Diamond push-up', target_reps_min: 6, target_reps_max: 12 },
      { variant_name: 'Archer push-up', target_reps_min: 5, target_reps_max: 8, notes: 'per stronę' }
    ]
  },
  {
    slug: 'dip',
    name_pl: 'Pompki na poręczach',
    name_en: 'Dip',
    category: 'push',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Bench dip', target_reps_min: 12, target_reps_max: 15, notes: 'nogi na ziemi' },
      { variant_name: 'Bench dip feet elevated', target_reps_min: 10, target_reps_max: 15 },
      { variant_name: 'Jump-up dip negative', target_reps_min: 5, target_reps_max: 8, notes: 'opuszczanie 3s' },
      { variant_name: 'Parallel bar dip', target_reps_min: 5, target_reps_max: 10 },
      { variant_name: 'Ring dip', target_reps_min: 5, target_reps_max: 8 },
      { variant_name: 'Weighted dip', target_reps_min: 3, target_reps_max: 6 }
    ]
  },
  {
    slug: 'pike-push-up',
    name_pl: 'Pike push-up (pompka w V)',
    name_en: 'Pike push-up',
    category: 'push',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Pike hold', target_duration_s: 30, notes: 'pozycja V, statyczna' },
      { variant_name: 'Pike push-up', target_reps_min: 6, target_reps_max: 12 },
      { variant_name: 'Elevated pike push-up', target_reps_min: 5, target_reps_max: 10, notes: 'nogi na ławce' },
      { variant_name: 'Wall handstand hold', target_duration_s: 45 },
      { variant_name: 'Wall handstand push-up', target_reps_min: 3, target_reps_max: 8 }
    ]
  },
  {
    slug: 'ring-push-up',
    name_pl: 'Pompka na kółkach',
    name_en: 'Ring push-up',
    category: 'push',
    equipment_ref: 'rings',
    progressions: [
      { variant_name: 'Ring push-up neutral', target_reps_min: 6, target_reps_max: 10 },
      { variant_name: 'Deep ring push-up', target_reps_min: 6, target_reps_max: 10, notes: 'większy zakres' },
      { variant_name: 'Ring push-up RTO', target_reps_min: 5, target_reps_max: 8, notes: 'kółka obrócone na zewnątrz' }
    ]
  },

  // ===== LEGS =====
  {
    slug: 'squat',
    name_pl: 'Przysiad',
    name_en: 'Squat',
    category: 'legs',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Assisted squat', target_reps_min: 12, target_reps_max: 20, notes: 'trzymając się słupa' },
      { variant_name: 'Bodyweight squat', target_reps_min: 15, target_reps_max: 25 },
      { variant_name: 'Tempo squat 3-2-X', target_reps_min: 10, target_reps_max: 15, notes: '3s w dół, 2s pauza' },
      { variant_name: 'Bulgarian split squat', target_reps_min: 8, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Pistol squat assisted', target_reps_min: 5, target_reps_max: 8, notes: 'per nogę' },
      { variant_name: 'Pistol squat', target_reps_min: 5, target_reps_max: 8, notes: 'per nogę' }
    ]
  },
  {
    slug: 'lunge',
    name_pl: 'Wykrok',
    name_en: 'Lunge',
    category: 'legs',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Static lunge', target_reps_min: 10, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Walking lunge', target_reps_min: 10, target_reps_max: 15, notes: 'kroków per noga' },
      { variant_name: 'Reverse lunge', target_reps_min: 10, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Deficit lunge', target_reps_min: 8, target_reps_max: 10, notes: 'z podwyższenia, per noga' }
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
      { variant_name: 'Single-leg glute bridge', target_reps_min: 10, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Hip thrust on bench', target_reps_min: 12, target_reps_max: 15, notes: 'plecy na ławce' },
      { variant_name: 'Single-leg hip thrust', target_reps_min: 8, target_reps_max: 12, notes: 'per nogę' }
    ]
  },
  {
    slug: 'step-up',
    name_pl: 'Wejście na podwyższenie',
    name_en: 'Step-up',
    category: 'legs',
    equipment_ref: 'bench',
    progressions: [
      { variant_name: 'Step-up niski', target_reps_min: 12, target_reps_max: 15, notes: 'per nogę' },
      { variant_name: 'Step-up wysoki', target_reps_min: 10, target_reps_max: 12, notes: 'per nogę' },
      { variant_name: 'Step-up explosive', target_reps_min: 8, target_reps_max: 10, notes: 'wybicie, per noga' }
    ]
  },
  {
    slug: 'calf-raise',
    name_pl: 'Wspięcia na palce',
    name_en: 'Calf raise',
    category: 'legs',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Two-leg calf raise', target_reps_min: 20, target_reps_max: 30 },
      { variant_name: 'Two-leg deficit', target_reps_min: 15, target_reps_max: 20, notes: 'z krawędzi' },
      { variant_name: 'Single-leg calf raise', target_reps_min: 12, target_reps_max: 15, notes: 'per nogę' },
      { variant_name: 'Single-leg deficit', target_reps_min: 10, target_reps_max: 15, notes: 'per nogę' }
    ]
  },

  // ===== CORE =====
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
    slug: 'hollow-body-hold',
    name_pl: 'Hollow body hold',
    name_en: 'Hollow body hold',
    category: 'core',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Tuck hollow', target_duration_s: 25, notes: 'kolana podciągnięte' },
      { variant_name: 'Single-leg hollow', target_duration_s: 25 },
      { variant_name: 'Full hollow body', target_duration_s: 40 },
      { variant_name: 'Hollow body rocks', target_reps_min: 20, target_reps_max: 30 }
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
      { variant_name: 'Toes-to-bar', target_reps_min: 5, target_reps_max: 10 },
      { variant_name: 'Windshield wiper', target_reps_min: 5, target_reps_max: 8, notes: 'per stronę' }
    ]
  },
  {
    slug: 'sit-up',
    name_pl: 'Sit-up',
    name_en: 'Sit-up',
    category: 'core',
    equipment_ref: 'bench',
    progressions: [
      { variant_name: 'Crunch', target_reps_min: 15, target_reps_max: 20 },
      { variant_name: 'Full sit-up', target_reps_min: 12, target_reps_max: 20 },
      { variant_name: 'Decline sit-up', target_reps_min: 10, target_reps_max: 15, notes: 'ławka pochylona' },
      { variant_name: 'V-up', target_reps_min: 8, target_reps_max: 12 }
    ]
  },
  {
    slug: 'l-sit',
    name_pl: 'L-sit',
    name_en: 'L-sit',
    category: 'core',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Tuck L-sit', target_duration_s: 15 },
      { variant_name: 'One-leg L-sit', target_duration_s: 12 },
      { variant_name: 'L-sit', target_duration_s: 12 },
      { variant_name: 'L-sit on rings', target_duration_s: 8 }
    ]
  },

  // ===== SKILL =====
  {
    slug: 'muscle-up',
    name_pl: 'Muscle-up',
    name_en: 'Muscle-up',
    category: 'skill',
    equipment_ref: 'rings',
    progressions: [
      { variant_name: 'Strict pull-up >10', target_reps_min: 10, target_reps_max: 10, notes: 'warunek wstępny' },
      { variant_name: 'Explosive pull-up to chest', target_reps_min: 5, target_reps_max: 8 },
      { variant_name: 'Ring transition drill', target_reps_min: 3, target_reps_max: 5 },
      { variant_name: 'Banded muscle-up', target_reps_min: 3, target_reps_max: 5 },
      { variant_name: 'Strict ring muscle-up', target_reps_min: 1, target_reps_max: 3 }
    ]
  },
  {
    slug: 'front-lever',
    name_pl: 'Front lever',
    name_en: 'Front lever',
    category: 'skill',
    equipment_ref: 'rings',
    progressions: [
      { variant_name: 'Tuck front lever', target_duration_s: 15 },
      { variant_name: 'Advanced tuck', target_duration_s: 15, notes: 'plecy poziomo' },
      { variant_name: 'Single-leg front lever', target_duration_s: 10 },
      { variant_name: 'Straddle front lever', target_duration_s: 8 },
      { variant_name: 'Full front lever', target_duration_s: 5 }
    ]
  },
  {
    slug: 'handstand',
    name_pl: 'Stanie na rękach',
    name_en: 'Handstand',
    category: 'skill',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Pike hold', target_duration_s: 45 },
      { variant_name: 'Wall plank', target_duration_s: 30, notes: 'nogi na ścianie poziomo' },
      { variant_name: 'Wall handstand chest-to-wall', target_duration_s: 45 },
      { variant_name: 'Wall handstand back-to-wall', target_duration_s: 30 },
      { variant_name: 'Freestanding handstand', target_duration_s: 15 }
    ]
  },

  // ===== CARDIO =====
  {
    slug: 'bike',
    name_pl: 'Rower stacjonarny',
    name_en: 'Stationary bike',
    category: 'cardio',
    equipment_ref: 'bike',
    progressions: [
      { variant_name: 'Easy steady-state 10 min', target_duration_s: 600 },
      { variant_name: 'Steady-state 20 min', target_duration_s: 1200 },
      { variant_name: 'Steady-state 30 min', target_duration_s: 1800 },
      { variant_name: 'Intervals 30s/30s × 8', target_duration_s: 480, notes: '8 rund' },
      { variant_name: 'Intervals 1min/1min × 10', target_duration_s: 1200, notes: '10 rund' },
      { variant_name: 'Tabata 20/10 × 8', target_duration_s: 240, notes: '8 rund' }
    ]
  },

  // ===== MOBILITY / WARMUP =====
  {
    slug: 'air-walker',
    name_pl: 'Air Walker',
    name_en: 'Air walker',
    category: 'mobility',
    equipment_ref: 'airwalker',
    progressions: [
      { variant_name: 'Easy 5 min', target_duration_s: 300, notes: 'rozgrzewka, mobilność bioder' },
      { variant_name: 'Steady 10 min', target_duration_s: 600 }
    ]
  },
  {
    slug: 'shoulder-dislocations',
    name_pl: 'Shoulder dislocations',
    name_en: 'Shoulder dislocations',
    category: 'mobility',
    equipment_ref: 'floor',
    progressions: [
      { variant_name: 'Wide grip pass-through', target_reps_min: 10, target_reps_max: 15, notes: 'kij/ręcznik/guma' },
      { variant_name: 'Medium grip', target_reps_min: 10, target_reps_max: 15 }
    ]
  },
  {
    slug: 'scap-circles',
    name_pl: 'Krążenia łopatkami w zwisie',
    name_en: 'Scapular circles on bar',
    category: 'mobility',
    equipment_ref: 'pullup_dip',
    progressions: [
      { variant_name: 'Hang + scap circles', target_reps_min: 5, target_reps_max: 8, notes: 'każdy kierunek' }
    ]
  }
];

export function seed(db: Database.Database) {
  const insertExercise = db.prepare(`
    INSERT INTO exercises (slug, name_pl, name_en, category, equipment_ref, technique_md)
    VALUES (@slug, @name_pl, @name_en, @category, @equipment_ref, @technique_md)
  `);
  const insertProgression = db.prepare(`
    INSERT OR IGNORE INTO progressions
      (exercise_id, level, variant_name, target_reps_min, target_reps_max, target_duration_s, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const findExerciseBySlug = db.prepare('SELECT id FROM exercises WHERE slug = ?');

  const tx = db.transaction(() => {
    for (const ex of EXERCISES) {
      let exId: number;
      const existing = findExerciseBySlug.get(ex.slug) as { id: number } | undefined;
      if (existing) {
        exId = existing.id;
      } else {
        const info = insertExercise.run({
          slug: ex.slug,
          name_pl: ex.name_pl,
          name_en: ex.name_en ?? null,
          category: ex.category,
          equipment_ref: ex.equipment_ref,
          technique_md: ex.technique_md ?? null
        });
        exId = Number(info.lastInsertRowid);
      }
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
