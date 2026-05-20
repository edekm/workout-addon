import type { ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { listPlans } from '$lib/server/db/plans';

export const load: ServerLoad = () => {
  const db = getDb();
  const plans = listPlans(db);
  const users = db
    .prepare('SELECT slot, name FROM users ORDER BY slot ASC')
    .all() as Array<{ slot: string; name: string }>;
  return { plans, users };
};
