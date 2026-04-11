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
  server: {
    proxy: {
      '/api/liquipedia': {
        target: 'https://liquipedia.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/liquipedia/, '/counterstrike/api.php'),
        headers: {
          'User-Agent': 'TacbookCS2/1.0 (tyronetannerfxtgll@gmail.com)'
        }
      }
    }
  },
  build: {
    sourcemap: false,
  },
  css: {
    devSourcemap: false,
  }
});