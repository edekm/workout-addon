<script lang="ts">
  export let data: {
    plans: Array<{
      id: number;
      name: string;
      description: string | null;
      days_count: number;
      exercises_count: number;
      active_for: string[];
    }>;
    users: Array<{ slot: string; name: string }>;
  };

  function userName(slot: string): string {
    return data.users.find((u) => u.slot === slot)?.name ?? slot;
  }
</script>

<main class="mx-auto max-w-2xl p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="./" class="text-neutral-500 hover:text-neutral-900">←</a>
    <h1 class="flex-1 text-xl font-bold text-neutral-900">Plany</h1>
    <a
      href="plans/new"
      class="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      + Nowy plan
    </a>
  </header>

  {#if data.plans.length === 0}
    <p class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      Brak planów. Dodaj pierwszy plan.
    </p>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each data.plans as p}
        <li>
          <a
            href="plans/{p.id}"
            class="block rounded-xl bg-white p-4 shadow-sm hover:bg-neutral-50"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-neutral-900">{p.name}</p>
                {#if p.description}
                  <p class="mt-0.5 text-sm text-neutral-500">{p.description}</p>
                {/if}
                <p class="mt-1 text-xs text-neutral-400">
                  {p.days_count} dni · {p.exercises_count} ćwiczeń łącznie
                </p>
              </div>
              {#if p.active_for.length > 0}
                <div class="flex shrink-0 flex-col items-end gap-1">
                  {#each p.active_for as slot}
                    <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700">
                      aktywny: {userName(slot)}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>
