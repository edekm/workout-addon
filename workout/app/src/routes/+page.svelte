<script lang="ts">
  export let data: {
    users: Array<{ slot: string; name: string }>;
    stats: {
      exercises: number;
      progressions: number;
      users: number;
      plans: number;
      sessions: number;
      sets: number;
      db_path: string;
    };
    exercisesByCategory: Array<{ category: string; n: number }>;
  };
</script>

<main class="mx-auto max-w-md p-4 text-neutral-900">
  <h1 class="text-2xl font-bold mb-1">Workout</h1>
  <p class="text-sm text-neutral-500 mb-6">Add-on uruchomiony.</p>

  <section class="mb-6">
    <h2 class="text-xs uppercase tracking-wider text-neutral-500 mb-2">Profile</h2>
    <ul class="space-y-1">
      {#each data.users as u}
        <li class="flex justify-between rounded bg-neutral-100 px-3 py-2">
          <span class="font-medium">{u.name}</span>
          <span class="text-xs text-neutral-500 self-center">{u.slot}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section class="mb-6">
    <h2 class="text-xs uppercase tracking-wider text-neutral-500 mb-2">Baza</h2>
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded bg-neutral-100 p-2">
        <div class="text-lg font-bold">{data.stats.exercises}</div>
        <div class="text-xs text-neutral-500">ćwiczeń</div>
      </div>
      <div class="rounded bg-neutral-100 p-2">
        <div class="text-lg font-bold">{data.stats.progressions}</div>
        <div class="text-xs text-neutral-500">progresji</div>
      </div>
      <div class="rounded bg-neutral-100 p-2">
        <div class="text-lg font-bold">{data.stats.sessions}</div>
        <div class="text-xs text-neutral-500">sesji</div>
      </div>
    </div>
  </section>

  <section class="mb-6">
    <h2 class="text-xs uppercase tracking-wider text-neutral-500 mb-2">Kategorie</h2>
    <ul class="space-y-1">
      {#each data.exercisesByCategory as c}
        <li class="flex justify-between rounded bg-neutral-100 px-3 py-2 text-sm">
          <span>{c.category}</span>
          <span class="font-medium">{c.n}</span>
        </li>
      {/each}
    </ul>
  </section>

  <p class="text-xs text-neutral-400">
    <a class="underline" href="api/health">/api/health</a>
    &middot;
    DB: <code class="text-[10px]">{data.stats.db_path}</code>
  </p>
</main>
