<script lang="ts">
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
      progression: Progression;
    }>;
  };

  function target(p: Progression): string {
    if (!p) return '—';
    if (p.target_duration_s != null) {
      const m = Math.floor(p.target_duration_s / 60);
      const s = p.target_duration_s % 60;
      return m > 0 ? `${m} min${s > 0 ? ` ${s}s` : ''}` : `${s}s`;
    }
    if (p.target_reps_min != null && p.target_reps_max != null) {
      return `${p.target_reps_min}-${p.target_reps_max} powt.`;
    }
    return '—';
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
              <p class="mt-1 text-sm text-neutral-600">
                <span class="font-medium">L{it.progression.level}:</span>
                {it.progression.variant_name}
              </p>
            {/if}
            <p class="mt-1 text-xs text-neutral-500">
              {it.target_sets} × {target(it.progression)} · odp. {it.rest_seconds}s
            </p>
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

  <div class="mt-6 rounded-xl bg-neutral-100 p-4 text-center text-sm text-neutral-500">
    Logowanie serii — wkrótce (Etap 2c).
  </div>
</main>
