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
  let lastSavedValue: string = value;
  let saving = false;
  let savedFlash = false;
  let formEl: HTMLFormElement;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Konkretny cel = górna granica zakresu (gdy ją osiągasz na wszystkich seriach → level up)
  $: target = mode === 'duration' ? targetMin ?? targetMax : targetMax ?? targetMin;

  function flashSaved() {
    savedFlash = true;
    setTimeout(() => (savedFlash = false), 1200);
  }

  function classifyValue(v: string): 'empty' | 'below' | 'hit' {
    if (!v) return 'empty';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'empty';
    if (target != null && n < target) return 'below';
    return 'hit';
  }

  $: tone = classifyValue(value);
  $: inputClass =
    tone === 'hit'
      ? 'border-emerald-300 bg-emerald-50'
      : tone === 'below'
        ? 'border-amber-300 bg-amber-50'
        : 'border-neutral-200';

  function targetLabel(): string {
    if (target == null) return '';
    return mode === 'duration' ? `/ ${target}s` : `/ ${target}`;
  }

  function onInput() {
    if (readonly) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (value === lastSavedValue) return;
      if (!value) return; // nie zapisujemy pustego
      formEl?.requestSubmit();
    }, 600);
  }

  function onBlur() {
    if (readonly) return;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (value === lastSavedValue) return;
    if (!value) return;
    formEl?.requestSubmit();
  }
</script>

<form
  bind:this={formEl}
  method="POST"
  action="?/logSet"
  use:enhance={() => {
    saving = true;
    const submitted = value;
    return async ({ update }) => {
      await update({ reset: false });
      saving = false;
      lastSavedValue = submitted;
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
    on:input={onInput}
    on:blur={onBlur}
    inputmode="numeric"
    min="0"
    max="9999"
    disabled={readonly}
    placeholder={mode === 'reps' ? 'powt.' : 'sek.'}
    class="w-20 rounded-lg border px-2 py-2 text-center text-base focus:border-neutral-900 focus:outline-none disabled:opacity-60 {inputClass}"
  />

  <span class="text-sm text-neutral-400">{targetLabel()}</span>

  {#if !readonly}
    <span class="ml-auto text-xs text-neutral-400">
      {#if saving}…{:else if savedFlash}<span class="text-emerald-600">✓ zapisano</span>{:else if existing && value === lastSavedValue}zapisano{/if}
    </span>
  {/if}
</form>
