<script lang="ts">
  import { enhance, deserialize } from '$app/forms';
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

  type ProgressionFull = {
    level: number;
    variant_name: string;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_s: number | null;
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
    promoted?: boolean;
    level_source?: 'auto' | 'manual' | 'plan';
    all_progressions?: ProgressionFull[];
    last_sets?: Array<{ set_number: number; reps: number | null; duration_s: number | null }>;
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
  let showLevelMenu = false;
  let saving = false;
  let saveError = '';

  async function changeLevel(exerciseId: number, level: number) {
    saving = true;
    saveError = '';
    const fd = new FormData();
    fd.append('exercise_id', String(exerciseId));
    fd.append('level', String(level));
    try {
      const res = await fetch('?/setLevel', {
        method: 'POST',
        body: fd,
        headers: { 'x-sveltekit-action': 'true' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const result: any = deserialize(await res.text());
      if (result?.type === 'failure' || result?.type === 'error') {
        throw new Error(result?.data?.message ?? result?.error?.message ?? 'Błąd');
      }
      // Reload danych z serwera (invalidate)
      const { invalidateAll } = await import('$app/navigation');
      await invalidateAll();
      showLevelMenu = false;
      setNum = 1;
      phase = 'log';
      syncInputFromExisting();
    } catch (e) {
      saveError = 'Nie zmieniono poziomu: ' + ((e as Error).message ?? 'błąd');
    } finally {
      saving = false;
    }
  }

  // Timer odpoczynku i timer ćwiczenia (duration mode)
  let restElapsed = 0; // sekundy od startu odpoczynku
  let restInterval: ReturnType<typeof setInterval> | null = null;
  let restSignaled = false;

  // Timer ćwiczenia: idle → pre (odliczanie 5s) → running (odliczanie targetu) → done
  const PRE_SECONDS = 5;
  let timerPhase: 'idle' | 'pre' | 'running' | 'paused' | 'done' = 'idle';
  let preRemaining = PRE_SECONDS;
  let mainRemaining = 0;
  let exerciseInterval: ReturnType<typeof setInterval> | null = null;

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
    saveError = '';
    showLevelMenu = false;
    showTechnique = false;
    // Czytamy bezpośrednio z data, nie z reactive $: (które jeszcze nie przeliczyło)
    const ex = data.exercises[exIdx];
    if (!ex) return;
    const exMode = ex.progression?.target_duration_s != null ? 'duration' : 'reps';
    const exTarget =
      exMode === 'duration'
        ? ex.progression?.target_duration_s ?? 0
        : ex.progression?.target_reps_max ?? ex.progression?.target_reps_min ?? 0;
    const existing = ex.sets.find((s) => s.set_number === setNum) ?? null;

    if (existing) {
      inputValue = exMode === 'reps' ? String(existing.reps ?? '') : String(existing.duration_s ?? '');
    } else {
      inputValue = '';
    }
    stopExerciseInterval();
    timerPhase = 'idle';
    preRemaining = PRE_SECONDS;
    mainRemaining = exTarget;
  }

  function stopExerciseInterval() {
    if (exerciseInterval) {
      clearInterval(exerciseInterval);
      exerciseInterval = null;
    }
  }

  // Wake Lock - ekran nie gaśnie podczas aktywnej sesji
  let wakeLock: any = null;

  async function acquireWakeLock() {
    if (readonly) return;
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        wakeLock.addEventListener?.('release', () => {
          wakeLock = null;
        });
      }
    } catch {
      // np. user nie dał gestu, brak supportu - ignorujemy
    }
  }

  function releaseWakeLock() {
    try {
      wakeLock?.release?.();
    } catch {}
    wakeLock = null;
  }

  function onVisibility() {
    if (document.visibilityState === 'visible' && !readonly && !wakeLock) {
      acquireWakeLock();
    }
  }

  onMount(() => {
    if (!readonly) {
      const start = findStartingStep();
      exIdx = start.exIdx;
      setNum = start.setNum;
      syncInputFromExisting();
      acquireWakeLock();
      document.addEventListener('visibilitychange', onVisibility);
    }
  });

  onDestroy(() => {
    if (restInterval) clearInterval(restInterval);
    if (exerciseInterval) clearInterval(exerciseInterval);
    releaseWakeLock();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
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
  function startExerciseTimer() {
    ensureAudio();
    if (timerPhase === 'paused') {
      // wznawiamy od mainRemaining
      timerPhase = 'running';
      tickExerciseMain();
      return;
    }
    // idle → pre
    timerPhase = 'pre';
    preRemaining = PRE_SECONDS;
    mainRemaining = target ?? 0;
    inputValue = '';
    tickExercisePre();
  }

  function tickExercisePre() {
    stopExerciseInterval();
    exerciseInterval = setInterval(() => {
      preRemaining -= 1;
      if (preRemaining <= 3 && preRemaining > 0) beep(660, 100);
      if (preRemaining <= 0) {
        stopExerciseInterval();
        beep(1100, 250);
        timerPhase = 'running';
        tickExerciseMain();
      }
    }, 1000);
  }

  function tickExerciseMain() {
    stopExerciseInterval();
    exerciseInterval = setInterval(() => {
      mainRemaining -= 1;
      if (mainRemaining <= 0) {
        stopExerciseInterval();
        signal();
        timerPhase = 'done';
        if (target != null) inputValue = String(target);
      }
    }, 1000);
  }

  function pauseExerciseTimer() {
    if (timerPhase !== 'running') return;
    stopExerciseInterval();
    timerPhase = 'paused';
    if (target != null) {
      const elapsed = target - mainRemaining;
      inputValue = String(Math.max(0, elapsed));
    }
  }

  function resetExerciseTimer() {
    stopExerciseInterval();
    timerPhase = 'idle';
    preRemaining = PRE_SECONDS;
    mainRemaining = target ?? 0;
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
    stopExerciseInterval();
    timerPhase = 'idle';
    preRemaining = PRE_SECONDS;
    mainRemaining = 0;
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

  async function submitNext() {
    if (!currentEx || saving) return;
    ensureAudio();
    const v = valueToSubmit();
    if (!v) return;
    saving = true;
    saveError = '';
    const fd = new FormData();
    fd.append('exercise_id', String(currentEx.exercise_id));
    fd.append('set_number', String(setNum));
    fd.append('level', String(currentEx.progression?.level ?? currentEx.start_level));
    if (mode === 'reps') fd.append('reps', v);
    else fd.append('duration_s', v);

    try {
      const res = await fetch('?/logSet', {
        method: 'POST',
        body: fd,
        headers: { 'x-sveltekit-action': 'true' }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const result: any = deserialize(await res.text());
      if (result?.type === 'failure') {
        throw new Error(result?.data?.message ?? 'Zapis odrzucony');
      }
      if (result?.type === 'error') {
        throw new Error(result?.error?.message ?? 'Błąd serwera');
      }
      inputValue = v;
      handleSaved();
    } catch (e) {
      saveError = 'Nie zapisano: ' + ((e as Error).message ?? 'błąd');
    } finally {
      saving = false;
    }
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

    <form
      method="POST"
      action="?/deleteSession"
      class="mt-6"
      on:submit={(e) => {
        if (!confirm('Usunąć tę sesję na zawsze? Wszystkie zalogowane serie znikną.')) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        class="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Usuń sesję
      </button>
    </form>
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
      <div class="flex items-start justify-between gap-2">
        <h2 class="text-xl font-bold text-neutral-900">{currentEx.name_pl}</h2>
        <button
          type="button"
          on:click={() => (showLevelMenu = !showLevelMenu)}
          class="shrink-0 rounded-lg px-2 py-1 text-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Opcje"
        >
          ⋯
        </button>
      </div>
      {#if currentEx.progression}
        <p class="mt-0.5 text-sm text-neutral-600">
          L{currentEx.progression.level}: {currentEx.progression.variant_name}
          {#if currentEx.promoted}
            <span class="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700">
              ↑ Awans
            </span>
          {/if}
        </p>
      {/if}
      <p class="mt-0.5 text-xs text-neutral-500">
        {equipmentLabel(currentEx.equipment_ref)} · odpoczynek {currentEx.rest_seconds}s
      </p>

      {#if showLevelMenu && currentEx.all_progressions}
        <div class="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
          <p class="mb-2 text-xs uppercase tracking-wider text-neutral-500">
            Zmień poziom (resetuje serie tego ćwiczenia)
          </p>
          <div class="flex flex-col gap-1">
            {#each currentEx.all_progressions as p}
              {@const isCurrent = currentEx.progression?.level === p.level}
              <button
                type="button"
                disabled={saving || isCurrent}
                on:click={() => changeLevel(currentEx.exercise_id, p.level)}
                class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm
                  {isCurrent ? 'bg-neutral-900 text-white' : 'bg-white hover:bg-neutral-100'}"
              >
                <span>
                  <span class="font-medium">L{p.level}:</span> {p.variant_name}
                </span>
                <span class="text-xs opacity-60">
                  {#if p.target_duration_s != null}
                    {p.target_duration_s}s
                  {:else if p.target_reps_max != null}
                    {p.target_reps_min}-{p.target_reps_max}
                  {/if}
                </span>
              </button>
            {/each}
          </div>
          {#if currentEx.promoted}
            <p class="mt-2 text-xs text-neutral-500">
              Awans był automatyczny - możesz cofnąć wybierając poprzedni poziom.
            </p>
          {:else if currentEx.level_source === 'manual'}
            <p class="mt-2 text-xs text-neutral-500">
              Poziom ustawiony ręcznie. Auto-awans nadal działa - po 2 sesjach
              w celu system sam podbije wariant.
            </p>
          {/if}
        </div>
      {/if}

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

      {#if currentEx.last_sets && currentEx.last_sets.length > 0}
        <p class="mt-1 text-xs text-neutral-400">
          Ostatnio:
          {#each currentEx.last_sets as ls, i}
            <span class="font-mono">
              {ls.reps ?? `${ls.duration_s}s`}{i < (currentEx.last_sets?.length ?? 0) - 1 ? ', ' : ''}
            </span>
          {/each}
        </p>
      {:else}
        <p class="mt-1 text-xs text-neutral-400">Ostatnio: —</p>
      {/if}

      {#if phase === 'log'}
        <!-- Faza logowania serii -->
        <div class="mt-5">
          {#if saveError}
            <p class="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveError}</p>
          {/if}

          {#if mode === 'duration'}
            <div class="flex flex-col items-center gap-3">
              {#if timerPhase === 'pre'}
                <p class="text-xs uppercase tracking-wider text-amber-600">Przygotuj się</p>
                <div class="text-6xl font-mono font-bold tabular-nums text-amber-600">
                  {preRemaining}
                </div>
              {:else if timerPhase === 'done'}
                <p class="text-xs uppercase tracking-wider text-emerald-600">Gotowe</p>
                <div class="text-5xl font-mono font-bold tabular-nums text-emerald-600">
                  {fmtTime(target ?? 0)}
                </div>
              {:else}
                {#if target != null}
                  <p class="text-xs text-neutral-500">cel {fmtTime(target)}</p>
                {/if}
                <div class="text-5xl font-mono font-bold tabular-nums {timerPhase === 'running' ? 'text-neutral-900' : 'text-neutral-500'}">
                  {fmtTime(timerPhase === 'idle' ? (target ?? 0) : mainRemaining)}
                </div>
              {/if}

              <div class="flex gap-2">
                {#if timerPhase === 'running'}
                  <button
                    type="button"
                    on:click={pauseExerciseTimer}
                    class="rounded-xl bg-amber-600 px-5 py-3 text-base font-semibold text-white"
                  >
                    Pauza
                  </button>
                {:else if timerPhase === 'pre'}
                  <button
                    type="button"
                    on:click={resetExerciseTimer}
                    class="rounded-xl border border-neutral-200 px-5 py-3 text-base text-neutral-500"
                  >
                    Anuluj
                  </button>
                {:else if timerPhase === 'paused'}
                  <button
                    type="button"
                    on:click={startExerciseTimer}
                    class="rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white"
                  >
                    Wznów
                  </button>
                  <button
                    type="button"
                    on:click={resetExerciseTimer}
                    class="rounded-xl border border-neutral-200 px-3 py-3 text-sm text-neutral-500"
                  >
                    Reset
                  </button>
                {:else if timerPhase === 'done'}
                  <button
                    type="button"
                    on:click={resetExerciseTimer}
                    class="rounded-xl border border-neutral-200 px-3 py-3 text-sm text-neutral-500"
                  >
                    Reset
                  </button>
                {:else}
                  <button
                    type="button"
                    on:click={startExerciseTimer}
                    class="rounded-xl bg-emerald-600 px-5 py-3 text-base font-semibold text-white"
                  >
                    Start
                  </button>
                {/if}
              </div>

              {#if timerPhase === 'idle' || timerPhase === 'paused' || timerPhase === 'done'}
                <p class="mt-1 text-xs text-neutral-400">Lub wpisz ręcznie:</p>
                <input
                  type="number"
                  inputmode="numeric"
                  bind:value={inputValue}
                  placeholder="sek."
                  class="w-24 rounded-lg border px-2 py-2 text-center text-base focus:border-neutral-900 focus:outline-none {inputClass}"
                />
              {/if}
            </div>
          {:else}
            <div class="flex flex-col items-center gap-3">
              <input
                type="number"
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
        </div>
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
          disabled={saving || (mode === 'duration' && (timerPhase === 'pre' || timerPhase === 'running'))}
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
