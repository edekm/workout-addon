<script lang="ts">
  import { enhance } from '$app/forms';
  import { onMount, onDestroy } from 'svelte';
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

  // ------- Stan guided flow -------
  // exIdx: indeks ćwiczenia 0..N-1
  // setNum: numer aktualnej serii 1..target_sets
  // phase: 'log' = wpisuję serię, 'rest' = timer odpoczynku
  let exIdx = 0;
  let setNum = 1;
  let phase: 'log' | 'rest' = 'log';
  let inputValue = '';
  let showTechnique = false;
  let saving = false;

  // Timer odpoczynku i timer ćwiczenia (duration mode)
  let restElapsed = 0; // sekundy od startu odpoczynku
  let restInterval: ReturnType<typeof setInterval> | null = null;
  let restSignaled = false;

  let exerciseElapsed = 0;
  let exerciseRunning = false;
  let exerciseInterval: ReturnType<typeof setInterval> | null = null;
  let exerciseSignaled = false;

  let audioCtx: AudioContext | null = null;

  $: currentEx = data.exercises[exIdx] ?? null;
  $: mode = currentEx?.progression?.target_duration_s != null ? 'duration' : 'reps';
  $: target =
    mode === 'duration'
      ? currentEx?.progression?.target_duration_s ?? null
      : currentEx?.progression?.target_reps_max ?? currentEx?.progression?.target_reps_min ?? null;
  $: existingSet = currentEx?.sets.find((s) => s.set_number === setNum) ?? null;
  $: isLastSetOfExercise = currentEx ? setNum >= currentEx.target_sets : false;
  $: isLastExercise = exIdx >= data.exercises.length - 1;
  $: totalSetsLogged = data.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  $: totalSetsTarget = data.exercises.reduce((acc, ex) => acc + ex.target_sets, 0);

  // Init: znajdź pierwszą nieukończoną serię
  function findStartingStep(): { exIdx: number; setNum: number } {
    for (let i = 0; i < data.exercises.length; i++) {
      const ex = data.exercises[i];
      if (ex.sets.length < ex.target_sets) {
        return { exIdx: i, setNum: ex.sets.length + 1 };
      }
    }
    return { exIdx: data.exercises.length - 1, setNum: data.exercises[data.exercises.length - 1]?.target_sets ?? 1 };
  }

  function syncInputFromExisting() {
    if (existingSet) {
      inputValue = mode === 'reps' ? String(existingSet.reps ?? '') : String(existingSet.duration_s ?? '');
      if (mode === 'duration') {
        exerciseElapsed = existingSet.duration_s ?? 0;
      }
    } else {
      inputValue = '';
      if (mode === 'duration') exerciseElapsed = 0;
    }
  }

  onMount(() => {
    if (!readonly) {
      const start = findStartingStep();
      exIdx = start.exIdx;
      setNum = start.setNum;
      syncInputFromExisting();
    }
  });

  onDestroy(() => {
    if (restInterval) clearInterval(restInterval);
    if (exerciseInterval) clearInterval(exerciseInterval);
  });

  function ensureAudio() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        audioCtx = null;
      }
    }
  }

  function beep(freq = 880, durationMs = 200) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.05);
    } catch {}
  }

  function signal() {
    beep(880, 180);
    setTimeout(() => beep(1100, 220), 200);
    try {
      navigator.vibrate?.([180, 80, 220]);
    } catch {}
  }

  // ------- Timer odpoczynku -------
  function startRest() {
    restElapsed = 0;
    restSignaled = false;
    if (restInterval) clearInterval(restInterval);
    restInterval = setInterval(() => {
      restElapsed += 1;
      const restTarget = currentEx?.rest_seconds ?? 60;
      if (!restSignaled && restElapsed >= restTarget) {
        restSignaled = true;
        signal();
      }
    }, 1000);
  }

  function stopRest() {
    if (restInterval) {
      clearInterval(restInterval);
      restInterval = null;
    }
  }

  // ------- Timer ćwiczenia (duration) -------
  function toggleExerciseTimer() {
    ensureAudio();
    if (exerciseRunning) {
      // stop
      exerciseRunning = false;
      if (exerciseInterval) {
        clearInterval(exerciseInterval);
        exerciseInterval = null;
      }
      inputValue = String(exerciseElapsed);
    } else {
      // start
      exerciseRunning = true;
      exerciseSignaled = false;
      exerciseInterval = setInterval(() => {
        exerciseElapsed += 1;
        if (!exerciseSignaled && target != null && exerciseElapsed >= target) {
          exerciseSignaled = true;
          signal();
        }
      }, 1000);
    }
  }

  function resetExerciseTimer() {
    exerciseRunning = false;
    if (exerciseInterval) {
      clearInterval(exerciseInterval);
      exerciseInterval = null;
    }
    exerciseElapsed = 0;
    exerciseSignaled = false;
    inputValue = '';
  }

  function fmtTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ------- Akcje "Dalej" / nawigacja -------
  function valueToSubmit(): string {
    if (inputValue && inputValue.trim() !== '') return inputValue.trim();
    if (target != null) return String(target);
    return '';
  }

  function handleSaved() {
    // Aktualizujemy lokalny set w data, bez SSR roundtripu
    const submitted = Number(valueToSubmit());
    if (!Number.isFinite(submitted) || !currentEx) return;
    const idx = currentEx.sets.findIndex((s) => s.set_number === setNum);
    const setObj: SetItem = {
      id: existingSet?.id ?? Date.now(),
      exercise_id: currentEx.exercise_id,
      set_number: setNum,
      level: currentEx.progression?.level ?? currentEx.start_level,
      reps: mode === 'reps' ? submitted : null,
      duration_s: mode === 'duration' ? submitted : null
    };
    if (idx >= 0) currentEx.sets[idx] = setObj;
    else currentEx.sets = [...currentEx.sets, setObj];
    data.exercises = data.exercises; // trigger reactivity

    // Przejście dalej
    if (isLastSetOfExercise && isLastExercise) {
      // koniec — zostajemy żeby user kliknął "Zakończ"
      phase = 'rest';
      ensureAudio();
      startRest();
    } else {
      phase = 'rest';
      ensureAudio();
      startRest();
    }
  }

  function goToNextSet() {
    stopRest();
    exerciseElapsed = 0;
    exerciseSignaled = false;
    exerciseRunning = false;
    if (exerciseInterval) {
      clearInterval(exerciseInterval);
      exerciseInterval = null;
    }
    if (isLastSetOfExercise) {
      // następne ćwiczenie
      if (!isLastExercise) {
        exIdx += 1;
        setNum = 1;
      }
    } else {
      setNum += 1;
    }
    phase = 'log';
    syncInputFromExisting();
  }

  function goBack() {
    stopRest();
    if (phase === 'rest') {
      phase = 'log';
      syncInputFromExisting();
      return;
    }
    if (setNum > 1) {
      setNum -= 1;
    } else if (exIdx > 0) {
      exIdx -= 1;
      setNum = data.exercises[exIdx].target_sets;
    }
    phase = 'log';
    syncInputFromExisting();
  }

  // Submit hidden form po kliknięciu "Dalej"
  let formEl: HTMLFormElement;
  function submitNext() {
    ensureAudio();
    if (!currentEx) return;
    const v = valueToSubmit();
    if (!v) return;
    // wypełniamy input warunkowo (target gdy puste) tuż przed submitem
    inputValue = v;
    formEl?.requestSubmit();
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

  function fmtDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Klasyfikacja wartości na potrzeby kolorów (input log phase)
  function classifyValue(v: string): 'empty' | 'below' | 'hit' {
    if (!v) return 'empty';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'empty';
    if (target != null && n < target) return 'below';
    return 'hit';
  }
  $: tone = classifyValue(inputValue);
  $: inputClass =
    tone === 'hit'
      ? 'border-emerald-300 bg-emerald-50'
      : tone === 'below'
        ? 'border-amber-300 bg-amber-50'
        : 'border-neutral-200';

  $: restTarget = currentEx?.rest_seconds ?? 60;
  $: restRemaining = restTarget - restElapsed;
  $: nextLabel = isLastSetOfExercise
    ? isLastExercise
      ? null
      : `Następne: ${data.exercises[exIdx + 1]?.name_pl}`
    : `Następna: seria ${setNum + 1}/${currentEx?.target_sets}`;
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

  {#if readonly}
    <!-- Widok read-only: prosta lista zalogowanych serii -->
    <ol class="flex flex-col gap-3">
      {#each data.exercises as ex}
        <li class="rounded-2xl bg-white p-4 shadow-sm">
          <div class="mb-2 flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-neutral-400">{ex.ord}.</p>
              <h2 class="font-semibold text-neutral-900">{ex.name_pl}</h2>
              {#if ex.progression}
                <p class="text-sm text-neutral-600">L{ex.progression.level}: {ex.progression.variant_name}</p>
              {/if}
            </div>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase {categoryColor(ex.category)}">
              {ex.category}
            </span>
          </div>
          <div class="flex flex-wrap gap-2">
            {#each ex.sets as s}
              <span class="rounded-lg bg-neutral-100 px-2 py-1 text-sm text-neutral-700">
                #{s.set_number}: {s.reps ?? `${s.duration_s}s`}
              </span>
            {/each}
            {#if ex.sets.length === 0}
              <span class="text-xs italic text-neutral-400">brak serii</span>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
  {:else if currentEx}
    <!-- Guided flow -->
    <section class="rounded-2xl bg-white p-5 shadow-sm">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-xs uppercase tracking-wider text-neutral-400">
          Ćwiczenie {exIdx + 1}/{data.exercises.length}
        </span>
        <span class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase {categoryColor(currentEx.category)}">
          {currentEx.category}
        </span>
      </div>
      <h2 class="text-xl font-bold text-neutral-900">{currentEx.name_pl}</h2>
      {#if currentEx.progression}
        <p class="mt-0.5 text-sm text-neutral-600">
          L{currentEx.progression.level}: {currentEx.progression.variant_name}
        </p>
      {/if}
      <p class="mt-0.5 text-xs text-neutral-500">
        {equipmentLabel(currentEx.equipment_ref)} · odpoczynek {currentEx.rest_seconds}s
      </p>

      {#if currentEx.technique_md}
        <button
          type="button"
          on:click={() => (showTechnique = !showTechnique)}
          class="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
        >
          {showTechnique ? '▾' : '▸'} Technika
        </button>
        {#if showTechnique}
          <p class="mt-1 rounded-lg bg-neutral-50 px-3 py-2 text-sm leading-relaxed text-neutral-700">
            {currentEx.technique_md}
          </p>
        {/if}
      {/if}

      <!-- Wskaźnik serii -->
      <div class="mt-4 flex gap-1.5">
        {#each Array.from({ length: currentEx.target_sets }, (_, i) => i + 1) as n}
          <span
            class="h-2 flex-1 rounded-full
              {n < setNum ? 'bg-emerald-400' : n === setNum ? 'bg-neutral-900' : 'bg-neutral-200'}"
          ></span>
        {/each}
      </div>
      <p class="mt-2 text-sm text-neutral-500">
        Seria {setNum}/{currentEx.target_sets}
        {#if target != null}
          · cel {mode === 'duration' ? `${target}s` : target}
        {/if}
      </p>

      {#if phase === 'log'}
        <!-- Faza logowania serii -->
        <form
          bind:this={formEl}
          method="POST"
          action="?/logSet"
          use:enhance={() => {
            saving = true;
            return async ({ update }) => {
              await update({ reset: false });
              saving = false;
              handleSaved();
            };
          }}
          class="mt-5"
        >
          <input type="hidden" name="exercise_id" value={currentEx.exercise_id} />
          <input type="hidden" name="set_number" value={setNum} />
          <input type="hidden" name="level" value={currentEx.progression?.level ?? currentEx.start_level} />

          {#if mode === 'duration'}
            <div class="flex flex-col items-center gap-3">
              <div class="text-5xl font-mono font-bold tabular-nums {exerciseSignaled ? 'text-emerald-600' : 'text-neutral-900'}">
                {fmtTime(exerciseElapsed)}
              </div>
              {#if target != null}
                <p class="text-xs text-neutral-500">cel {fmtTime(target)}</p>
              {/if}
              <div class="flex gap-2">
                <button
                  type="button"
                  on:click={toggleExerciseTimer}
                  class="rounded-xl px-5 py-3 text-base font-semibold text-white {exerciseRunning ? 'bg-amber-600' : 'bg-emerald-600'}"
                >
                  {exerciseRunning ? 'Pauza' : exerciseElapsed > 0 ? 'Wznów' : 'Start'}
                </button>
                {#if exerciseElapsed > 0 && !exerciseRunning}
                  <button
                    type="button"
                    on:click={resetExerciseTimer}
                    class="rounded-xl border border-neutral-200 px-3 py-3 text-sm text-neutral-500"
                  >
                    Reset
                  </button>
                {/if}
              </div>
              <input type="hidden" name="duration_s" bind:value={inputValue} />
              <p class="text-xs text-neutral-400">Lub wpisz ręcznie:</p>
              <input
                type="number"
                inputmode="numeric"
                bind:value={inputValue}
                placeholder="sek."
                class="w-24 rounded-lg border px-2 py-2 text-center text-base focus:border-neutral-900 focus:outline-none {inputClass}"
              />
            </div>
          {:else}
            <div class="flex flex-col items-center gap-3">
              <input
                type="number"
                name="reps"
                bind:value={inputValue}
                inputmode="numeric"
                min="0"
                max="9999"
                placeholder={target != null ? String(target) : 'powt.'}
                class="w-32 rounded-xl border-2 px-3 py-4 text-center text-3xl font-bold tabular-nums focus:border-neutral-900 focus:outline-none {inputClass}"
              />
              <p class="text-xs text-neutral-400">
                Puste = zapisze cel ({target ?? '—'})
              </p>
            </div>
          {/if}
        </form>
      {:else}
        <!-- Faza odpoczynku -->
        <div class="mt-5 flex flex-col items-center gap-3 rounded-xl bg-neutral-50 p-5">
          <p class="text-xs uppercase tracking-wider text-neutral-400">Odpoczynek</p>
          <div class="text-5xl font-mono font-bold tabular-nums {restRemaining <= 0 ? 'text-emerald-600' : 'text-neutral-900'}">
            {#if restRemaining > 0}
              {fmtTime(restRemaining)}
            {:else}
              +{fmtTime(-restRemaining)}
            {/if}
          </div>
          {#if restRemaining > 0}
            <p class="text-xs text-neutral-500">cel {restTarget}s</p>
          {:else}
            <p class="text-xs font-medium text-emerald-700">gotowe</p>
          {/if}
          {#if nextLabel}
            <p class="mt-2 text-sm text-neutral-600">{nextLabel}</p>
          {:else}
            <p class="mt-2 text-sm font-medium text-emerald-700">To była ostatnia seria!</p>
          {/if}
        </div>
      {/if}
    </section>

    <!-- Nawigacja wstecz (poza ostatnim ćwiczeniem) -->
    {#if exIdx > 0 || setNum > 1 || phase === 'rest'}
      <button
        type="button"
        on:click={goBack}
        class="mt-3 text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Wstecz
      </button>
    {/if}
  {/if}
</main>

{#if !readonly && currentEx}
  <div class="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur">
    <div class="mx-auto flex max-w-md items-center gap-2">
      {#if phase === 'log'}
        <form method="POST" action="?/cancel" class="flex-shrink-0" use:enhance>
          <button
            type="submit"
            class="rounded-xl border border-neutral-200 px-3 py-3 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Anuluj
          </button>
        </form>
        <button
          type="button"
          on:click={submitNext}
          disabled={saving || (mode === 'duration' && exerciseRunning)}
          class="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-base font-semibold text-white disabled:bg-neutral-400"
        >
          {saving ? 'Zapis…' : 'Dalej'}
        </button>
      {:else if isLastSetOfExercise && isLastExercise}
        <form method="POST" action="?/complete" class="flex-1" use:enhance>
          <button
            type="submit"
            class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700"
          >
            Zakończ sesję ({totalSetsLogged}/{totalSetsTarget})
          </button>
        </form>
      {:else}
        <button
          type="button"
          on:click={goToNextSet}
          class="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-base font-semibold text-white"
        >
          {isLastSetOfExercise ? 'Następne ćwiczenie →' : 'Następna seria →'}
        </button>
      {/if}
    </div>
  </div>
{/if}
