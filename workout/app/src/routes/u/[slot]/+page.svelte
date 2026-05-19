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
    }>;
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
      <h2 class="text-xs uppercase tracking-wider text-neutral-400">Aktywny plan</h2>
      <p class="mt-1 font-semibold text-neutral-900">{data.plan.name}</p>
      {#if data.plan.description}
        <p class="mt-1 text-sm text-neutral-500">{data.plan.description}</p>
      {/if}
    </section>

    <section class="mb-6">
      <h2 class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Dni</h2>
      <div class="flex flex-col gap-2">
        {#each data.days as day}
          <a
            href="{data.user.slot}/day/{encodeURIComponent(day.label)}"
            class="flex items-center justify-between rounded-xl bg-white px-4 py-4 shadow-sm transition hover:shadow-md active:scale-[0.99]"
          >
            <span class="font-medium text-neutral-900">{day.label}</span>
            <span class="text-sm text-neutral-400">{day.exercise_count} ćw.</span>
          </a>
        {/each}
      </div>
    </section>
  {:else}
    <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      Brak aktywnego planu. Plany seedują się automatycznie przy starcie - sprawdź logi add-ona.
    </p>
  {/if}

  <section>
    <h2 class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Ostatnie sesje</h2>
    {#if data.recentSessions.length === 0}
      <p class="text-sm text-neutral-400">Brak historii.</p>
    {:else}
      <ul class="flex flex-col gap-1">
        {#each data.recentSessions as s}
          <li class="flex justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
            <span>{s.day_label ?? '—'}</span>
            <span class="text-neutral-400">{fmtDate(s.started_at)}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>
