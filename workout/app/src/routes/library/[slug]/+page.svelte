<script lang="ts">
  import ExerciseForm from '$lib/components/ExerciseForm.svelte';
  import type { ExerciseInput } from '$lib/server/db/library';

  export let data: {
    exerciseId: number;
    isArchived: boolean;
    initial: ExerciseInput;
  };
  export let form: { errors?: string[]; payload?: string } | null;

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
    <h1 class="flex-1 text-xl font-bold text-neutral-900">
      Edycja ćwiczenia
      {#if data.isArchived}
        <span class="ml-1 text-sm font-normal text-neutral-400">(archiwalne)</span>
      {/if}
    </h1>
  </header>

  <ExerciseForm
    {initial}
    actionUrl="?/update"
    submitLabel="Zapisz zmiany"
    slugLocked={true}
    errors={form?.errors ?? []}
  />

  <div class="mt-6 rounded-xl bg-neutral-50 p-4">
    <p class="mb-2 text-xs uppercase tracking-wider text-neutral-400">Strefa niebezpieczna</p>
    {#if data.isArchived}
      <form
        method="POST"
        action="?/unarchive"
        on:submit={(e) => {
          if (!confirm('Przywrócić ćwiczenie z archiwum?')) e.preventDefault();
        }}
      >
        <button
          type="submit"
          class="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
        >
          Przywróć z archiwum
        </button>
      </form>
    {:else}
      <form
        method="POST"
        action="?/archive"
        on:submit={(e) => {
          if (!confirm('Zarchiwizować ćwiczenie? Zniknie z listy i edytora planu, ale stara historia zostanie.')) {
            e.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          class="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Archiwizuj
        </button>
      </form>
    {/if}
  </div>
</main>
