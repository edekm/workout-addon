<script lang="ts">
  type Progression = {
    level: number;
    variant_name: string;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_duration_s: number | null;
  };

  type Session = {
    session_id: number;
    day_label: string | null;
    completed_at: number;
    level: number;
    sets: Array<{ set_number: number; reps: number | null; duration_s: number | null }>;
    best: number;
  };

  export let data: {
    user: { id: number; slot: string; name: string };
    exercise: { id: number; slug: string; name_pl: string; category: string; equipment_ref: string };
    sessions: Session[];
    progressions: Progression[];
    currentLevel: number;
    currentProgression: Progression | null;
    mode: 'reps' | 'duration';
    totals: {
      total_reps: number | null;
      total_duration_s: number | null;
      total_sets: number;
    };
  };

  function fmtTotalBig(reps: number | null, duration: number | null, mode: 'reps' | 'duration'): { value: string; unit: string } {
    if (mode === 'duration') {
      const s = duration ?? 0;
      const m = Math.floor(s / 60);
      const rem = s % 60;
      if (m >= 60) {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        return { value: `${h}h ${mm}m`, unit: 'łącznie' };
      }
      if (m === 0) return { value: `${rem}s`, unit: 'łącznie' };
      return { value: `${m}m ${rem}s`, unit: 'łącznie' };
    }
    return { value: String(reps ?? 0), unit: 'powt. łącznie' };
  }

  $: chartW = 320;
  $: chartH = 140;
  $: padL = 26;
  $: padR = 10;
  $: padT = 10;
  $: padB = 24;
  $: plotW = chartW - padL - padR;
  $: plotH = chartH - padT - padB;

  // Y skala = max best + 20% albo target_max (jeśli wyższy)
  $: maxFromData = data.sessions.length
    ? Math.max(...data.sessions.map((s) => s.best))
    : 0;
  $: maxFromTarget = data.currentProgression
    ? data.currentProgression.target_reps_max ?? data.currentProgression.target_duration_s ?? 0
    : 0;
  $: yMax = Math.max(Math.ceil((maxFromData * 1.15) / 5) * 5, maxFromTarget, 5);

  $: points = data.sessions.map((s, i) => {
    const x = data.sessions.length > 1
      ? padL + (plotW * i) / (data.sessions.length - 1)
      : padL + plotW / 2;
    const y = padT + plotH - (s.best / yMax) * plotH;
    return { x, y, level: s.level, value: s.best, session: s };
  });

  $: linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`))
    .join(' ');

  // Linia targetu (top zakresu dla aktualnego levelu) - jeśli istnieje
  $: targetValue = data.currentProgression?.target_reps_max ?? data.currentProgression?.target_duration_s ?? null;
  $: targetY = targetValue != null
    ? padT + plotH - (targetValue / yMax) * plotH
    : null;

  function fmtValue(v: number | null, mode: 'reps' | 'duration'): string {
    if (v == null) return '—';
    return mode === 'duration' ? `${v}s` : String(v);
  }

  function fmtDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short'
    });
  }

  function fmtFullDate(unix: number): string {
    return new Date(unix * 1000).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function levelColor(level: number, currentLevel: number): string {
    if (level === currentLevel) return '#059669'; // emerald-600
    if (level < currentLevel) return '#94a3b8'; // slate-400 (historyczne, niższe)
    return '#3b82f6'; // blue-500 (nigdy się nie zdarzy w danych historycznych, ale na zaś)
  }

  // Numerujemy serię awansów - punkty gdzie level się zmienia
  $: levelChanges = data.sessions
    .map((s, i, arr) => ({ idx: i, level: s.level, prev: i > 0 ? arr[i - 1].level : null }))
    .filter((x) => x.prev !== null && x.level !== x.prev);
</script>

<main class="mx-auto max-w-md p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../" class="text-neutral-500 hover:text-neutral-900">←</a>
    <div class="min-w-0">
      <h1 class="truncate text-xl font-bold text-neutral-900">{data.exercise.name_pl}</h1>
      <p class="text-xs text-neutral-500">
        {data.user.name} · L{data.currentLevel}{#if data.currentProgression}: {data.currentProgression.variant_name}{/if}
      </p>
    </div>
  </header>

  {#if data.sessions.length === 0}
    <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      Brak zalogowanych serii dla tego ćwiczenia.
    </p>
  {:else}
    {@const big = fmtTotalBig(data.totals.total_reps, data.totals.total_duration_s, data.mode)}
    <section class="mb-4 rounded-2xl bg-emerald-50 p-5 text-center shadow-sm ring-1 ring-emerald-100">
      <p class="text-4xl font-bold tabular-nums text-emerald-900">{big.value}</p>
      <p class="mt-1 text-xs uppercase tracking-wider text-emerald-700">{big.unit}</p>
      <p class="mt-2 text-xs text-emerald-700/70">
        {data.totals.total_sets} serii w {data.sessions.length} sesjach
      </p>
    </section>

    <section class="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div class="mb-2 flex items-baseline justify-between">
        <h2 class="text-xs uppercase tracking-wider text-neutral-400">Progresja best set</h2>
        <span class="text-xs text-neutral-400">
          {data.mode === 'duration' ? 'sekundy' : 'powtórzenia'}
        </span>
      </div>
      <svg viewBox="0 0 {chartW} {chartH}" class="w-full" preserveAspectRatio="none">
        <!-- siatka Y co 25%, 50%, 75%, 100% -->
        {#each [0.25, 0.5, 0.75, 1.0] as frac}
          {@const y = padT + plotH * (1 - frac)}
          {@const label = Math.round(yMax * frac)}
          <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#f1f5f9" stroke-width="1" />
          <text x={padL - 4} y={y + 3} font-size="9" fill="#94a3b8" text-anchor="end">{label}</text>
        {/each}

        <!-- linia targetu -->
        {#if targetY != null}
          <line
            x1={padL}
            y1={targetY}
            x2={chartW - padR}
            y2={targetY}
            stroke="#10b981"
            stroke-width="1"
            stroke-dasharray="3 3"
          />
          <text x={chartW - padR - 2} y={targetY - 3} font-size="9" fill="#10b981" text-anchor="end">cel {targetValue}</text>
        {/if}

        <!-- linia łącząca punkty -->
        {#if points.length > 1}
          <path d={linePath} stroke="#cbd5e1" stroke-width="1.5" fill="none" />
        {/if}

        <!-- punkty -->
        {#each points as p}
          <circle cx={p.x} cy={p.y} r="3.5" fill={levelColor(p.level, data.currentLevel)} />
        {/each}

        <!-- pionowe markery awansów -->
        {#each levelChanges as lc}
          {@const p = points[lc.idx]}
          {#if p}
            <line x1={p.x} y1={padT} x2={p.x} y2={padT + plotH} stroke="#fbbf24" stroke-width="1" stroke-dasharray="2 2" />
            <text x={p.x} y={padT + 8} font-size="9" fill="#d97706" text-anchor="middle">L{p.level}</text>
          {/if}
        {/each}

        <!-- daty na osi X (start, środek, koniec) -->
        {#if points.length > 0}
          {@const first = data.sessions[0]}
          {@const last = data.sessions[data.sessions.length - 1]}
          <text x={padL} y={chartH - 8} font-size="9" fill="#94a3b8" text-anchor="start">
            {fmtDate(first.completed_at)}
          </text>
          {#if data.sessions.length > 1}
            <text x={chartW - padR} y={chartH - 8} font-size="9" fill="#94a3b8" text-anchor="end">
              {fmtDate(last.completed_at)}
            </text>
          {/if}
        {/if}
      </svg>
      <p class="mt-2 text-xs text-neutral-400">
        Punkt = najlepsza seria w sesji. Żółta linia = zmiana levelu. Zielona przerywana = aktualny cel.
      </p>
    </section>

    <h2 class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Historia sesji</h2>
    <ul class="flex flex-col gap-2">
      {#each [...data.sessions].reverse() as s}
        <li class="rounded-xl bg-white p-3 shadow-sm">
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-sm font-medium text-neutral-900">
              {s.day_label ?? 'Sesja'}
              <span class="ml-1 text-xs font-normal text-neutral-400">L{s.level}</span>
            </p>
            <span class="text-xs text-neutral-400">{fmtFullDate(s.completed_at)}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-1.5">
            {#each s.sets as set}
              <span class="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-neutral-700">
                {fmtValue(set.reps ?? set.duration_s, data.mode)}
              </span>
            {/each}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</main>
