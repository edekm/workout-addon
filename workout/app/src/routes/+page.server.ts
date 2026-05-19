import type { ServerLoad } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

export const load: ServerLoad = () => {
  const db = getDb();
  const users = db
    .prepare('SELECT slot, name FROM users ORDER BY slot')
    .all() as Array<{ slot: string; name: string }>;
  return { users };
};
