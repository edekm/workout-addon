import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: 'build' }),
    // HA Ingress: Origin nie zgadza sie z Host przez proxy, wylaczamy CSRF check.
    // Ochrona dostepu odbywa sie na poziomie HA (auth + Ingress token).
    csrf: { checkOrigin: false }
  }
};
