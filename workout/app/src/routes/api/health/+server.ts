import { json } from '@sveltejs/kit';

export const GET = () => {
  return json({
    status: 'ok',
    version: '0.1.0',
    users: {
      user1: process.env.USER1_NAME ?? 'M',
      user2: process.env.USER2_NAME ?? 'Ona'
    },
    data_dir: process.env.DATA_DIR ?? '/data',
    timestamp: new Date().toISOString()
  });
};
