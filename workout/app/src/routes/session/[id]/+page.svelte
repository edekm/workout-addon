<script lang="ts">
  import { enhance } from '$app/forms';
  import SetRow from '$lib/components/SetRow.svelte';
  import { equipmentLabel } from '$lib/equipment';

  type Progression = {
    level: number;
    variant_name: string;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_s: number | null;
  } | null;

  type SetItem = {
    id: number;
    exercise_id: number;
    set_number: number;
    level: number;
    reps: number | null;
    duration_s: number | null;
    rpe: number | null;
    notes: string | null;
  };

  type ExItem = {
    pe_id: number;
    ord: number;
    exercise_id: number;
    start_level: number;
    target_sets: number;
    rest_seconds: number;
    pe_notes: string | null;
    slug: string;
    name_pl: string;
    category: string;
    equipment_ref: string;
    technique_md: string | null;
    progression: Progression;
    sets: SetItem[];
  };

  export let data: {
    session: {
      id: number;
      day_label: string | null;
      started_at: number;
      completed_at: number | null;
    };
    user: { slot: string; name: string } | undefined;
    exercises: ExItem[];
  };

  $: readonly = data.session.completed_at != null;
  let showTechnique: Record<number, boolean> = {};
  function toggleTechnique(exId: number) {
    showTechnique = { ...showTechnique, [exId]: !showTechnique[exId] };
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

  function findSet(ex: ExItem, setNumber: number): SetItem | null {
    return ex.sets.find((s) => s.set_number === setNumber) ?? null;
  }

  function exerciseDone(ex: ExItem): boolean {
    return ex.sets.length >= ex.target_sets;
  }

  function fmtDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  $: totalSetsLogged = data.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  $: totalSetsTarget = data.exercises.reduce((acc, ex) => acc + ex.target_sets, 0);
</script>

<main class="mx-auto max-w-md p-4 pb-32">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../u/{data.user?.slot ?? ''}" class="text-neutral-500 hover:text-neutral-900">←</a>
    <div class="flex-1">
      <h1 class="text-lg font-bold text-neutral-900">{data.session.day_label ?? 'Sesja'}</h1>
      <p class="text-xs text-neutral-500">
        {data.user?.name} ·
        {#if readonly}
          zakończona {fmtDate(data.session.completed_at ?? 0)}
        {:else}
          {totalSetsLogged}/{totalSetsTarget} serii
        {/if}
      </p>
    </div>
  </header>

  <ol class="flex flex-col gap-4">
    {#each data.exercises as ex}
      {@const mode = ex.progression?.target_duration_s != null ? 'duration' : 'reps'}
      {@const targetMin = mode === 'reps' ? ex.progression?.target_reps_min ?? null : ex.progression?.target_duration_s ?? null}
      {@const targetMax = mode === 'reps' ? ex.progression?.target_reps_max ?? null : ex.progression?.target_duration_s ?? null}
      <li class="rounded-2xl bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-neutral-400">{ex.ord}.</span>
              <h2 class="font-semibold text-neutral-900">{ex.name_pl}</h2>
              {#if exerciseDone(ex)}
                <span class="text-emerald-600">✓</span>
              {/if}
            </div>
            {#if ex.progression}
              <p class="mt-0.5 text-sm text-neutral-600">
                L{ex.progression.level}: {ex.progression.variant_name}
              </p>
            {/if}
            <p class="mt-0.5 text-xs text-neutral-500">
              {equipmentLabel(ex.equipment_ref)} · odp. {ex.rest_seconds}s
            </p>
          </div>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase {categoryColor(ex.category)}">
            {ex.category}
          </span>
        </div>

        {#if ex.technique_md}
          <button
            type="button"
            on:click={() => toggleTechnique(ex.exercise_id)}
            class="mb-2 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
          >
            {showTechnique[ex.exercise_id] ? '▾' : '▸'} Technika
          </button>
          {#if showTechnique[ex.exercise_id]}
            <p class="mb-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm leading-relaxed text-neutral-700">
              {ex.technique_md}
            </p>
          {/if}
        {/if}

        <div class="flex flex-col gap-2">
          {#each Array.from({ length: ex.target_sets }, (_, i) => i + 1) as setNumber}
            <SetRow
              exerciseId={ex.exercise_id}
              {setNumber}
              level={ex.progression?.level ?? ex.start_level}
              {mode}
              {targetMin}
              {targetMax}
              existing={findSet(ex, setNumber)}
              {readonly}
            />
          {/each}
        </div>

        {#if ex.pe_notes}
          <p class="mt-2 text-xs italic text-neutral-400">{ex.pe_notes}</p>
        {/if}
      </li>
    {/each}
  </ol>
</main>

{#if !readonly}
  <div
    class="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur"
  >
    <div class="mx-auto flex max-w-md items-center gap-2">
      <form method="POST" action="?/cancel" class="flex-shrink-0" use:enhance>
        <button
          type="submit"
          class="rounded-xl border border-neutral-200 px-3 py-3 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          Anuluj
        </button>
      </form>
      <form method="POST" action="?/complete" class="flex-1" use:enhance>
        <button
          type="submit"
          class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 active:scale-[0.99]"
        >
          Zakończ sesję ({totalSetsLogged}/{totalSetsTarget})
        </button>
      </form>
    </div>
  </div>
{/if}
