<script lang="ts">
  import PlanForm from '$lib/components/PlanForm.svelte';
  import type { PlanInput } from '$lib/server/db/plans';
  import type { Location } from '$lib/server/db/library';

  export let data: {
    planId: number;
    initial: PlanInput;
    choices: Array<{
      id: number;
      name_pl: string;
      category: string;
      locations: Location[];
    }>;
    activeFor: Array<{ slot: string; name: string }>;
    users: Array<{ id: number; slot: string; name: string; active_plan_id: number | null }>;
  };
  export let form: { errors?: string[]; payload?: string } | null;

  let initial: PlanInput = data.initial;
  $: if (form?.payload) {
    try {
      initial = JSON.parse(form.payload);
    } catch {}
  }
</script>

<main class="mx-auto max-w-2xl p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../plans" class="text-neutral-500 hover:text-neutral-900">←</a>
    <h1 class="flex-1 text-xl font-bold text-neutral-900">Edycja planu</h1>
  </header>

  <section class="mb-4 rounded-xl bg-white p-4 shadow-sm">
    <p class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Aktywuj dla użytkownika</p>
    <div class="flex flex-wrap gap-2">
      {#each data.users as u}
        {@const isActive = u.active_plan_id === data.planId}
        {#if isActive}
          <span class="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
            ✓ {u.name}
          </span>
        {:else}
          <form method="POST" action="?/setActive" class="contents">
            <input type="hidden" name="slot" value={u.slot} />
            <button
              type="submit"
              class="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
            >
              Aktywuj dla: {u.name}
            </button>
          </form>
        {/if}
      {/each}
    </div>
  </section>

  <PlanForm
    {initial}
    actionUrl="?/update"
    submitLabel="Zapisz zmiany"
    errors={form?.errors ?? []}
    exerciseChoices={data.choices}
  />

  <div class="mt-6 rounded-xl bg-neutral-50 p-4">
    <p class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Operacje</p>
    <div class="flex flex-wrap gap-2">
      <form method="POST" action="?/duplicate" class="contents">
        <button
          type="submit"
          class="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
        >
          Duplikuj
        </button>
      </form>
      <form
        method="POST"
        action="?/delete"
        class="contents"
        on:submit={(e) => {
          if (
            !confirm(
              'Usunąć plan? Historia zalogowanych sesji zostanie, ale plan zniknie i userzy go używający stracą aktywny plan.'
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          class="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Usuń plan
        </button>
      </form>
    </div>
  </div>
</main>
