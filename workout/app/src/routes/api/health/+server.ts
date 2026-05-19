import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { dbStats } from '$lib/server/db';
import pkg from '../../../../package.json';

export const GET: RequestHandler = ({ request, locals, url }) => {
  const headerSnapshot: Record<string, string> = {};
  for (const [k, v] of request.headers) {
    if (
      k.startsWith('x-') ||
      k === 'host' ||
      k === 'origin' ||
      k === 'referer'
    ) {
      headerSnapshot[k] = v;
    }
  }

  return json({
    status: 'ok',
    version: pkg.version,
    users: {
      user1: process.env.USER1_NAME ?? 'M',
      user2: process.env.USER2_NAME ?? 'Ona'
    },
    db: dbStats(),
    ingress: {
      ingress_path: locals.ingressPath,
      url_pathname: url.pathname,
      url_origin: url.origin,
      headers: headerSnapshot
    },
    timestamp: new Date().toISOString()
  });
};
