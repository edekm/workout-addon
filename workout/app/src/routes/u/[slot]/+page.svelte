<script lang="ts">
  export let data: {
    user: { id: number; slot: string; name: string };
    plan: { id: number; name: string; description: string | null } | null;
    days: Array<{ label: string; exercise_count: number }>;
    recentSessions: Array<{
      id: number;
      day_label: string | null;
      started_at: number;
      completed_at: number | null;
      set_count: number;
    }>;
    suggestedDay: string | null;
  };

  function fmtDate(unix: number): string {
    const d = new Date(unix * 1000);
    return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
  }
</script>

<main class="mx-auto max-w-md p-4">
  <header class="flex items-center gap-3 pt-2 pb-6">
    <a href="../" class="text-neutral-500 hover:text-neutral-900">←</a>
    <h1 class="text-xl font-bold text-neutral-900">{data.user.name}</h1>
  </header>

  {#if data.plan}
    <section class="mb-6 rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h2 class="text-xs uppercase tracking-wider text-neutral-400">Aktywny plan</h2>
          <p class="mt-1 font-semibold text-neutral-900">{data.plan.name}</p>
          {#if data.plan.description}
            <p class="mt-1 text-sm text-neutral-500">{data.plan.description}</p>
          {/if}
        </div>
        <a
          href="../plans"
          class="shrink-0 text-xs text-neutral-500 underline hover:text-neutral-900"
        >
          zmień
        </a>
      </div>
    </section>

    <section class="mb-6">
      <div class="mb-2 flex items-baseline justify-between">
        <h2 class="text-xs uppercase tracking-wider text-neutral-400">Dni</h2>
        {#if data.suggestedDay}
          <span class="text-xs text-emerald-700">sugerowany na dziś ↓</span>
        {/if}
      </div>
      <div class="flex flex-col gap-2">
        {#each data.days as day}
          {@const suggested = day.label === data.suggestedDay}
          <a
            href="{data.user.slot}/day/{encodeURIComponent(day.label)}"
            class="flex items-center justify-between rounded-xl px-4 py-4 shadow-sm transition hover:shadow-md active:scale-[0.99]
                   {suggested ? 'bg-emerald-50 ring-2 ring-emerald-300' : 'bg-white'}"
          >
            <span class="font-medium {suggested ? 'text-emerald-900' : 'text-neutral-900'}">
              {day.label}
            </span>
            <span class="text-sm text-neutral-400">{day.exercise_count} ćw.</span>
          </a>
        {/each}
      </div>
    </section>
  {:else}
    <a
      href="../plans"
      class="mb-6 block rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 hover:bg-amber-100"
    >
      <p class="text-sm font-medium text-amber-900">
        Brak aktywnego planu — wybierz z biblioteki planów →
      </p>
    </a>
  {/if}

  <div class="mb-6 flex flex-col gap-2">
    <a
      href="{data.user.slot}/stats"
      class="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm hover:bg-neutral-50"
    >
      <span class="font-medium text-neutral-900">Statystyki i progresja</span>
      <span class="text-neutral-400">→</span>
    </a>
    <a
      href="../library"
      class="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm hover:bg-neutral-50"
    >
      <span class="font-medium text-neutral-900">Biblioteka ćwiczeń</span>
      <span class="text-neutral-400">→</span>
    </a>
    <a
      href="../plans"
      class="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm hover:bg-neutral-50"
    >
      <span class="font-medium text-neutral-900">Plany treningowe</span>
      <span class="text-neutral-400">→</span>
    </a>
  </div>

  <section>
    <h2 class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Ostatnie sesje</h2>
    {#if data.recentSessions.length === 0}
      <p class="text-sm text-neutral-400">Brak historii.</p>
    {:else}
      <ul class="flex flex-col gap-1">
        {#each data.recentSessions as s}
          <li>
            <a
              href="../session/{s.id}"
              class="flex justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-50"
            >
              <span class="text-neutral-900">{s.day_label ?? '—'}</span>
              <span class="text-neutral-400">
                {s.set_count} serii · {fmtDate(s.started_at)}
              </span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>
