import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Absolute base so every page (/, /about/, /playlist/) resolves media and links the same way.
  // GitHub Pages serves from /<repo>/; the deploy workflow sets BASE_PATH accordingly.
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
  build: {
    rollupOptions: {
      // Multi-page: real URLs (/about/, /playlist/) that work on GitHub Pages without a router.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        about: resolve(import.meta.dirname, 'about/index.html'),
        playlist: resolve(import.meta.dirname, 'playlist/index.html'),
        quiz: resolve(import.meta.dirname, 'quiz/index.html'),
      },
    },
  },
});
