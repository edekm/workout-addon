<script lang="ts">
  import { enhance } from '$app/forms';

  export let exerciseId: number;
  export let setNumber: number;
  export let level: number;
  export let mode: 'reps' | 'duration';
  export let existing: {
    id: number;
    reps: number | null;
    duration_s: number | null;
    rpe: number | null;
  } | null = null;

  let value: string = existing
    ? mode === 'reps'
      ? String(existing.reps ?? '')
      : String(existing.duration_s ?? '')
    : '';
  let rpe: string = existing && existing.rpe != null ? String(existing.rpe) : '';
  let saving = false;
  let savedFlash = false;

  function flashSaved() {
    savedFlash = true;
    setTimeout(() => (savedFlash = false), 1200);
  }
</script>

<form
  method="POST"
  action="?/logSet"
  use:enhance={() => {
    saving = true;
    return async ({ update }) => {
      await update({ reset: false });
      saving = false;
      flashSaved();
    };
  }}
  class="flex items-center gap-2"
>
  <input type="hidden" name="exercise_id" value={exerciseId} />
  <input type="hidden" name="set_number" value={setNumber} />
  <input type="hidden" name="level" value={level} />

  <div class="w-7 text-center text-sm font-medium text-neutral-400">{setNumber}</div>

  {#if mode === 'reps'}
    <input
      type="number"
      name="reps"
      bind:value
      inputmode="numeric"
      min="0"
      max="999"
      placeholder="powt."
      class="w-20 rounded-lg border border-neutral-200 px-2 py-2 text-center text-base focus:border-neutral-900 focus:outline-none"
    />
  {:else}
    <input
      type="number"
      name="duration_s"
      bind:value
      inputmode="numeric"
      min="0"
      max="9999"
      placeholder="sek."
      class="w-20 rounded-lg border border-neutral-200 px-2 py-2 text-center text-base focus:border-neutral-900 focus:outline-none"
    />
  {/if}

  <select
    name="rpe"
    bind:value={rpe}
    class="rounded-lg border border-neutral-200 px-2 py-2 text-sm focus:border-neutral-900 focus:outline-none"
  >
    <option value="">RPE</option>
    {#each [6, 7, 8, 9, 10] as n}
      <option value={String(n)}>{n}</option>
    {/each}
  </select>

  <button
    type="submit"
    disabled={saving || !value}
    class="ml-auto rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:bg-neutral-300"
  >
    {#if saving}…{:else if existing}↻{:else}+{/if}
  </button>

  {#if savedFlash}
    <span class="text-xs text-emerald-600">✓</span>
  {/if}
</form>
