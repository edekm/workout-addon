<script lang="ts">
  import { enhance } from '$app/forms';

  export let exerciseId: number;
  export let setNumber: number;
  export let level: number;
  export let mode: 'reps' | 'duration';
  export let targetMin: number | null;
  export let targetMax: number | null;
  export let existing: {
    id: number;
    reps: number | null;
    duration_s: number | null;
  } | null = null;
  export let readonly: boolean = false;

  let value: string = existing
    ? mode === 'reps'
      ? String(existing.reps ?? '')
      : String(existing.duration_s ?? '')
    : '';
  let saving = false;
  let savedFlash = false;

  function flashSaved() {
    savedFlash = true;
    setTimeout(() => (savedFlash = false), 1200);
  }

  function classifyValue(v: string): 'empty' | 'below' | 'ok' | 'above' {
    if (!v) return 'empty';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'empty';
    if (targetMin != null && n < targetMin) return 'below';
    if (targetMax != null && n > targetMax) return 'above';
    return 'ok';
  }

  $: tone = classifyValue(value);
  $: inputClass =
    tone === 'ok'
      ? 'border-emerald-300 bg-emerald-50'
      : tone === 'below'
        ? 'border-amber-300 bg-amber-50'
        : tone === 'above'
          ? 'border-blue-300 bg-blue-50'
          : 'border-neutral-200';

  function targetLabel(): string {
    if (mode === 'duration') {
      if (targetMin === targetMax && targetMin != null) return `cel ${targetMin}s`;
      if (targetMin != null && targetMax != null) return `cel ${targetMin}-${targetMax}s`;
      return '';
    }
    if (targetMin != null && targetMax != null) return `cel ${targetMin}-${targetMax}`;
    return '';
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

  <div class="w-7 shrink-0 text-center text-sm font-medium text-neutral-400">{setNumber}</div>

  <input
    type="number"
    name={mode === 'reps' ? 'reps' : 'duration_s'}
    bind:value
    inputmode="numeric"
    min="0"
    max="9999"
    disabled={readonly}
    placeholder={mode === 'reps' ? 'powt.' : 'sek.'}
    class="w-20 rounded-lg border px-2 py-2 text-center text-base focus:border-neutral-900 focus:outline-none disabled:opacity-60 {inputClass}"
  />

  <span class="text-xs text-neutral-400">{targetLabel()}</span>

  {#if !readonly}
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
  {/if}
</form>
