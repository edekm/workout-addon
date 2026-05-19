import type { ServerLoad } from '@sveltejs/kit';
import { dbStats, getDb } from '$lib/server/db';

export const load: ServerLoad = () => {
  const db = getDb();
  const users = db
    .prepare('SELECT slot, name FROM users ORDER BY slot')
    .all() as Array<{ slot: string; name: string }>;
  const exercisesByCategory = db
    .prepare(
      `SELECT category, COUNT(*) AS n
       FROM exercises GROUP BY category ORDER BY category`
    )
    .all() as Array<{ category: string; n: number }>;

  return {
    users,
    stats: dbStats(),
    exercisesByCategory
  };
};
