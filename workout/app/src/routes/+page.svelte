<script lang="ts">
  const user1 = (typeof process !== 'undefined' && process.env?.USER1_NAME) || 'M';
  const user2 = (typeof process !== 'undefined' && process.env?.USER2_NAME) || 'Ona';
</script>

<main>
  <h1>Workout</h1>
  <p>Add-on uruchomiony.</p>
  <p>Profile: <strong>{user1}</strong>, <strong>{user2}</strong></p>
  <p><a href="/api/health">/api/health</a></p>
</main>

<style>
  main {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 480px;
    margin: 0 auto;
    padding: 2rem 1rem;
    color: #111;
  }
  h1 { margin-top: 0; }
  a { color: #0066cc; }
</style>
