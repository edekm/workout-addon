<script lang="ts">
  export let data: { users: Array<{ slot: string; name: string }> };
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col p-4">
  <header class="pt-8 pb-12 text-center">
    <h1 class="text-3xl font-bold text-neutral-900">Workout</h1>
    <p class="mt-1 text-sm text-neutral-500">Kto dziś trenuje?</p>
  </header>

  <div class="flex flex-col gap-3">
    {#each data.users as u}
      <a
        href="u/{u.slot}"
        class="block rounded-2xl bg-white px-6 py-8 text-center shadow-sm transition hover:shadow-md active:scale-[0.98]"
      >
        <div class="text-2xl font-bold text-neutral-900">{u.name}</div>
        <div class="mt-1 text-xs uppercase tracking-wider text-neutral-400">{u.slot}</div>
      </a>
    {/each}
  </div>

  <div class="mt-8 flex flex-col gap-2">
    <a
      href="library"
      class="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm hover:bg-neutral-50"
    >
      <span class="font-medium text-neutral-900">Biblioteka ćwiczeń</span>
      <span class="text-neutral-400">→</span>
    </a>
    <a
      href="plans"
      class="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm hover:bg-neutral-50"
    >
      <span class="font-medium text-neutral-900">Plany treningowe</span>
      <span class="text-neutral-400">→</span>
    </a>
  </div>

  <footer class="mt-auto pt-8 pb-4 text-center">
    <a href="api/health" class="text-xs text-neutral-400 underline">/api/health</a>
  </footer>
</main>
