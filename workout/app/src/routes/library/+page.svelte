<script lang="ts">
  import {
    LOCATIONS,
    CATEGORIES,
    LOCATION_LABELS,
    CATEGORY_LABELS
  } from '$lib/workout-constants';
  import type { Location, Category } from '$lib/workout-constants';

  export let data: {
    exercises: Array<{
      id: number;
      slug: string;
      name_pl: string;
      category: Category;
      equipment_ref: string;
      is_archived: number;
      locations: Location[];
      progressions_count: number;
    }>;
    filters: { location: Location | null; category: Category | null; showArchived: boolean };
  };

  function categoryColor(cat: string): string {
    const map: Record<string, string> = {
      pull: 'bg-blue-100 text-blue-900',
      push: 'bg-red-100 text-red-900',
      legs: 'bg-amber-100 text-amber-900',
      core: 'bg-purple-100 text-purple-900',
      cardio: 'bg-emerald-100 text-emerald-900',
      mobility: 'bg-neutral-200 text-neutral-700',
      skill: 'bg-pink-100 text-pink-900'
    };
    return map[cat] ?? 'bg-neutral-100 text-neutral-700';
  }

  function locationParam(loc: Location | null): string {
    return loc ? `loc=${loc}` : '';
  }
  function categoryParam(cat: Category | null): string {
    return cat ? `cat=${cat}` : '';
  }
  function archivedParam(arch: boolean): string {
    return arch ? 'archived=1' : '';
  }

  function buildHref(overrides: Partial<typeof data.filters>): string {
    const f = { ...data.filters, ...overrides };
    const parts = [
      locationParam(f.location ?? null),
      categoryParam(f.category ?? null),
      archivedParam(f.showArchived ?? false)
    ].filter(Boolean);
    return parts.length ? '?' + parts.join('&') : '';
  }
</script>

<main class="mx-auto max-w-2xl p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../" class="text-neutral-500 hover:text-neutral-900">←</a>
    <h1 class="flex-1 text-xl font-bold text-neutral-900">Biblioteka ćwiczeń</h1>
    <a
      href="library/new"
      class="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      + Dodaj
    </a>
  </header>

  <section class="mb-4 flex flex-col gap-2">
    <div>
      <p class="mb-1 text-xs uppercase tracking-wider text-neutral-400">Lokalizacja</p>
      <div class="flex flex-wrap gap-1.5">
        <a
          href={buildHref({ location: null })}
          class="rounded-full px-3 py-1 text-xs font-medium
            {data.filters.location === null ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}"
        >
          Wszystkie
        </a>
        {#each LOCATIONS as loc}
          <a
            href={buildHref({ location: loc })}
            class="rounded-full px-3 py-1 text-xs font-medium
              {data.filters.location === loc ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}"
          >
            {LOCATION_LABELS[loc]}
          </a>
        {/each}
      </div>
    </div>
    <div>
      <p class="mb-1 text-xs uppercase tracking-wider text-neutral-400">Kategoria</p>
      <div class="flex flex-wrap gap-1.5">
        <a
          href={buildHref({ category: null })}
          class="rounded-full px-3 py-1 text-xs font-medium
            {data.filters.category === null ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}"
        >
          Wszystkie
        </a>
        {#each CATEGORIES as cat}
          <a
            href={buildHref({ category: cat })}
            class="rounded-full px-3 py-1 text-xs font-medium
              {data.filters.category === cat ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 hover:bg-neutral-100'}"
          >
            {CATEGORY_LABELS[cat]}
          </a>
        {/each}
      </div>
    </div>
    <div>
      <a
        href={buildHref({ showArchived: !data.filters.showArchived })}
        class="text-xs text-neutral-500 underline hover:text-neutral-900"
      >
        {data.filters.showArchived ? 'Ukryj' : 'Pokaż'} archiwalne
      </a>
    </div>
  </section>

  {#if data.exercises.length === 0}
    <p class="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">Brak ćwiczeń dla wybranych filtrów.</p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each data.exercises as ex}
        <li>
          <a
            href="library/{ex.slug}"
            class="flex flex-col gap-1 rounded-xl p-3 shadow-sm hover:shadow-md
              {ex.is_archived ? 'bg-neutral-100 opacity-60' : 'bg-white'}"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-neutral-900">
                  {ex.name_pl}
                  {#if ex.is_archived}
                    <span class="ml-1 text-xs font-normal text-neutral-400">(archiwalne)</span>
                  {/if}
                </p>
                <p class="text-xs text-neutral-500">{ex.equipment_ref} · {ex.progressions_count} poziomów</p>
              </div>
              <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase {categoryColor(ex.category)}">
                {ex.category}
              </span>
            </div>
            <div class="flex flex-wrap gap-1">
              {#each ex.locations as loc}
                <span class="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                  {LOCATION_LABELS[loc]}
                </span>
              {/each}
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>
