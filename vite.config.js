import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Two build targets share this config:
// - The default (`npm run build`) is the GitHub Pages site — base must
//   match the project URL: https://<user>.github.io/impactAPP/
// - The Capacitor native shell (`npm run build:capacitor`, sets
//   CAP_BUILD=1) serves the app from its own local root, not a subpath,
//   and outputs to a separate dist-capacitor/ dir so it never collides
//   with the GitHub Pages dist/ that `npm run deploy` publishes.
const isCapacitorBuild = process.env.CAP_BUILD === '1';

export default defineConfig({
  plugins: [react()],
  base: isCapacitorBuild ? '/' : '/impactAPP/',
  build: {
    outDir: isCapacitorBuild ? 'dist-capacitor' : 'dist',
  },
});
