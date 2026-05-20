// Stałe i typy współdzielone między kodem serwerowym a komponentami .svelte.
// Plik MUSI być poza `$lib/server/` - inaczej SvelteKit zablokuje import z klienta.

export const LOCATIONS = ['gym1', 'gym2', 'home'] as const;
export type Location = (typeof LOCATIONS)[number];

export const CATEGORIES = [
  'pull',
  'push',
  'legs',
  'core',
  'cardio',
  'mobility',
  'skill'
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LOCATION_LABELS: Record<Location, string> = {
  gym1: 'Siłownia 1',
  gym2: 'Siłownia 2',
  home: 'Dom'
};

export const CATEGORY_LABELS: Record<Category, string> = {
  pull: 'Pull',
  push: 'Push',
  legs: 'Nogi',
  core: 'Core',
  cardio: 'Cardio',
  mobility: 'Mobility',
  skill: 'Skill'
};
