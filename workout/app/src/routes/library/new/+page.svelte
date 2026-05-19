<script lang="ts">
  import ExerciseForm from '$lib/components/ExerciseForm.svelte';
  import type { ExerciseInput } from '$lib/server/db/library';

  export let data: { initial: ExerciseInput };
  export let form: { errors?: string[]; payload?: string } | null;

  // Jeśli walidacja po stronie serwera padła, odbieramy z form.payload świeży stan
  let initial: ExerciseInput = data.initial;
  $: if (form?.payload) {
    try {
      initial = JSON.parse(form.payload);
    } catch {}
  }
</script>

<main class="mx-auto max-w-2xl p-4">
  <header class="flex items-center gap-3 pt-2 pb-4">
    <a href="../library" class="text-neutral-500 hover:text-neutral-900">←</a>
    <h1 class="text-xl font-bold text-neutral-900">Nowe ćwiczenie</h1>
  </header>

  <ExerciseForm
    {initial}
    actionUrl=""
    submitLabel="Dodaj"
    slugLocked={false}
    errors={form?.errors ?? []}
  />
</main>
