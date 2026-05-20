<script lang="ts">
  import { LOCATION_LABELS, type Location } from '$lib/workout-constants';

  type Progression = {
    level: number;
    variant_name: string;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_s: number | null;
    notes: string | null;
  } | null;

  export let data: {
    user: { id: number; slot: string; name: string };
    plan: { id: number; name: string };
    dayLabel: string;
    items: Array<{
      pe_id: number;
      ord: number;
      start_level: number;
      target_sets: number;
      rest_seconds: number;
      pe_notes: string | null;
      exercise_id: number;
      slug: string;
      name_pl: string;
      category: string;
      equipment_ref: string;
      locations: Location[];
      progression: Progression;
      promoted?: boolean;
      last_sets?: Array<{ set_number: number; reps: number | null; duration_s: number | null }>;
    }>;
  };

  function target(p: Progression): string {
    if (!p) return '—';
    if (p.target_duration_s != null) {
      const m = Math.floor(p.target_duration_s / 60);
      const s = p.target_duration_s % 60;
      return m > 0 ? `${m} min${s > 0 ? ` ${s}s` : ''}` : `${s}s`;
    }
    if (p.target_reps_max != null) {
      return `${p.target_reps_max} powt.`;
    }
    return '—';
  }

  function lastSummary(
    lastSets: Array<{ reps: number | null; duration_s: number | null }> | undefined
  ): string {
    if (!lastSets || lastSets.length === 0) return '—';
    return lastSets
      .map((s) => (s.reps != null ? String(s.reps) : `${s.duration_s}s`))
      .join(', ');
  }

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
</script>

<main class="mx-auto max-w-md p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../../{data.user.slot}" class="text-neutral-500 hover:text-neutral-900">←</a>
    <div>
      <h1 class="text-xl font-bold text-neutral-900">{data.dayLabel}</h1>
      <p class="text-xs text-neutral-500">{data.user.name} · {data.items.length} ćwiczeń</p>
    </div>
  </header>

  <ul class="flex flex-col gap-2">
    {#each data.items as it}
      <li class="rounded-xl bg-white p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="text-sm text-neutral-400">{it.ord}.</span>
              <h3 class="font-semibold text-neutral-900">{it.name_pl}</h3>
            </div>
            {#if it.progression}
              <p class="mt-1 flex items-center gap-2 text-sm text-neutral-600">
                <span><span class="font-medium">L{it.progression.level}:</span> {it.progression.variant_name}</span>
                {#if it.promoted}
                  <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700">
                    ↑ Awans
                  </span>
                {/if}
              </p>
            {/if}
            <p class="mt-1 text-xs text-neutral-500">
              {it.target_sets} × {target(it.progression)} · odp. {it.rest_seconds}s
            </p>
            <p class="mt-0.5 text-xs text-neutral-400">
              Ostatnio: <span class="font-mono">{lastSummary(it.last_sets)}</span>
            </p>
            {#if it.locations.length > 0}
              <div class="mt-1 flex flex-wrap gap-1">
                {#each it.locations as loc}
                  <span class="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                    {LOCATION_LABELS[loc]}
                  </span>
                {/each}
              </div>
            {/if}
            {#if it.pe_notes}
              <p class="mt-1 text-xs italic text-neutral-400">{it.pe_notes}</p>
            {/if}
          </div>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase {categoryColor(it.category)}">
            {it.category}
          </span>
        </div>
      </li>
    {/each}
  </ul>

  <form method="POST" action="?/startSession" class="mt-6">
    <button
      type="submit"
      class="w-full rounded-2xl bg-neutral-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99]"
    >
      Rozpocznij sesję
    </button>
  </form>
</main>
