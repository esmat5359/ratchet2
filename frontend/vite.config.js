import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the build work from any folder or static host (hash routes, relative assets).
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react()],
  define: { global: 'globalThis' },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
    rollupOptions: { output: { manualChunks: { three: ['three'], genlayer: ['genlayer-js'] } } },
  },
});
