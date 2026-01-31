import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This ensures assets are loaded relatively, 
  // preventing 404 errors on GitHub Pages (which serves from a /repo-name/ subpath).
  base: './', 
});