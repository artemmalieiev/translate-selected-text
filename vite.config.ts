import { defineConfig } from 'vite';

// Content scripts can't be ES modules, so the entry is bundled into a single IIFE file.
// Everything in public/ (manifest.json) is copied into dist/ unchanged.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: 'src/content/index.ts',
      formats: ['iife'],
      name: 'TranslateSelectedText',
      fileName: () => 'content.js',
    },
  },
});
