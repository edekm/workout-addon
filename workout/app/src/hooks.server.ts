import type { Handle, HandleServerError } from '@sveltejs/kit';

export const handle: Handle = ({ event, resolve }) => {
  event.locals.ingressPath = event.request.headers.get('x-ingress-path') ?? '';
  return resolve(event);
};

export const handleError: HandleServerError = ({ error, event }) => {
  // Wszystkie błędy load/action lecą tutaj. Logujemy z pełnym stackiem
  // do supervisor logs, żeby zdiagnozować "404" które są w istocie błędami
  // serwerowymi (np. SqliteError z brakującej kolumny po nieudanej migracji).
  console.error('[workout] handleError', event.url.pathname, error);
  return {
    message: error instanceof Error ? error.message : 'Internal error'
  };
};
