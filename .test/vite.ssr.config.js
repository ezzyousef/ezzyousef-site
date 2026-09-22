import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: { ssr: '.test/render3.jsx', outDir: '.test/out', emptyOutDir: true, target: 'node22' },
});
