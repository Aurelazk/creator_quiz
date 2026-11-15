import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  index: 'index.html',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    include: ['three'],
  },
});
