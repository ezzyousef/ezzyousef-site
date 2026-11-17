import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const STAMP = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: { __BUILD__: JSON.stringify(STAMP) },
  plugins: [react()],
  // The hashed bundle gets its own folder so it alone can be cached forever;
  // public/assets holds replaceable images under fixed names.
  build: { outDir: 'dist', assetsDir: '_app', sourcemap: false },
});
