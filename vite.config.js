import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const STAMP = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: { __BUILD__: JSON.stringify(STAMP) },
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
