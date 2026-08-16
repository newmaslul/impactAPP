import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base matches the GitHub Pages project URL: https://<user>.github.io/impactAPP/
export default defineConfig({
  plugins: [react()],
  base: '/impactAPP/',
});
