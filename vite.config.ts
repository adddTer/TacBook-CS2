import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  // IMPORTANT: This ensures assets are loaded relatively, 
  // preventing 404 errors on GitHub Pages (which serves from a /repo-name/ subpath).
  base: './', 
  build: {
    sourcemap: false,
  },
  css: {
    devSourcemap: false,
  }
});