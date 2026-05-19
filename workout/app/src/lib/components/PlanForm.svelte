<script lang="ts">
  import type { PlanInput } from '$lib/server/db/plans';
  import { LOCATIONS, LOCATION_LABELS } from '$lib/server/db/library';
  import type { Location } from '$lib/server/db/library';

  export let initial: PlanInput;
  export let actionUrl: string;
  export let submitLabel: string;
  export let errors: string[] = [];

  // Lista wszystkich nie-archiwalnych ćwiczeń do dropdownu
  export let exerciseChoices: Array<{
    id: number;
    name_pl: string;
    category: string;
    locations: Location[];
  }>;

  let name = initial.name;
  let description = initial.description ?? '';
  let days: PlanInput['days'] = initial.days.map((d) => ({
    label: d.label,
    items: d.items.map((it) => ({ ...it }))
  }));

  let locationFilter: Location | '' = '';

  $: filteredChoices = locationFilter
    ? exerciseChoices.filter((e) => e.locations.includes(locationFilter as Location))
    : exerciseChoices;

  function addDay() {
    const nextIdx = days.length;
    days = [...days, { label: `Dzień ${String.fromCharCode(65 + nextIdx)}`, items: [] }];
  }

  function removeDay(i: number) {
    if (!confirm('Usunąć ten dzień z planu?')) return;
    days = days.filter((_, idx) => idx !== i);
  }

  function moveDay(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= days.length) return;
    const copy = [...days];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    days = copy;
  }

  function addItem(dayIdx: number) {
    if (exerciseChoices.length === 0) return;
    const first = filteredChoices[0] ?? exerciseChoices[0];
    days[dayIdx].items = [
      ...days[dayIdx].items,
      {
        exercise_id: first.id,
        start_level: 1,
        target_sets: 3,
        rest_seconds: 90,
        notes: null
      }
    ];
    days = days;
  }

  function removeItem(dayIdx: number, itemIdx: number) {
    days[dayIdx].items = days[dayIdx].items.filter((_, i) => i !== itemIdx);
    days = days;
  }

  function moveItem(dayIdx: number, itemIdx: number, dir: -1 | 1) {
    const items = days[dayIdx].items;
    const j = itemIdx + dir;
    if (j < 0 || j >= items.length) return;
    [items[itemIdx], items[j]] = [items[j], items[itemIdx]];
    days[dayIdx].items = items;
    days = days;
  }

  $: payload = JSON.stringify({
    name: name.trim(),
    description: description.trim() || null,
    days: days.map((d) => ({
      label: d.label.trim(),
      items: d.items.map((it) => ({
        exercise_id: Number(it.exercise_id),
        start_level: Number(it.start_level),
        target_sets: Number(it.target_sets),
        rest_seconds: Number(it.rest_seconds),
        notes: it.notes?.trim() || null
      }))
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
      <span class="text-xs uppercase tracking-wider text-neutral-400">Nazwa planu</span>
      <input
        type="text"
        bind:value={name}
        placeholder="Full-body 3x — moja wersja"
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
    </label>
    <label class="block">
      <span class="text-xs uppercase tracking-wider text-neutral-400">Opis (opcj.)</span>
      <textarea
        bind:value={description}
        rows="2"
        class="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      ></textarea>
    </label>
  </div>

  <div class="rounded-xl bg-white p-4 shadow-sm">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-neutral-900">Dni i ćwiczenia</h3>
      <div class="flex items-center gap-2">
        <select
          bind:value={locationFilter}
          class="rounded border border-neutral-200 px-2 py-1 text-xs"
          aria-label="Filtruj ćwiczenia po lokalizacji"
        >
          <option value="">Wszystkie lokalizacje</option>
          {#each LOCATIONS as loc}
            <option value={loc}>{LOCATION_LABELS[loc]}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if days.length === 0}
      <p class="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500">
        Brak dni. Dodaj pierwszy dzień.
      </p>
    {/if}

    <div class="flex flex-col gap-4">
      {#each days as day, dayIdx}
        <div class="rounded-lg border border-neutral-200 p-3">
          <div class="mb-3 flex items-center gap-2">
            <input
              type="text"
              bind:value={day.label}
              placeholder="Etykieta dnia (np. A · Pull)"
              class="flex-1 rounded border border-neutral-200 px-2 py-1 text-sm font-semibold"
            />
            <button
              type="button"
              on:click={() => moveDay(dayIdx, -1)}
              disabled={dayIdx === 0}
              class="rounded px-1.5 py-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              on:click={() => moveDay(dayIdx, 1)}
              disabled={dayIdx === days.length - 1}
              class="rounded px-1.5 py-1 text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              on:click={() => removeDay(dayIdx)}
              class="rounded px-1.5 py-1 text-red-500 hover:bg-red-50"
              aria-label="Usuń dzień"
            >
              ×
            </button>
          </div>

          <div class="flex flex-col gap-2">
            {#each day.items as item, itemIdx}
              {@const ex = exerciseChoices.find((e) => e.id === item.exercise_id)}
              <div class="rounded border border-neutral-100 bg-neutral-50 p-2">
                <div class="mb-2 flex items-center gap-2">
                  <select
                    bind:value={item.exercise_id}
                    class="flex-1 rounded border border-neutral-200 bg-white px-2 py-1 text-sm"
                  >
                    {#each filteredChoices as choice}
                      <option value={choice.id}>
                        {choice.name_pl} ({choice.category})
                      </option>
                    {/each}
                    {#if ex && !filteredChoices.some((c) => c.id === ex.id)}
                      <option value={ex.id}>{ex.name_pl} ({ex.category}) - poza filtrem</option>
                    {/if}
                  </select>
                  <button
                    type="button"
                    on:click={() => moveItem(dayIdx, itemIdx, -1)}
                    disabled={itemIdx === 0}
                    class="rounded px-1 py-1 text-xs text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    on:click={() => moveItem(dayIdx, itemIdx, 1)}
                    disabled={itemIdx === day.items.length - 1}
                    class="rounded px-1 py-1 text-xs text-neutral-400 hover:text-neutral-900 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    on:click={() => removeItem(dayIdx, itemIdx)}
                    class="rounded px-1 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <label class="text-xs text-neutral-500">
                    Poziom
                    <input
                      type="number"
                      bind:value={item.start_level}
                      min="1"
                      max="20"
                      class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label class="text-xs text-neutral-500">
                    Serie
                    <input
                      type="number"
                      bind:value={item.target_sets}
                      min="1"
                      max="20"
                      class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label class="text-xs text-neutral-500">
                    Odp. (s)
                    <input
                      type="number"
                      bind:value={item.rest_seconds}
                      min="0"
                      max="600"
                      class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                    />
                  </label>
                </div>
                <label class="mt-2 block text-xs text-neutral-500">
                  Notatki (opcj.)
                  <input
                    type="text"
                    bind:value={item.notes}
                    class="mt-0.5 w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                  />
                </label>
              </div>
            {/each}
          </div>

          <button
            type="button"
            on:click={() => addItem(dayIdx)}
            class="mt-2 w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            + Dodaj ćwiczenie
          </button>
        </div>
      {/each}
    </div>

    <button
      type="button"
      on:click={addDay}
      class="mt-3 w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
    >
      + Dodaj dzień
    </button>
    <p class="mt-2 text-xs text-neutral-400">
      Poziom startowy w planie służy jako baza dla nowych użytkowników (bez historii dla danego ćwiczenia). Jeśli ktoś ma już zalogowane sety, jego poziom jest niezależny i nie cofnie się.
    </p>
  </div>

  <input type="hidden" name="payload" value={payload} />

  <div class="flex gap-2">
    <a
      href="../plans"
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
