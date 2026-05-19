import type Database from 'better-sqlite3';

export const LOCATIONS = ['gym1', 'gym2', 'home'] as const;
export type Location = (typeof LOCATIONS)[number];

export const CATEGORIES = [
  'pull',
  'push',
  'legs',
  'core',
  'cardio',
  'mobility',
  'skill'
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LOCATION_LABELS: Record<Location, string> = {
  gym1: 'Siłownia 1',
  gym2: 'Siłownia 2',
  home: 'Dom'
};

export const CATEGORY_LABELS: Record<Category, string> = {
  pull: 'Pull',
  push: 'Push',
  legs: 'Nogi',
  core: 'Core',
  cardio: 'Cardio',
  mobility: 'Mobility',
  skill: 'Skill'
};

export type ExerciseRow = {
  id: number;
  slug: string;
  name_pl: string;
  name_en: string | null;
  category: Category;
  equipment_ref: string;
  technique_md: string | null;
  video_url: string | null;
  is_archived: number;
};

export type ProgressionRow = {
  id: number;
  exercise_id: number;
  level: number;
  variant_name: string;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
  notes: string | null;
};

export type ExerciseWithRelations = ExerciseRow & {
  locations: Location[];
  progressions: ProgressionRow[];
};

export type ExerciseSummary = ExerciseRow & {
  locations: Location[];
  progressions_count: number;
};

export type ProgressionInput = {
  level: number;
  variant_name: string;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_duration_s: number | null;
  notes: string | null;
};

export type ExerciseInput = {
  slug: string;
  name_pl: string;
  name_en: string | null;
  category: Category;
  equipment_ref: string;
  technique_md: string | null;
  video_url: string | null;
  locations: Location[];
  progressions: ProgressionInput[];
};

// ----------- Walidacja -----------

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;

export function validateExerciseInput(input: Partial<ExerciseInput>): {
  ok: boolean;
  errors: string[];
  value?: ExerciseInput;
} {
  const errors: string[] = [];

  const slug = (input.slug ?? '').trim();
  if (!SLUG_PATTERN.test(slug)) {
    errors.push('Slug: małe litery, cyfry i myślniki, 2-64 znaków');
  }

  const name_pl = (input.name_pl ?? '').trim();
  if (!name_pl || name_pl.length > 80) {
    errors.push('Nazwa PL: wymagana, max 80 znaków');
  }

  const name_en = input.name_en?.trim() || null;
  if (name_en && name_en.length > 80) errors.push('Nazwa EN: max 80 znaków');

  const category = input.category;
  if (!category || !CATEGORIES.includes(category as Category)) {
    errors.push('Kategoria: wymagana, jedna z: ' + CATEGORIES.join(', '));
  }

  const equipment_ref = (input.equipment_ref ?? '').trim();
  if (!equipment_ref || equipment_ref.length > 40) {
    errors.push('Sprzęt: wymagany, max 40 znaków');
  }

  const technique_md = input.technique_md?.trim() || null;
  if (technique_md && technique_md.length > 2000) {
    errors.push('Technika: max 2000 znaków');
  }

  const video_url = input.video_url?.trim() || null;
  if (video_url) {
    if (video_url.length > 300) errors.push('Video URL: max 300 znaków');
    if (!/^https?:\/\//.test(video_url)) errors.push('Video URL: musi zaczynać się od http(s)://');
  }

  const locations = input.locations ?? [];
  const validLocs = locations.filter((l) => LOCATIONS.includes(l));
  if (validLocs.length === 0) errors.push('Lokalizacja: wybierz co najmniej jedną');

  const progressions = input.progressions ?? [];
  if (progressions.length === 0) errors.push('Progresje: dodaj co najmniej jeden poziom');
  if (progressions.length > 20) errors.push('Progresje: max 20 poziomów');

  const seenLevels = new Set<number>();
  for (let i = 0; i < progressions.length; i++) {
    const p = progressions[i];
    const lvl = Number(p.level);
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > 20) {
      errors.push(`Progresja #${i + 1}: poziom musi być 1-20`);
    } else if (seenLevels.has(lvl)) {
      errors.push(`Progresja #${i + 1}: powtórzony poziom ${lvl}`);
    } else {
      seenLevels.add(lvl);
    }
    const variant = (p.variant_name ?? '').trim();
    if (!variant || variant.length > 80) {
      errors.push(`Progresja #${i + 1}: nazwa wariantu wymagana, max 80 znaków`);
    }
    const hasReps =
      p.target_reps_min != null && p.target_reps_min !== ('' as any) &&
      p.target_reps_max != null && p.target_reps_max !== ('' as any);
    const hasDuration = p.target_duration_s != null && p.target_duration_s !== ('' as any);
    if (!hasReps && !hasDuration) {
      errors.push(`Progresja #${i + 1}: podaj zakres reps lub czas (sek.)`);
    }
    if (hasReps) {
      const min = Number(p.target_reps_min);
      const max = Number(p.target_reps_max);
      if (!Number.isInteger(min) || min < 0 || min > 999) {
        errors.push(`Progresja #${i + 1}: reps min musi być 0-999`);
      }
      if (!Number.isInteger(max) || max < 0 || max > 999) {
        errors.push(`Progresja #${i + 1}: reps max musi być 0-999`);
      }
      if (min > max) {
        errors.push(`Progresja #${i + 1}: reps min > max`);
      }
    }
    if (hasDuration) {
      const d = Number(p.target_duration_s);
      if (!Number.isInteger(d) || d < 1 || d > 7200) {
        errors.push(`Progresja #${i + 1}: czas musi być 1-7200 sek.`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const value: ExerciseInput = {
    slug,
    name_pl,
    name_en,
    category: category as Category,
    equipment_ref,
    technique_md,
    video_url,
    locations: validLocs,
    progressions: progressions.map((p) => ({
      level: Number(p.level),
      variant_name: (p.variant_name ?? '').trim(),
      target_reps_min: p.target_reps_min != null && p.target_reps_min !== ('' as any) ? Number(p.target_reps_min) : null,
      target_reps_max: p.target_reps_max != null && p.target_reps_max !== ('' as any) ? Number(p.target_reps_max) : null,
      target_duration_s: p.target_duration_s != null && p.target_duration_s !== ('' as any) ? Number(p.target_duration_s) : null,
      notes: p.notes?.trim() || null
    }))
  };

  return { ok: true, errors: [], value };
}

// ----------- Operacje -----------

export function listExercises(
  db: Database.Database,
  opts: { includeArchived?: boolean; location?: Location; category?: Category } = {}
): ExerciseSummary[] {
  const where: string[] = [];
  const params: unknown[] = [];

  if (!opts.includeArchived) where.push('e.is_archived = 0');
  if (opts.category) {
    where.push('e.category = ?');
    params.push(opts.category);
  }
  if (opts.location) {
    where.push(
      'EXISTS (SELECT 1 FROM exercise_locations el WHERE el.exercise_id = e.id AND el.location = ?)'
    );
    params.push(opts.location);
  }

  const sql = `
    SELECT
      e.*,
      (SELECT COUNT(*) FROM progressions p WHERE p.exercise_id = e.id) AS progressions_count
    FROM exercises e
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY e.is_archived ASC, e.category ASC, e.name_pl ASC
  `;
  const rows = db.prepare(sql).all(...params) as Array<ExerciseRow & { progressions_count: number }>;

  // Lokalizacje w drugim zapytaniu (uniknij duplikacji w GROUP BY)
  const locsStmt = db.prepare(
    'SELECT location FROM exercise_locations WHERE exercise_id = ?'
  );
  return rows.map((r) => ({
    ...r,
    locations: (locsStmt.all(r.id) as Array<{ location: Location }>).map((x) => x.location)
  }));
}

export function getExerciseBySlug(
  db: Database.Database,
  slug: string
): ExerciseWithRelations | null {
  const ex = db.prepare('SELECT * FROM exercises WHERE slug = ?').get(slug) as
    | ExerciseRow
    | undefined;
  if (!ex) return null;
  const locations = (
    db
      .prepare('SELECT location FROM exercise_locations WHERE exercise_id = ?')
      .all(ex.id) as Array<{ location: Location }>
  ).map((x) => x.location);
  const progressions = db
    .prepare('SELECT * FROM progressions WHERE exercise_id = ? ORDER BY level ASC')
    .all(ex.id) as ProgressionRow[];
  return { ...ex, locations, progressions };
}

export function createExercise(db: Database.Database, input: ExerciseInput): number {
  return db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO exercises
           (slug, name_pl, name_en, category, equipment_ref, technique_md, video_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.slug,
        input.name_pl,
        input.name_en,
        input.category,
        input.equipment_ref,
        input.technique_md,
        input.video_url
      );
    const exId = Number(info.lastInsertRowid);

    const insertLoc = db.prepare(
      'INSERT INTO exercise_locations (exercise_id, location) VALUES (?, ?)'
    );
    for (const loc of input.locations) insertLoc.run(exId, loc);

    const insertProg = db.prepare(
      `INSERT INTO progressions
         (exercise_id, level, variant_name, target_reps_min, target_reps_max, target_duration_s, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of input.progressions) {
      insertProg.run(
        exId,
        p.level,
        p.variant_name,
        p.target_reps_min,
        p.target_reps_max,
        p.target_duration_s,
        p.notes
      );
    }
    return exId;
  })();
}

export function updateExercise(
  db: Database.Database,
  id: number,
  input: ExerciseInput
): void {
  db.transaction(() => {
    db.prepare(
      `UPDATE exercises SET
         slug = ?, name_pl = ?, name_en = ?, category = ?,
         equipment_ref = ?, technique_md = ?, video_url = ?
       WHERE id = ?`
    ).run(
      input.slug,
      input.name_pl,
      input.name_en,
      input.category,
      input.equipment_ref,
      input.technique_md,
      input.video_url,
      id
    );

    // Lokalizacje: nadpisujemy całkowicie
    db.prepare('DELETE FROM exercise_locations WHERE exercise_id = ?').run(id);
    const insertLoc = db.prepare(
      'INSERT INTO exercise_locations (exercise_id, location) VALUES (?, ?)'
    );
    for (const loc of input.locations) insertLoc.run(id, loc);

    // Progresje: nadpisujemy. Sety w `sets` referencują się przez level INT (nie FK),
    // więc usunięcie progresji nie zniszczy historii - tylko UI straci nazwę wariantu
    // dla nieistniejących już poziomów. Zachowujemy odpowiedzialność po stronie usera.
    db.prepare('DELETE FROM progressions WHERE exercise_id = ?').run(id);
    const insertProg = db.prepare(
      `INSERT INTO progressions
         (exercise_id, level, variant_name, target_reps_min, target_reps_max, target_duration_s, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of input.progressions) {
      insertProg.run(
        id,
        p.level,
        p.variant_name,
        p.target_reps_min,
        p.target_reps_max,
        p.target_duration_s,
        p.notes
      );
    }
  })();
}

export function setArchived(
  db: Database.Database,
  id: number,
  archived: boolean
): void {
  db.prepare('UPDATE exercises SET is_archived = ? WHERE id = ?').run(
    archived ? 1 : 0,
    id
  );
}
