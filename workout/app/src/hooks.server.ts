import type { Handle } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) => {
  event.locals.ingressPath = event.request.headers.get('x-ingress-path') ?? '';
  return resolve(event);
};
