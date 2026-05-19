import type { ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listExercises, LOCATIONS, CATEGORIES } from '$lib/server/db/library';
import type { Location, Category } from '$lib/server/db/library';

export const load: ServerLoad = ({ url }) => {
  const db = getDb();
  const locParam = url.searchParams.get('loc') ?? '';
  const catParam = url.searchParams.get('cat') ?? '';
  const archived = url.searchParams.get('archived') === '1';

  const location = LOCATIONS.includes(locParam as Location) ? (locParam as Location) : undefined;
  const category = CATEGORIES.includes(catParam as Category) ? (catParam as Category) : undefined;

  const exercises = listExercises(db, {
    includeArchived: archived,
    location,
    category
  });

  return {
    exercises,
    filters: {
      location: location ?? null,
      category: category ?? null,
      showArchived: archived
    }
  };
};
