import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync } from 'node:fs';

// Two build targets share this config:
// - The default (`npm run build`) is the GitHub Pages site — base must
//   match the project URL: https://<user>.github.io/impactAPP/
// - The Capacitor native shell (`npm run build:capacitor`, sets
//   CAP_BUILD=1) serves the app from its own local root, not a subpath,
//   and outputs to a separate dist-capacitor/ dir so it never collides
//   with the GitHub Pages dist/ that `npm run deploy` publishes.
const isCapacitorBuild = process.env.CAP_BUILD === '1';

// One version id per build, baked into the bundle (via `define` below)
// and also written out as a small, unhashed version.json — see
// src/hooks/useAppUpdateCheck.js for why: GitHub Pages gives us no
// control over HTTP cache-control headers, so index.html itself (unlike
// the hashed JS/CSS it references) can end up served stale by a browser
// or an "Add to Home Screen" PWA shell long after a new build is live.
const APP_VERSION = String(Date.now());

function versionFilePlugin() {
  return {
    name: 'write-version-file',
    writeBundle(options) {
      writeFileSync(`${options.dir}/version.json`, JSON.stringify({ version: APP_VERSION }));
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFilePlugin()],
  base: isCapacitorBuild ? '/' : '/impactAPP/',
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    outDir: isCapacitorBuild ? 'dist-capacitor' : 'dist',
  },
});
