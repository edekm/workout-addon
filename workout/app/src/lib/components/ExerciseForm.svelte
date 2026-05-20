<script lang="ts">
  import {
    LOCATIONS,
    CATEGORIES,
    LOCATION_LABELS,
    CATEGORY_LABELS
  } from '$lib/workout-constants';
  import type { Location, Category } from '$lib/workout-constants';
  import type { ExerciseInput, ProgressionInput } from '$lib/server/db/library';

  export let initial: ExerciseInput;
  export let actionUrl: string;
  export let submitLabel: string;
  export let slugLocked: boolean = false;
  export let errors: string[] = [];

  let slug = initial.slug;
  let name_pl = initial.name_pl;
  let name_en = initial.name_en ?? '';
  let category: Category = initial.category;
  let equipment_ref = initial.equipment_ref;
  let technique_md = initial.technique_md ?? '';
  let video_url = initial.video_url ?? '';
  let locations: Location[] = [...initial.locations];
  let progressions: ProgressionInput[] = initial.progressions.map((p) => ({ ...p }));

  function toggleLocation(loc: Location) {
    locations = locations.includes(loc)
      ? locations.filter((l) => l !== loc)
      : [...locations, loc];
  }

  function addProgression() {
    const nextLevel = progressions.length
      ? Math.max(...progressions.map((p) => p.level)) + 1
      : 1;
    progressions = [
      ...progressions,
      {
        level: nextLevel,
        variant_name: '',
        target_reps_min: null,
        target_reps_max: null,
        target_duration_s: null,
        notes: null
      }
    ];
  }

  function removeProgression(i: number) {
    progressions = progressions.filter((_, idx) => idx !== i);
  }

  function moveProgression(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= progressions.length) return;
    const copy = [...progressions];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    // Renumerujemy poziomy zgodnie z kolejnością
    progressions = copy.map((p, idx) => ({ ...p, level: idx + 1 }));
  }

  function setMode(i: number, mode: 'reps' | 'duration') {
    progressions = progressions.map((p, idx) => {
      if (idx !== i) return p;
      if (mode === 'reps') {
        return { ...p, target_duration_s: null, target_reps_min: p.target_reps_min ?? 0, target_reps_max: p.target_reps_max ?? 0 };
      }
      return { ...p, target_reps_min: null, target_reps_max: null, target_duration_s: p.target_duration_s ?? 0 };
    });
  }

  $: payload = JSON.stringify({
    slug: slug.trim(),
    name_pl: name_pl.trim(),
    name_en: name_en.trim() || null,
    category,
    equipment_ref: equipment_ref.trim(),
    technique_md: technique_md.trim() || null,
    video_url: video_url.trim() || null,
    locations,
    progressions: progressions.map((p) => ({
      level: Number(p.level),
      variant_name: (p.variant_name ?? '').trim(),
      target_reps_min: p.target_reps_min === null || p.target_reps_min === ('' as any) ? null : Number(p.target_reps_min),
      target_reps_max: p.target_reps_max === null || p.target_reps_max === ('' as any) ? null : Number(p.target_reps_max),
      target_duration_s: p.target_duration_s === null || p.target_duration_s === ('' as any) ? null : Number(p.target_duration_s),
      notes: p.notes?.trim() || null
    }))
  });
</script>

<form method="POST" action={actionUrl} class="flex flex-col gap-4">
  {#if errors.length > 0}
    <div class="rounded-xl bg-red-50 p-3 text-sm text-red-700">
      <p class="font-medium">Sprawdź błędy:</p>
      <ul class="ml-4 list-disc">
        {#each errors as e}
          <li>{e}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <div class="grid gap-3 rounded-xl bg-white p-4 shadow-sm">
    <label class="block">
      <span class="text-xs uppercase tracking-wider text-neutral-400">Slug (URL)</span>
      <input
        type="text"
        bind:value={slug}
        readonly={slugLocked}
        placeholder="np. pull-up"
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:bg-neutral-50 read-only:bg-neutral-50"
      />
      <span class="mt-0.5 block text-xs text-neutral-400">małe litery, cyfry, myślniki - niezmienny po utworzeniu</span>
    </label>

    <label class="block">
      <span class="text-xs uppercase tracking-wider text-neutral-400">Nazwa PL</span>
      <input
        type="text"
        bind:value={name_pl}
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </label>

    <label class="block">
      <span class="text-xs uppercase tracking-wider text-neutral-400">Nazwa EN (opcj.)</span>
      <input
        type="text"
        bind:value={name_en}
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="block">
        <span class="text-xs uppercase tracking-wider text-neutral-400">Kategoria</span>
        <select
          bind:value={category}
          class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        >
          {#each CATEGORIES as c}
            <option value={c}>{CATEGORY_LABELS[c]}</option>
          {/each}
        </select>
      </label>
      <label class="block">
        <span class="text-xs uppercase tracking-wider text-neutral-400">Sprzęt</span>
        <input
          type="text"
          bind:value={equipment_ref}
          placeholder="np. pullup_dip, floor, rings"
          class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      </label>
    </div>

    <div>
      <p class="text-xs uppercase tracking-wider text-neutral-400">Lokalizacje</p>
      <div class="mt-1 flex flex-wrap gap-2">
        {#each LOCATIONS as loc}
          <button
            type="button"
            on:click={() => toggleLocation(loc)}
            class="rounded-full px-3 py-1.5 text-xs font-medium
              {locations.includes(loc) ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700'}"
          >
            {LOCATION_LABELS[loc]}
          </button>
        {/each}
      </div>
    </div>

    <label class="block">
      <span class="text-xs uppercase tracking-wider text-neutral-400">Technika (opcj.)</span>
      <textarea
        bind:value={technique_md}
        rows="4"
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      ></textarea>
    </label>

    <label class="block">
      <span class="text-xs uppercase tracking-wider text-neutral-400">Video URL (opcj.)</span>
      <input
        type="url"
        bind:value={video_url}
        placeholder="https://..."
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </label>
  </div>

  <div class="rounded-xl bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-neutral-900">Poziomy progresji</h3>
      <button
        type="button"
        on:click={addProgression}
        class="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
      >
        + Dodaj poziom
      </button>
    </div>
    <div class="flex flex-col gap-3">
      {#each progressions as p, i}
        {@const mode = p.target_duration_s != null ? 'duration' : 'reps'}
        <div class="rounded-lg border border-neutral-200 p-3">
          <div class="mb-2 flex items-center gap-2">
            <span class="text-xs font-medium text-neutral-500">L{p.level}</span>
            <input
              type="text"
              bind:value={p.variant_name}
              placeholder="Nazwa wariantu"
              class="flex-1 rounded border border-neutral-200 px-2 py-1 text-sm"
            />
            <button
              type="button"
              on:click={() => moveProgression(i, -1)}
              disabled={i === 0}
              class="rounded px-1.5 py-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
              aria-label="W górę"
            >
              ↑
            </button>
            <button
              type="button"
              on:click={() => moveProgression(i, 1)}
              disabled={i === progressions.length - 1}
              class="rounded px-1.5 py-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
              aria-label="W dół"
            >
              ↓
            </button>
            <button
              type="button"
              on:click={() => removeProgression(i)}
              class="rounded px-1.5 py-1 text-red-500 hover:bg-red-50"
              aria-label="Usuń"
            >
              ×
            </button>
          </div>

          <div class="mb-2 flex gap-2 text-xs">
            <button
              type="button"
              on:click={() => setMode(i, 'reps')}
              class="rounded px-2 py-1 {mode === 'reps' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}"
            >
              Reps
            </button>
            <button
              type="button"
              on:click={() => setMode(i, 'duration')}
              class="rounded px-2 py-1 {mode === 'duration' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}"
            >
              Czas (s)
            </button>
          </div>

          {#if mode === 'reps'}
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs text-neutral-500">
                Min
                <input
                  type="number"
                  bind:value={p.target_reps_min}
                  min="0"
                  max="999"
                  class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
              </label>
              <label class="text-xs text-neutral-500">
                Max
                <input
                  type="number"
                  bind:value={p.target_reps_max}
                  min="0"
                  max="999"
                  class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                />
              </label>
            </div>
          {:else}
            <label class="block text-xs text-neutral-500">
              Czas (sek.)
              <input
                type="number"
                bind:value={p.target_duration_s}
                min="1"
                max="7200"
                class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
              />
            </label>
          {/if}

          <label class="mt-2 block text-xs text-neutral-500">
            Notatki (opcj.)
            <input
              type="text"
              bind:value={p.notes}
              class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
            />
          </label>
        </div>
      {/each}
    </div>
  </div>

  <input type="hidden" name="payload" value={payload} />

  <div class="flex gap-2">
    <a
      href="../library"
      class="rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-500 hover:bg-neutral-50"
    >
      Anuluj
    </a>
    <button
      type="submit"
      class="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
    >
      {submitLabel}
    </button>
  </div>
</form>
