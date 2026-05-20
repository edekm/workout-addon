<script lang="ts">
  import PlanForm from '$lib/components/PlanForm.svelte';
  import type { PlanInput } from '$lib/server/db/plans';
  import type { Location } from '$lib/server/db/library';

  export let data: {
    initial: PlanInput;
    choices: Array<{
      id: number;
      name_pl: string;
      category: string;
      locations: Location[];
    }>;
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
    <h1 class="text-xl font-bold text-neutral-900">Nowy plan</h1>
  </header>

  <PlanForm
    {initial}
    actionUrl=""
    submitLabel="Utwórz plan"
    errors={form?.errors ?? []}
    exerciseChoices={data.choices}
  />
</main>
