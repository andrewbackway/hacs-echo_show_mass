import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['iife'],
      fileName: () => 'music-assistant-card.js',
      name: 'MusicAssistantCard',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
  },
});
