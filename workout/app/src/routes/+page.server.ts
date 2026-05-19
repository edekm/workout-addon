import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = () => {
  return {
    user1: process.env.USER1_NAME ?? 'M',
    user2: process.env.USER2_NAME ?? 'Ona'
  };
};
