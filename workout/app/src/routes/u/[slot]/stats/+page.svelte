<script lang="ts">
  export let data: {
    user: { id: number; slot: string; name: string };
    exercises: Array<{
      id: number;
      slug: string;
      name_pl: string;
      category: string;
      current_level: number;
      sessions_count: number;
      sets_count: number;
      last_session_at: number | null;
    }>;
    summary: {
      total_sessions: number;
      total_sets: number;
      last_session_at: number | null;
    };
  };

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

  function fmtDate(unix: number | null): string {
    if (!unix) return '—';
    return new Date(unix * 1000).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: 'short'
    });
  }
</script>

<main class="mx-auto max-w-md p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../{data.user.slot}" class="text-neutral-500 hover:text-neutral-900">←</a>
    <div>
      <h1 class="text-xl font-bold text-neutral-900">Statystyki</h1>
      <p class="text-xs text-neutral-500">{data.user.name}</p>
    </div>
  </header>

  <section class="mb-6 grid grid-cols-3 gap-2">
    <div class="rounded-xl bg-white p-3 text-center shadow-sm">
      <p class="text-2xl font-bold text-neutral-900">{data.summary.total_sessions}</p>
      <p class="text-[10px] uppercase tracking-wider text-neutral-400">sesji</p>
    </div>
    <div class="rounded-xl bg-white p-3 text-center shadow-sm">
      <p class="text-2xl font-bold text-neutral-900">{data.summary.total_sets}</p>
      <p class="text-[10px] uppercase tracking-wider text-neutral-400">serii</p>
    </div>
    <div class="rounded-xl bg-white p-3 text-center shadow-sm">
      <p class="text-2xl font-bold text-neutral-900">{fmtDate(data.summary.last_session_at)}</p>
      <p class="text-[10px] uppercase tracking-wider text-neutral-400">ostatnio</p>
    </div>
  </section>

  <h2 class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Ćwiczenia</h2>
  {#if data.exercises.length === 0}
    <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      Brak danych. Zacznij sesję i zaloguj kilka serii, statystyki pojawią się tu.
    </p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each data.exercises as ex}
        <li>
          <a
            href="stats/{ex.slug}"
            class="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm hover:bg-neutral-50"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate font-medium text-neutral-900">{ex.name_pl}</h3>
                <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase {categoryColor(ex.category)}">
                  {ex.category}
                </span>
              </div>
              <p class="mt-0.5 text-xs text-neutral-500">
                L{ex.current_level} · {ex.sessions_count} sesji · {ex.sets_count} serii
              </p>
            </div>
            <span class="ml-2 text-xs text-neutral-400">{fmtDate(ex.last_session_at)}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>
