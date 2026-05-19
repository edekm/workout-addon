import { json } from '@sveltejs/kit';
import { dbStats } from '$lib/server/db';
import pkg from '../../../../package.json';

export const GET = () => {
  return json({
    status: 'ok',
    version: pkg.version,
    users: {
      user1: process.env.USER1_NAME ?? 'M',
      user2: process.env.USER2_NAME ?? 'Ona'
    },
    db: dbStats(),
    timestamp: new Date().toISOString()
  });
};
